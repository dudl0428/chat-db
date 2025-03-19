import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Tree, Button, Typography, Tooltip } from 'antd';
import { 
  DatabaseOutlined, 
  PlusOutlined,
  MessageOutlined
} from '@ant-design/icons';
import DatabaseDetails from './DatabaseDetails';

const { Sider } = Layout;
const { Title } = Typography;
const { DirectoryTree } = Tree;

const Sidebar = ({ 
  connections, 
  databases, 
  activeConnection, 
  selectedDatabase,
  setActiveDb,
  setActiveTable
}) => {
  const navigate = useNavigate();
  const [expandedKeys, setExpandedKeys] = useState([]);

  // Transform databases into tree structure
  const treeData = databases.map(db => ({
    title: db.name,
    key: `db-${db.name}`,
    icon: <DatabaseOutlined />,
    children: [],
  }));

  const onSelect = (selectedKeys, info) => {
    if (selectedKeys.length === 0) return;
    
    const key = selectedKeys[0];
    
    if (key.startsWith('db-')) {
      const dbName = key.replace('db-', '');
      setActiveDb(dbName);
      navigate(`/database/${dbName}`);
    }
  };

  const onExpand = (expandedKeys) => {
    setExpandedKeys(expandedKeys);
  };

  const startChat = () => {
    if (selectedDatabase) {
      navigate(`/chat/${selectedDatabase}`);
    }
  };

  const addNewConnection = () => {
    navigate('/connection');
  };

  return (
    <Sider className="sidebar" width={280}>
      <div style={{ padding: '16px' }}>
        <Title level={4} style={{ color: 'white', marginBottom: '16px' }}>
          DB AI Assistant
        </Title>
        
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={addNewConnection}
          style={{ marginBottom: '16px', width: '100%' }}
        >
          New Connection
        </Button>
        
        {selectedDatabase && (
          <Tooltip title={`Chat with ${selectedDatabase} database`}>
            <Button
              type="default"
              icon={<MessageOutlined />}
              onClick={startChat}
              style={{ marginBottom: '16px', width: '100%' }}
            >
              Chat with AI
            </Button>
          </Tooltip>
        )}
      </div>
      
      <div className="db-tree">
        {treeData.length > 0 ? (
          <>
            <DirectoryTree
              onSelect={onSelect}
              onExpand={onExpand}
              expandedKeys={expandedKeys}
              treeData={treeData}
            />
            {selectedDatabase && activeConnection && (
              <div style={{ padding: '0 16px' }}>
                <DatabaseDetails
                  database={selectedDatabase}
                  connectionId={activeConnection.id}
                />
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '0 16px', color: 'rgba(255,255,255,0.65)' }}>
            {activeConnection ? 'No databases found' : 'Connect to a database'}
          </div>
        )}
      </div>
    </Sider>
  );
};

export default Sidebar; 