import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Tabs, 
  Table, 
  Button, 
  Card, 
  Space, 
  Typography, 
  Divider,
  Spin,
  Empty,
  notification,
  Row,
  Col,
  Input,
  Form,
  message
} from 'antd';
import { 
  TableOutlined, 
  CodeOutlined, 
  MessageOutlined,
  DatabaseOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ExportOutlined,
  KeyOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { Editor } from '@monaco-editor/react';
import DatabaseDetails from '../components/DatabaseDetails';
import TableStructure from '../components/TableStructure';
import AIQueryPanel from '../components/AIQueryPanel';
import TableIndexes from '../components/TableIndexes';
import TableForeignKeys from '../components/TableForeignKeys';
import TableTriggers from '../components/TableTriggers';
import TableChecks from '../components/TableChecks';
import TableComment from '../components/TableComment';
import TableSQLPreview from '../components/TableSQLPreview';
import TableDataOperations from '../components/TableDataOperations';
import EditableCell from '../components/EditableCell';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const DatabasePage = ({ activeConnection }) => {
  const { dbName } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [tableStructure, setTableStructure] = useState({ columns: [], data: [] });
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResults, setQueryResults] = useState([]);
  const [queryColumns, setQueryColumns] = useState([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const [selectedTableName, setSelectedTableName] = useState(null);
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTabKey, setActiveTabKey] = useState('overview');
  const [selectedRows, setSelectedRows] = useState([]);
  const [editingKey, setEditingKey] = useState('');
  const [form] = Form.useForm();

  // When selectedTableName changes or on initial load
  useEffect(() => {
    if (!activeConnection || !dbName || !selectedTableName) return;

    loadTableData();
    loadTableStructure();
    setSqlQuery(`SELECT * FROM ${selectedTableName} LIMIT 100;`);
  }, [activeConnection, dbName, selectedTableName]);

  const loadTableData = async () => {
    if (!activeConnection || !dbName || !selectedTableName) return;
    
    setLoading(true);
    
    try {
      // 先获取列信息以显示类型
      const columnsResponse = await axios.get(`/api/database/${dbName}/tables/${selectedTableName}/columns`, {
        params: { 
          connectionId: activeConnection.id,
          _t: new Date().getTime() // 防止缓存
        }
      });
      
      const columnsInfo = columnsResponse.data.reduce((acc, col) => {
        acc[col.name] = { 
          type: col.type, 
          fullType: `${col.type}${col.length ? `(${col.length})` : ''}`,
          nullable: col.nullable
        };
        return acc;
      }, {});

      const response = await axios.get(`/api/database/${dbName}/tables/${selectedTableName}/data`, {
        params: { 
          connectionId: activeConnection.id,
          limit: 100,
          offset: 0
        }
      });
      
      if (response.data && response.data.rows) {
        setTableData(response.data.rows);
        
        if (response.data.fields && response.data.fields.length > 0) {
          const columns = response.data.fields.map(field => {
            const fieldInfo = columnsInfo[field.name] || {};
            
            return {
              title: (
                <div>
                  <div style={{ fontWeight: 'bold' }}>{field.name}</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    {fieldInfo.fullType || field.type}
                  </div>
                </div>
              ),
              dataIndex: field.name,
              key: field.name,
              width: 150,
              ellipsis: true,
              editable: true,
              render: (text, record) => {
                const editable = isEditing(record);
                return editable ? (
                  <Form.Item
                    name={field.name}
                    style={{ margin: 0 }}
                    rules={[
                      {
                        required: !fieldInfo.nullable && !fieldInfo.extra?.includes('auto_increment'),
                        message: `请输入${field.name}`,
                      },
                    ]}
                  >
                    <Input size="small" disabled={fieldInfo.extra?.includes('auto_increment')} />
                  </Form.Item>
                ) : (
                  <div
                    className="editable-cell-value-wrap"
                    style={{ paddingRight: 24, cursor: 'pointer' }}
                    onClick={() => {
                      if (!isEditing(record)) {
                        edit(record);
                      }
                    }}
                  >
                    {text === null ? (
                      <span className="cell-null">NULL</span>
                    ) : typeof text === 'object' ? (
                      <span className="cell-string">{JSON.stringify(text)}</span>
                    ) : typeof text === 'number' ? (
                      <span className="cell-number">{text}</span>
                    ) : typeof text === 'string' && (text.match(/^\d{4}-\d{2}-\d{2}/) || text.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)) ? (
                      <span className="cell-datetime">{text}</span>
                    ) : (
                      <span className="cell-string">{text}</span>
                    )}
                  </div>
                )
              }
            };
          });
          
          // 添加操作列
          const actionColumn = {
            title: '操作',
            dataIndex: 'operation',
            fixed: 'right',
            width: 120,
            render: (_, record) => {
              const editable = isEditing(record);
              return editable ? (
                <Space>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => save(record)}
                  >
                    保存
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    onClick={cancel}
                  >
                    取消
                  </Button>
                </Space>
              ) : null;
            }
          };
          
          columns.push(actionColumn);
          
          setTableColumns(columns);
        }
      }
    } catch (error) {
      console.error('Load table data error:', error);
      notification.error({
        message: '加载表数据失败',
        description: error.response?.data?.message || error.message
      });
      setTableData([]);
      setTableColumns([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTableStructure = async () => {
    if (!activeConnection || !dbName || !selectedTableName) return;
    
    try {
      // 清除旧数据，以防刷新时显示不正确
      setTableStructure({ columns: [], data: [] });
      
      // 添加时间戳防止缓存
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/database/${dbName}/tables/${selectedTableName}/columns`, {
        params: { 
          connectionId: activeConnection.id,
          _t: timestamp // 添加时间戳防止缓存
        }
      });
      
      if (response.data) {
        const structureColumns = [
          { title: '字段名', dataIndex: 'name', width: 200 },
          { title: '类型', dataIndex: 'type', width: 120 },
          { title: '长度', dataIndex: 'length', width: 80 },
          { title: '允许NULL', dataIndex: 'nullable', width: 100,
            render: (nullable) => nullable ? '是' : '否' },
          { title: '键', dataIndex: 'key', width: 80 },
          { title: '默认值', dataIndex: 'defaultValue', width: 120,
            render: (value) => value === null ? <span style={{ color: '#999' }}>NULL</span> : value },
          { title: '注释', dataIndex: 'comment', width: 200 }
        ];
        setTableStructure({
          columns: structureColumns,
          data: response.data
        });
        
        // 刷新数据表数据
        loadTableData();
      }
    } catch (error) {
      console.error('Load table structure error:', error);
      notification.error({
        message: '加载表结构失败',
        description: error.response?.data?.message || error.message
      });
      setTableStructure({ columns: [], data: [] });
    }
  };

  const executeQuery = async () => {
    if (!activeConnection || !dbName || !sqlQuery.trim()) return;
    
    setQueryLoading(true);
    
    try {
      const response = await axios.post(`/api/database/${dbName}/query`, {
        connectionId: activeConnection.id,
        query: sqlQuery
      });
      
      if (response.data) {
        if (response.data.rows) {
          setQueryResults(response.data.rows);
          
          // Create columns for the query results table
          if (response.data.fields && response.data.fields.length > 0) {
            const columns = response.data.fields.map(field => ({
              title: field.name,
              dataIndex: field.name,
              key: field.name,
              width: 150,
              ellipsis: true,
              render: (text) => {
                if (text === null) return <span className="cell-null">NULL</span>;
                if (typeof text === 'object') return <span className="cell-string">{JSON.stringify(text)}</span>;
                if (typeof text === 'number') return <span className="cell-number">{text}</span>;
                // 检测日期格式
                if (typeof text === 'string' && (text.match(/^\d{4}-\d{2}-\d{2}/) || text.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/))) {
                  return <span className="cell-datetime">{text}</span>;
                }
                return <span className="cell-string">{text}</span>;
              }
            }));
            
            setQueryColumns(columns);
          }
        } else {
          setQueryResults([]);
          setQueryColumns([]);
          
          // Show success message for non-SELECT queries
          notification.success({
            message: '查询执行成功',
            description: response.data.message || '查询已成功执行'
          });
        }
      }
    } catch (error) {
      notification.error({
        message: '执行查询失败',
        description: error.message
      });
    } finally {
      setQueryLoading(false);
    }
  };

  const handleChat = () => {
    // 检查AI对话标签页是否已经打开
    const isAIChatTabOpen = openTabs.some(tab => tab.key === 'ai-chat');
    
    if (!isAIChatTabOpen) {
      // 添加AI对话标签页
      setOpenTabs([...openTabs, {
        key: 'ai-chat',
        title: 'AI 助手',
        closable: true
      }]);
    }
    
    // 设置AI对话为活动标签
    setActiveTabKey('ai-chat');
  };

  const handleTableSelect = (tableName) => {
    // 检查表是否已经在打开的标签页中
    const isTabAlreadyOpen = openTabs.some(tab => tab.key === `tab-${tableName}`);
    
    if (!isTabAlreadyOpen) {
      // 添加新标签页
      setOpenTabs([...openTabs, {
        key: `tab-${tableName}`,
        title: tableName,
        content: tableName,
        closable: true
      }]);
    }
    
    // 设置该表为活动标签
    setActiveTabKey(`tab-${tableName}`);
    setSelectedTableName(tableName);
  };

  const handleTabChange = (activeKey) => {
    setActiveTabKey(activeKey);
    
    if (activeKey === 'overview') {
      setSelectedTableName(null);
    } else {
      // 从标签键中提取表名
      const tableName = activeKey.replace('tab-', '');
      setSelectedTableName(tableName);
    }
  };

  const handleTabClose = (targetKey) => {
    let newActiveKey = activeTabKey;
    let lastIndex = -1;
    
    openTabs.forEach((tab, i) => {
      if (tab.key === targetKey) {
        lastIndex = i - 1;
      }
    });
    
    const newTabs = openTabs.filter(tab => tab.key !== targetKey);
    
    if (newTabs.length && newActiveKey === targetKey) {
      if (lastIndex >= 0) {
        newActiveKey = newTabs[lastIndex].key;
      } else {
        newActiveKey = newTabs[0].key;
      }
    } else if (newTabs.length === 0) {
      newActiveKey = 'overview';
    }
    
    setOpenTabs(newTabs);
    setActiveTabKey(newActiveKey);
    
    if (newActiveKey === 'overview') {
      setSelectedTableName(null);
    } else {
      const tableName = newActiveKey.replace('tab-', '');
      setSelectedTableName(tableName);
    }
  };

  const isEditing = (record) => {
    const primaryKey = tableStructure.data?.find(col => col.key === 'PRI')?.name;
    if (primaryKey && record[primaryKey]) {
      return record[primaryKey] === editingKey;
    }
    return Object.values(record).join('_') === editingKey;
  };

  const edit = (record) => {
    form.setFieldsValue({ ...record });
    const primaryKey = tableStructure.data?.find(col => col.key === 'PRI')?.name;
    if (primaryKey && record[primaryKey]) {
      setEditingKey(record[primaryKey]);
    } else {
      setEditingKey(Object.values(record).join('_'));
    }
  };

  const cancel = () => {
    if (editingKey === 'new') {
      // 如果是取消新增，需要移除新添加的行
      setTableData(tableData.filter(item => !item._isNew));
    }
    setEditingKey('');
    form.resetFields();
  };

  const save = async (record) => {
    try {
      const row = await form.validateFields();
      const primaryKey = tableStructure.data?.find(col => col.key === 'PRI')?.name;
      
      if (editingKey === 'new') {
        // 新增数据
        await axios.post(`/api/database/${dbName}/tables/${selectedTableName}/data`, {
          data: row,
          connectionId: activeConnection?.id
        });
      } else {
        // 更新数据
        const where = {};
        if (primaryKey) {
          where[primaryKey] = record[primaryKey];
        } else {
          // 如果没有主键，使用所有字段作为条件
          Object.keys(record).forEach(key => {
            where[key] = record[key];
          });
        }

        await axios.put(`/api/database/${dbName}/tables/${selectedTableName}/data`, {
          data: row,
          where,
          connectionId: activeConnection?.id
        });
      }

      setEditingKey('');
      loadTableData();
      message.success(editingKey === 'new' ? '数据添加成功' : '数据更新成功');
    } catch (error) {
      console.error('Save error:', error);
      notification.error({
        message: editingKey === 'new' ? '添加失败' : '更新失败',
        description: error.response?.data?.message || error.message
      });
    }
  };

  const addNewRow = () => {
    // 如果已经有正在编辑的行，先取消编辑
    if (editingKey !== '') {
      setEditingKey('');
    }

    const newRow = {
      _isNew: true  // 添加标记，用于区分新行
    };
    tableStructure.data.forEach(col => {
      newRow[col.name] = null;
    });
    setTableData([newRow, ...tableData]);
    form.setFieldsValue(newRow);
    setEditingKey('new');
  };

  const mergedColumns = tableColumns.map(col => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record) => ({
        record,
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });

  const handleDelete = async () => {
    if (!selectedRows || selectedRows.length === 0) {
      message.warning('请至少选择一条记录');
      return;
    }

    try {
      const primaryKey = tableStructure.data?.find(col => col.key === 'PRI')?.name;
      
      // 批量删除所选记录
      for (const record of selectedRows) {
        const where = {};
        if (primaryKey) {
          where[primaryKey] = record[primaryKey];
        } else {
          // 如果没有主键，使用所有字段作为条件
          Object.keys(record).forEach(key => {
            where[key] = record[key];
          });
        }

        await axios.delete(`/api/database/${dbName}/tables/${selectedTableName}/data`, {
          data: { 
            where,
            connectionId: activeConnection?.id 
          }
        });
      }

      message.success(`成功删除${selectedRows.length}条记录`);
      setSelectedRows([]);
      loadTableData();
    } catch (error) {
      console.error('Delete error:', error);
      notification.error({
        message: '删除失败',
        description: error.response?.data?.message || error.message
      });
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`/api/database/${dbName}/tables/${selectedTableName}/export`, {
        params: { connectionId: activeConnection?.id }
      });

      const { data, columns: exportColumns, filename } = response.data;

      // 准备Excel数据
      const header = exportColumns.map(col => ({
        v: col.comment || col.name,
        t: 's'
      }));

      const rows = data.map(row => 
        exportColumns.map(col => ({
          v: row[col.name],
          t: typeof row[col.name] === 'number' ? 'n' : 's'
        }))
      );

      // 创建工作表
      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

      // 创建工作簿
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, selectedTableName);

      // 导出文件
      XLSX.writeFile(wb, filename);
      message.success('数据导出成功');
    } catch (error) {
      console.error('Export error:', error);
      notification.error({
        message: '导出失败',
        description: error.response?.data?.message || error.message
      });
    }
  };

  if (!activeConnection) {
    return (
      <Card>
        <Empty
          description="未连接到数据库"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={() => navigate('/connection')}>
            连接数据库
          </Button>
        </Empty>
      </Card>
    );
  }

  // 构建标签页
  const tabItems = [
    {
      key: 'overview',
      label: '数据库概览',
      closable: false,
      children: (
        <Card bodyStyle={{ padding: '12px', height: 'calc(100vh - 210px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty description="请选择一个表查看详细信息" />
        </Card>
      )
    },
    // AI对话标签页
    openTabs.some(tab => tab.key === 'ai-chat') && {
      key: 'ai-chat',
      label: 'AI 助手',
      closable: true,
      children: (
        <Card bodyStyle={{ padding: '12px', height: 'calc(100vh - 210px)', overflow: 'auto' }} bordered={true}>
          <AIQueryPanel
            connectionId={activeConnection?.id}
            database={dbName}
          />
        </Card>
      )
    },
    ...openTabs.filter(tab => tab.key !== 'ai-chat').map(tab => ({
      key: tab.key,
      label: tab.title,
      closable: tab.closable,
      children: (
        <Card bodyStyle={{ padding: '12px', height: 'calc(100vh - 210px)', overflow: 'auto' }} bordered={true}>
          <Tabs defaultActiveKey="structure" type="card">
            <TabPane
              tab={
                <span>
                  <TableOutlined />
                  表结构
                </span>
              }
              key="structure"
            >
              <div className="table-structure">
                <div className="table-tabs">
                  <Tabs defaultActiveKey="fields" size="small" type="card">
                    <TabPane tab="字段" key="fields">
                      <Table
                        columns={[
                          { 
                            title: '字段名', 
                            dataIndex: 'name', 
                            width: 200,
                            render: (text, record) => (
                              <Space>
                                {record.key === 'PRI' && <KeyOutlined style={{ color: '#faad14' }} />}
                                {text}
                              </Space>
                            )
                          },
                          { title: '类型', dataIndex: 'type', width: 120 },
                          { 
                            title: '长度', 
                            dataIndex: 'length', 
                            width: 80,
                            render: text => text || '-'
                          },
                          { 
                            title: '允许NULL', 
                            dataIndex: 'nullable', 
                            width: 100,
                            render: (nullable) => nullable ? '是' : '否' 
                          },
                          { 
                            title: '键', 
                            dataIndex: 'key', 
                            width: 80,
                            render: key => {
                              switch(key) {
                                case 'PRI': return 'PRI';
                                case 'UNI': return 'UNI';
                                case 'MUL': return 'MUL';
                                default: return '';
                              }
                            }
                          },
                          { 
                            title: '默认值', 
                            dataIndex: 'defaultValue', 
                            width: 120,
                            render: (value) => value === null ? <span style={{ color: '#999' }}>NULL</span> : value 
                          },
                          { title: '注释', dataIndex: 'comment', width: 200 }
                        ]}
                        dataSource={tableStructure.data}
                        size="small"
                        scroll={{ x: 'max-content' }}
                        pagination={false}
                        rowKey="name"
                        bordered
                        className="navicat-table structure-table"
                      />
                    </TabPane>
                    <TabPane tab="索引" key="indexes">
                      <TableIndexes
                        connectionId={activeConnection?.id}
                        database={dbName}
                        table={selectedTableName}
                      />
                    </TabPane>
                    <TabPane tab="外键" key="foreignKeys">
                      <TableForeignKeys
                        connectionId={activeConnection?.id}
                        database={dbName}
                        table={selectedTableName}
                      />
                    </TabPane>
                    <TabPane tab="触发器" key="triggers">
                      <TableTriggers
                        connectionId={activeConnection?.id}
                        database={dbName}
                        table={selectedTableName}
                      />
                    </TabPane>
                    <TabPane tab="检查" key="checks">
                      <TableChecks
                        connectionId={activeConnection?.id}
                        database={dbName}
                        table={selectedTableName}
                      />
                    </TabPane>
                    <TabPane tab="注释" key="comments">
                      <TableComment
                        connectionId={activeConnection?.id}
                        database={dbName}
                        table={selectedTableName}
                      />
                    </TabPane>
                    <TabPane tab="SQL 预览" key="sqlPreview">
                      <TableSQLPreview
                        connectionId={activeConnection?.id}
                        database={dbName}
                        table={selectedTableName}
                      />
                    </TabPane>
                  </Tabs>
                </div>
              </div>
            </TabPane>
            <TabPane
              tab={
                <span>
                  <TableOutlined />
                  数据
                </span>
              }
              key="data"
            >
              <div style={{ padding: '12px 0', overflowX: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div className="table-toolbar">
                    <Space>
                      <Button 
                        size="small" 
                        icon={<PlusOutlined />} 
                        onClick={addNewRow}
                        type="text"
                      >
                        新建
                      </Button>
                      <Button 
                        size="small" 
                        icon={<DeleteOutlined />} 
                        onClick={() => {
                          if (selectedRows?.length > 0) {
                            handleDelete();
                          } else {
                            message.warning('请选择要删除的记录');
                          }
                        }}
                        type="text"
                      >
                        删除
                      </Button>
                      <Button 
                        size="small" 
                        icon={<ExportOutlined />} 
                        onClick={handleExport}
                        type="text"
                      >
                        导出
                      </Button>
                    </Space>
                  </div>
                  <div>
                    <Input.Search placeholder="搜索..." size="small" style={{ width: 200 }} />
                  </div>
                </div>
                <Form form={form} component={false}>
                  <Table
                    components={{
                      body: {
                        cell: EditableCell,
                      },
                    }}
                    columns={mergedColumns}
                    dataSource={tableData}
                    loading={loading}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    rowKey={(record) => {
                      const primaryKey = tableStructure.data?.find(col => col.key === 'PRI')?.name;
                      if (primaryKey && record[primaryKey]) {
                        return record[primaryKey];
                      }
                      return Object.values(record).join('_');
                    }}
                    rowSelection={{
                      type: 'checkbox',
                      onChange: (_, selectedRows) => setSelectedRows(selectedRows),
                      selectedRowKeys: selectedRows?.map(row => {
                        const primaryKey = tableStructure.data?.find(col => col.key === 'PRI')?.name;
                        if (primaryKey && row[primaryKey]) {
                          return row[primaryKey];
                        }
                        return Object.values(row).join('_');
                      })
                    }}
                    pagination={false}
                  />
                </Form>
              </div>
            </TabPane>
            <TabPane
              tab={
                <span>
                  <CodeOutlined />
                  SQL查询
                </span>
              }
              key="query"
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ border: '1px solid #d9d9d9', borderRadius: '2px' }}>
                  <Editor
                    height="200px"
                    language="sql"
                    theme="vs-light"
                    value={sqlQuery}
                    onChange={setSqlQuery}
                    options={{
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                    }}
                  />
                </div>
                <Button
                  type="primary"
                  onClick={executeQuery}
                  loading={queryLoading}
                >
                  执行查询
                </Button>
                {queryLoading ? (
                  <div style={{ textAlign: 'center', padding: '24px' }}>
                    <Spin />
                  </div>
                ) : (
                  queryColumns.length > 0 && (
                    <Table
                      columns={queryColumns}
                      dataSource={queryResults}
                      size="small"
                      scroll={{ x: 'max-content' }}
                      pagination={{ pageSize: 50 }}
                      rowKey={(record, index) => index}
                    />
                  )
                )}
              </Space>
            </TabPane>
            <TabPane
              tab={
                <span>
                  <MessageOutlined />
                  AI助手
                </span>
              }
              key="ai"
            >
              <AIQueryPanel
                connectionId={activeConnection?.id}
                database={dbName}
              />
            </TabPane>
          </Tabs>
        </Card>
      )
    }))
  ];

  return (
    <div style={{ padding: '24px', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <Card className="database-header" style={{ marginBottom: '12px' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Title level={4}>
            <DatabaseOutlined /> {dbName}
            {selectedTableName && <> / <TableOutlined /> {selectedTableName}</>}
          </Title>
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadTableData}
              disabled={!selectedTableName}
            >
              刷新
            </Button>
            <Button 
              type="primary" 
              icon={<MessageOutlined />} 
              onClick={handleChat}
            >
              AI 助手
            </Button>
          </Space>
        </Space>
      </Card>

      <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* 左侧数据库对象树 */}
        <div style={{ width: '250px', marginRight: '12px', overflow: 'auto' }} className="db-sidebar">
          <Card title="数据库对象" bodyStyle={{ padding: '8px', height: 'calc(100vh - 210px)', overflow: 'auto' }} bordered={true}>
            <DatabaseDetails
              connectionId={activeConnection?.id}
              database={dbName}
              onTableSelect={handleTableSelect}
              className="database-tree"
            />
          </Card>
        </div>
        
        {/* 右侧内容区域 */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Tabs
            type="editable-card"
            activeKey={activeTabKey}
            onChange={handleTabChange}
            onEdit={(targetKey, action) => {
              if (action === 'remove') {
                handleTabClose(targetKey);
              }
            }}
            items={tabItems}
            className="navicat-tabs"
            style={{ marginBottom: 0 }}
          />
        </div>
      </div>
    </div>
  );
};

export default DatabasePage; 