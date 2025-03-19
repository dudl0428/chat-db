import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ConnectionPage from './pages/ConnectionPage';
import DatabasePage from './pages/DatabasePage';
import ChatPage from './pages/ChatPage';
import axios from 'axios';

const { Content } = Layout;

function App() {
  const [connections, setConnections] = useState(() => {
    const saved = localStorage.getItem('connections');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeConnection, setActiveConnection] = useState(() => {
    const saved = localStorage.getItem('activeConnection');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [databases, setDatabases] = useState(() => {
    const saved = localStorage.getItem('databases');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [selectedTable, setSelectedTable] = useState('');

  // 当连接信息改变时保存到 localStorage
  useEffect(() => {
    localStorage.setItem('connections', JSON.stringify(connections));
  }, [connections]);

  useEffect(() => {
    localStorage.setItem('activeConnection', JSON.stringify(activeConnection));
  }, [activeConnection]);

  useEffect(() => {
    localStorage.setItem('databases', JSON.stringify(databases));
  }, [databases]);

  // 当组件加载时，如果有活动连接，尝试重新连接并获取数据库列表
  useEffect(() => {
    const reconnect = async () => {
      if (!activeConnection) return;

      try {
        // 测试连接是否有效
        await axios.post('/api/connection/test', {
          host: activeConnection.host,
          port: activeConnection.port,
          user: activeConnection.user,
          password: activeConnection.password,
          type: activeConnection.type
        });

        // 获取数据库列表
        const dbResponse = await axios.get('/api/database', {
          params: { connectionId: activeConnection.id }
        });
        
        setDatabases(dbResponse.data);
      } catch (error) {
        console.error('Reconnection failed:', error);
        // 如果重连失败，清除存储的连接信息
        setActiveConnection(null);
        setDatabases([]);
        localStorage.removeItem('activeConnection');
        localStorage.removeItem('databases');
      }
    };

    reconnect();
  }, []);

  const addConnection = (connection) => {
    const newConnection = {
      ...connection,
      id: `conn-${Date.now()}`,
    };
    setConnections([...connections, newConnection]);
    return newConnection;
  };

  const setActiveDb = (dbName) => {
    setSelectedDatabase(dbName);
  };

  const setActiveTable = (tableName) => {
    setSelectedTable(tableName);
  };

  return (
    <Layout className="app-container">
      <Sidebar 
        connections={connections}
        databases={databases}
        activeConnection={activeConnection}
        selectedDatabase={selectedDatabase}
        setActiveDb={setActiveDb}
        setActiveTable={setActiveTable}
      />
      <Layout className="main-content">
        <Header 
          activeConnection={activeConnection} 
          selectedDatabase={selectedDatabase}
          selectedTable={selectedTable}
        />
        <Content className="content-area">
          <Routes>
            <Route 
              path="/" 
              element={
                activeConnection ? (
                  <Navigate to={`/database/${databases[0]?.name || ''}`} replace />
                ) : (
                  <Navigate to="/connection" replace />
                )
              }
            />
            <Route 
              path="/connection" 
              element={
                <ConnectionPage 
                  addConnection={addConnection} 
                  setActiveConnection={setActiveConnection}
                  setDatabases={setDatabases}
                />
              } 
            />
            <Route 
              path="/database/:dbName" 
              element={
                <DatabasePage 
                  activeConnection={activeConnection}
                  selectedDatabase={selectedDatabase}
                  selectedTable={selectedTable}
                />
              } 
            />
            <Route 
              path="/chat/:dbName" 
              element={
                <ChatPage 
                  activeConnection={activeConnection}
                  selectedDatabase={selectedDatabase}
                />
              } 
            />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App; 