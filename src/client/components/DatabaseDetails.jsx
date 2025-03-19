import React, { useState, useEffect } from 'react';
import { Tree, message } from 'antd';
import { DatabaseOutlined, TableOutlined, FolderOutlined, FileOutlined } from '@ant-design/icons';
import axios from 'axios';
import TableContextMenu from './TableContextMenu';
import TableDesigner from './TableDesigner';
import CreateTableModal from './CreateTableModal';

const DatabaseDetails = ({ database, connectionId, onTableSelect, className }) => {
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    position: { x: 0, y: 0 },
    table: null,
    nodeType: null // 节点类型（database, tables, table, views, view）
  });
  const [designerVisible, setDesignerVisible] = useState(false);
  const [createTableVisible, setCreateTableVisible] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadDatabaseObjects();
  }, [database, connectionId, refreshTrigger]);

  const loadDatabaseObjects = async () => {
    if (!database || !connectionId) return;
    
    setLoading(true);
    try {
      // 从服务器加载表和视图数据
      const [tablesRes, viewsRes] = await Promise.all([
        axios.get(`/api/database/${database}/tables`, {
          params: { connectionId }
        }),
        axios.get(`/api/database/${database}/views`, {
          params: { connectionId }
        })
      ]);

      // 确保返回的数据是数组
      const tables = Array.isArray(tablesRes.data) ? tablesRes.data : [];
      const views = Array.isArray(viewsRes.data) ? viewsRes.data : [];

      console.log('加载到的表:', tables);
      console.log('加载到的视图:', views);

      // 处理表数据 - 直接使用表名作为显示文本
      const tableNodes = tables.map(table => {
        const tableName = typeof table === 'string' ? table : table.name;
        return {
          title: tableName,
          key: `table-${tableName}`,
          icon: <FileOutlined style={{ color: '#1677FF' }} />,
          type: 'table',
          selectable: true,
          isLeaf: true
        };
      });

      // 处理视图数据
      const viewNodes = views.map(view => {
        const viewName = typeof view === 'string' ? view : view.name;
        return {
          title: viewName,
          key: `view-${viewName}`,
          icon: <FileOutlined style={{ color: '#52c41a' }} />,
          type: 'view',
          selectable: true,
          isLeaf: true
        };
      });

      // 构建Navicat风格的树结构
      const dbTreeData = [
        {
          title: '表',
          key: 'tables-folder',
          icon: <FolderOutlined style={{ color: '#1677FF' }} />,
          type: 'tables',
          children: tableNodes,
          selectable: false
        }
      ];
      
      // 只有当视图存在时才添加视图文件夹
      if (viewNodes.length > 0) {
        dbTreeData.push({
          title: '视图',
          key: 'views-folder',
          icon: <FolderOutlined style={{ color: '#52c41a' }} />,
          type: 'views',
          children: viewNodes,
          selectable: false
        });
      }

      console.log('构建的树数据:', dbTreeData);
      setTreeData(dbTreeData);
    } catch (error) {
      console.error('Failed to load database objects:', error);
      message.error('加载数据库对象失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (selectedKeys, info) => {
    console.log('选中节点:', info.node);
    
    if (info.node.type === 'table' || info.node.type === 'view') {
      onTableSelect && onTableSelect(info.node.title);
      setSelectedTable(info.node.title);
    }
  };

  // 处理右键点击
  const handleRightClick = ({ event, node }) => {
    event.preventDefault();
    
    // 根据节点类型显示不同的右键菜单
    if (node.type === 'table' || node.type === 'view') {
      // 表或视图节点的右键菜单
      setContextMenu({
        visible: true,
        position: { x: event.clientX, y: event.clientY },
        table: node.title,
        nodeType: node.type
      });
    } else if (node.type === 'tables' || node.type === 'views') {
      // 表或视图文件夹节点的右键菜单
      setContextMenu({
        visible: true,
        position: { x: event.clientX, y: event.clientY },
        table: null,
        nodeType: node.type
      });
    }
  };

  // 处理右键菜单动作
  const handleMenuAction = (action, table) => {
    console.log('菜单动作:', action, '表:', table, '节点类型:', contextMenu.nodeType);
    
    switch(action) {
      case 'openTable':
        if (table) {
          onTableSelect && onTableSelect(table);
          setSelectedTable(table);
        }
        break;
      case 'designTable':
        if (table) {
          setSelectedTable(table);
          setDesignerVisible(true);
        }
        break;
      case 'newTable':
        // 新建表
        setCreateTableVisible(true);
        break;
      case 'deleteTable':
        // 这里可以添加删除表的逻辑
        if (table) {
          console.log('删除表:', table);
        }
        break;
      case 'refreshTable':
        // 刷新数据 - 通过更改refreshTrigger来触发useEffect
        message.info('正在刷新表结构...');
        setRefreshTrigger(prev => prev + 1);
        // 如果当前选中的表是要刷新的表，也刷新表结构
        if (selectedTable === table) {
          setTimeout(() => {
            onTableSelect && onTableSelect(table);
          }, 500); // 稍微延迟一下，确保树已经刷新完成
        }
        break;
      default:
        // 其他操作
        break;
    }
  };

  // 处理表设计器关闭
  const handleDesignerClose = () => {
    setDesignerVisible(false);
  };

  // 处理表设计器保存
  const handleDesignerSave = () => {
    // 刷新数据
    message.success('表结构已更新，正在刷新...');
    setRefreshTrigger(prev => prev + 1);
    
    // 延迟一点时间再重新加载表数据，确保服务器已经处理完成
    setTimeout(() => {
      onTableSelect && onTableSelect(selectedTable);
    }, 500);
  };

  // 处理创建表保存
  const handleCreateTableSave = (tableName) => {
    // 刷新数据
    message.success(`表 "${tableName}" 已创建，正在刷新...`);
    setRefreshTrigger(prev => prev + 1);
    
    // 关闭创建表弹窗
    setCreateTableVisible(false);
    
    // 延迟一点时间再选择新创建的表
    setTimeout(() => {
      setSelectedTable(tableName);
      onTableSelect && onTableSelect(tableName);
    }, 1000);
  };

  // 点击空白处关闭右键菜单
  const handleClickOutside = () => {
    if (contextMenu.visible) {
      setContextMenu({ ...contextMenu, visible: false });
    }
  };

  // 根据节点类型返回适当的上下文菜单
  const getContextMenu = () => {
    // 表格节点的菜单
    if (contextMenu.nodeType === 'table' || contextMenu.nodeType === 'view') {
      return (
        <TableContextMenu
          table={contextMenu.table}
          visible={contextMenu.visible}
          position={contextMenu.position}
          onAction={handleMenuAction}
          onClose={() => setContextMenu({ ...contextMenu, visible: false })}
          nodeType={contextMenu.nodeType}
        />
      );
    }
    
    // 表文件夹或视图文件夹节点的菜单
    if (contextMenu.nodeType === 'tables' || contextMenu.nodeType === 'views') {
      return (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.position.y,
            left: contextMenu.position.x,
            zIndex: 1000,
            backgroundColor: '#fff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            borderRadius: '4px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu">
            <ul className="ant-dropdown-menu">
              <li className="ant-dropdown-menu-item" onClick={() => handleMenuAction('newTable')}>
                <span>新建表</span>
              </li>
              <li className="ant-dropdown-menu-item" onClick={() => handleMenuAction('refreshTable')}>
                <span>刷新</span>
              </li>
            </ul>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div onClick={handleClickOutside} className={className} style={{ minHeight: '100px', width: '100%' }}>
      {treeData.length > 0 ? (
        <Tree
          treeData={treeData}
          onSelect={handleSelect}
          onRightClick={handleRightClick}
          showIcon
          defaultExpandAll
          loading={loading}
          blockNode
          className="navicat-tree"
          style={{ width: '100%' }}
        />
      ) : loading ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>加载中...</div>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center' }}>没有数据库对象</div>
      )}
      {contextMenu.visible && getContextMenu()}
      <TableDesigner
        visible={designerVisible}
        database={database}
        table={selectedTable}
        connectionId={connectionId}
        onClose={handleDesignerClose}
        onSave={handleDesignerSave}
      />
      <CreateTableModal
        visible={createTableVisible}
        database={database}
        connectionId={connectionId}
        onClose={() => setCreateTableVisible(false)}
        onSave={handleCreateTableSave}
      />
    </div>
  );
};

export default DatabaseDetails; 