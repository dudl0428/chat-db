import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Form,
  Input,
  Button,
  Select,
  Switch,
  Space,
  Checkbox,
  Tabs,
  message,
  Tooltip,
  Popconfirm
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  KeyOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { TabPane } = Tabs;

const fieldTypes = [
  { name: 'varchar', hasLength: true, hasDecimals: false },
  { name: 'char', hasLength: true, hasDecimals: false },
  { name: 'text', hasLength: false, hasDecimals: false },
  { name: 'int', hasLength: true, hasDecimals: false },
  { name: 'bigint', hasLength: true, hasDecimals: false },
  { name: 'float', hasLength: true, hasDecimals: true },
  { name: 'double', hasLength: true, hasDecimals: true },
  { name: 'decimal', hasLength: true, hasDecimals: true },
  { name: 'datetime', hasLength: false, hasDecimals: false },
  { name: 'date', hasLength: false, hasDecimals: false },
  { name: 'time', hasLength: false, hasDecimals: false },
  { name: 'timestamp', hasLength: false, hasDecimals: false },
  { name: 'boolean', hasLength: false, hasDecimals: false },
  { name: 'enum', hasLength: false, hasDecimals: false, hasOptions: true },
  { name: 'set', hasLength: false, hasDecimals: false, hasOptions: true },
  { name: 'json', hasLength: false, hasDecimals: false },
  { name: 'blob', hasLength: false, hasDecimals: false },
  { name: 'longblob', hasLength: false, hasDecimals: false },
];

const TableDesigner = ({ visible, database, table, connectionId, onClose, onSave }) => {
  const [form] = Form.useForm();
  const [fields, setFields] = useState([]);
  const [originalFields, setOriginalFields] = useState([]);
  const [activeTab, setActiveTab] = useState('fields');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  // 加载表结构
  useEffect(() => {
    if (visible && database && table && connectionId) {
      loadTableStructure();
    }
  }, [visible, database, table, connectionId]);

  const loadTableStructure = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `/api/database/${database}/tables/${table}/columns`,
        { params: { connectionId } }
      );
      
      const formattedFields = response.data.map(field => ({
        name: field.name,
        type: field.type.toLowerCase(),
        length: field.length || '',
        decimals: '',
        notNull: !field.nullable,
        defaultValue: field.defaultValue,
        isPrimary: field.key === 'PRI',
        autoIncrement: field.extra.includes('auto_increment'),
        comment: field.comment || '',
        key: field.name,
        isNew: false,
      }));
      
      setFields(formattedFields);
      setOriginalFields(JSON.parse(JSON.stringify(formattedFields)));
    } catch (error) {
      message.error('加载表结构失败: ' + error.message);
      console.error('Error loading table structure:', error);
    } finally {
      setLoading(false);
    }
  };

  // 添加新字段
  const addField = () => {
    const newField = {
      name: '',
      type: 'varchar',
      length: '255',
      decimals: '',
      notNull: false,
      defaultValue: '',
      isPrimary: false,
      autoIncrement: false,
      comment: '',
      key: `new-field-${fields.length}`,
      isNew: true,
    };
    setFields([...fields, newField]);
  };

  // 删除字段
  const deleteField = (index) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);
  };

  // 更新字段
  const updateField = (index, key, value) => {
    const newFields = [...fields];
    newFields[index][key] = value;
    
    // 如果更新了类型，要相应更新长度和小数位
    if (key === 'type') {
      const fieldType = fieldTypes.find(type => type.name === value);
      if (!fieldType.hasLength) {
        newFields[index].length = '';
      } else if (newFields[index].length === '') {
        newFields[index].length = value === 'varchar' ? '255' : '11';
      }
      
      if (!fieldType.hasDecimals) {
        newFields[index].decimals = '';
      }
    }
    
    // 如果设置了自增，则必须为NOT NULL
    if (key === 'autoIncrement' && value) {
      newFields[index].notNull = true;
    }
    
    // 如果设置为主键，则必须为NOT NULL
    if (key === 'isPrimary' && value) {
      newFields[index].notNull = true;
    }
    
    setFields(newFields);
  };

  // 保存表结构
  const saveTableStructure = async () => {
    // 验证字段
    const missingNames = fields.some(field => !field.name.trim());
    if (missingNames) {
      message.error('字段名不能为空');
      return;
    }
    
    // 字段名重复检查
    const fieldNames = fields.map(field => field.name.trim());
    const hasDuplicates = fieldNames.some((name, index) => 
      fieldNames.indexOf(name) !== index
    );
    
    if (hasDuplicates) {
      message.error('存在重复的字段名');
      return;
    }
    
    setSaving(true);
    // 这里需要构建SQL语句来更改表结构
    try {
      // 创建ALTER TABLE SQL语句
      let sql = `ALTER TABLE \`${table}\` `;
      
      // 添加新字段
      const addedFields = fields.filter(field => field.isNew);
      // 修改的字段
      const modifiedFields = fields.filter(field => 
        !field.isNew && 
        JSON.stringify(field) !== JSON.stringify(
          originalFields.find(of => of.name === field.name)
        )
      );
      // 删除的字段
      const deletedFields = originalFields.filter(originalField => 
        !fields.some(field => field.name === originalField.name)
      );
      
      // 构建SQL片段
      const sqlParts = [];
      
      // 添加删除的字段
      deletedFields.forEach(field => {
        sqlParts.push(`DROP COLUMN \`${field.name}\``);
      });
      
      // 添加新字段
      addedFields.forEach(field => {
        sqlParts.push(
          `ADD COLUMN \`${field.name}\` ${getFieldDefinition(field)}`
        );
      });
      
      // 修改现有字段
      modifiedFields.forEach(field => {
        sqlParts.push(
          `MODIFY COLUMN \`${field.name}\` ${getFieldDefinition(field)}`
        );
      });
      
      // 如果没有变化，直接返回
      if (sqlParts.length === 0) {
        message.info('没有对表结构进行修改');
        setSaving(false);
        onClose();
        return;
      }
      
      // 拼接SQL
      sql += sqlParts.join(', ');
      
      // 执行SQL
      const response = await axios.post(`/api/database/${database}/query`, {
        connectionId,
        query: sql
      });
      
      message.success('表结构已更新，正在刷新数据...');
      
      // 延迟一点时间确保数据库操作已完成
      setTimeout(() => {
        // 通知父组件更新已保存
        onSave && onSave();
        onClose();
      }, 1000);
    } catch (error) {
      message.error('保存表结构失败: ' + error.message);
      console.error('Error saving table structure:', error);
    } finally {
      setSaving(false);
    }
  };
  
  // 获取字段定义的SQL片段
  const getFieldDefinition = (field) => {
    let definition = `${field.type}`;
    
    // 添加长度和小数位
    if (field.length) {
      if (field.decimals) {
        definition += `(${field.length},${field.decimals})`;
      } else {
        definition += `(${field.length})`;
      }
    }
    
    // NOT NULL
    if (field.notNull) {
      definition += ' NOT NULL';
    } else {
      definition += ' NULL';
    }
    
    // 默认值
    if (field.defaultValue !== null && field.defaultValue !== undefined && field.defaultValue !== '') {
      // 对字符串类型添加引号
      if (['char', 'varchar', 'text', 'date', 'datetime', 'timestamp', 'time'].includes(field.type)) {
        definition += ` DEFAULT '${field.defaultValue}'`;
      } else {
        definition += ` DEFAULT ${field.defaultValue}`;
      }
    }
    
    // 自增
    if (field.autoIncrement) {
      definition += ' AUTO_INCREMENT';
    }
    
    // 注释
    if (field.comment) {
      definition += ` COMMENT '${field.comment.replace(/'/g, "''")}'`;
    }
    
    return definition;
  };

  // 向上移动字段
  const moveFieldUp = (index) => {
    if (index === 0) return;
    const newFields = [...fields];
    const temp = newFields[index];
    newFields[index] = newFields[index - 1];
    newFields[index - 1] = temp;
    setFields(newFields);
  };

  // 向下移动字段
  const moveFieldDown = (index) => {
    if (index === fields.length - 1) return;
    const newFields = [...fields];
    const temp = newFields[index];
    newFields[index] = newFields[index + 1];
    newFields[index + 1] = temp;
    setFields(newFields);
  };

  // 表格列定义
  const columns = [
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record, index) => (
        <Space size="small">
          <Tooltip title="上移">
            <Button 
              icon={<ArrowUpOutlined />} 
              size="small" 
              disabled={index === 0}
              onClick={() => moveFieldUp(index)}
            />
          </Tooltip>
          <Tooltip title="下移">
            <Button 
              icon={<ArrowDownOutlined />} 
              size="small" 
              disabled={index === fields.length - 1}
              onClick={() => moveFieldDown(index)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个字段吗？"
            onConfirm={() => deleteField(index)}
            okText="是"
            cancelText="否"
          >
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              size="small" 
            />
          </Popconfirm>
        </Space>
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (value, record, index) => (
        <Input
          value={value}
          onChange={(e) => updateField(index, 'name', e.target.value)}
        />
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (value, record, index) => (
        <Select
          value={value}
          style={{ width: '100%' }}
          onChange={(val) => updateField(index, 'type', val)}
        >
          {fieldTypes.map(type => (
            <Option key={type.name} value={type.name}>
              {type.name}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: '长度',
      dataIndex: 'length',
      key: 'length',
      width: 80,
      render: (value, record, index) => {
        const fieldType = fieldTypes.find(type => type.name === record.type);
        return fieldType && fieldType.hasLength ? (
          <Input
            value={value}
            onChange={(e) => updateField(index, 'length', e.target.value)}
          />
        ) : null;
      },
    },
    {
      title: '小数点',
      dataIndex: 'decimals',
      key: 'decimals',
      width: 80,
      render: (value, record, index) => {
        const fieldType = fieldTypes.find(type => type.name === record.type);
        return fieldType && fieldType.hasDecimals ? (
          <Input
            value={value}
            onChange={(e) => updateField(index, 'decimals', e.target.value)}
          />
        ) : null;
      },
    },
    {
      title: '非空',
      dataIndex: 'notNull',
      key: 'notNull',
      width: 80,
      render: (value, record, index) => (
        <Checkbox
          checked={value}
          onChange={(e) => updateField(index, 'notNull', e.target.checked)}
        />
      ),
    },
    {
      title: '主键',
      dataIndex: 'isPrimary',
      key: 'isPrimary',
      width: 80,
      render: (value, record, index) => (
        <Checkbox
          checked={value}
          onChange={(e) => updateField(index, 'isPrimary', e.target.checked)}
        />
      ),
    },
    {
      title: '自增',
      dataIndex: 'autoIncrement',
      key: 'autoIncrement',
      width: 80,
      render: (value, record, index) => (
        <Checkbox
          checked={value}
          disabled={!['int', 'bigint'].includes(record.type)}
          onChange={(e) => updateField(index, 'autoIncrement', e.target.checked)}
        />
      ),
    },
    {
      title: '默认值',
      dataIndex: 'defaultValue',
      key: 'defaultValue',
      width: 120,
      render: (value, record, index) => (
        <Input
          value={value}
          onChange={(e) => updateField(index, 'defaultValue', e.target.value)}
        />
      ),
    },
    {
      title: '注释',
      dataIndex: 'comment',
      key: 'comment',
      render: (value, record, index) => (
        <Input
          value={value}
          onChange={(e) => updateField(index, 'comment', e.target.value)}
        />
      ),
    },
  ];

  return (
    <Modal
      title={`设计表 - ${table}`}
      open={visible}
      onCancel={onClose}
      width={1200}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={saveTableStructure}
        >
          保存
        </Button>,
      ]}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="字段" key="fields">
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={addField}
            >
              添加字段
            </Button>
          </div>
          <Table
            dataSource={fields}
            columns={columns}
            rowKey="key"
            pagination={false}
            size="small"
            loading={loading}
            scroll={{ y: 400 }}
          />
        </TabPane>
        <TabPane tab="索引" key="indexes">
          <div style={{ padding: 16 }}>
            <p>索引功能开发中...</p>
          </div>
        </TabPane>
        <TabPane tab="外键" key="foreignKeys">
          <div style={{ padding: 16 }}>
            <p>外键功能开发中...</p>
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default TableDesigner; 