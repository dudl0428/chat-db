import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Input, 
  Button, 
  Card, 
  Typography, 
  Divider, 
  notification,
  Spin,
  Space,
  Tooltip,
  List,
  Tag,
  Empty,
} from 'antd';
import { 
  SendOutlined, 
  CopyOutlined, 
  PlayCircleOutlined,
  DatabaseOutlined,
  MessageOutlined,
  RobotOutlined,
  UserOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { Editor } from '@monaco-editor/react';
import { format } from 'sql-formatter';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const ChatPage = ({ activeConnection, selectedDatabase }) => {
  const { dbName } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [schemaInfo, setSchemaInfo] = useState(null);

  // Initialize with system message
  useEffect(() => {
    setMessages([
      {
        id: 'system-1',
        role: 'system',
        content: `I'll help you write SQL queries for your database. Just describe what you're looking for in plain language.`,
      }
    ]);

    // Fetch schema info for the AI to understand the database structure
    if (activeConnection && dbName) {
      fetchSchemaInfo();
    }
  }, [activeConnection, dbName]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSchemaInfo = async () => {
    if (!activeConnection || !dbName) return;
    
    try {
      const response = await axios.get(`/api/database/${dbName}/schema`, {
        params: { connectionId: activeConnection.id }
      });
      
      if (response.data) {
        setSchemaInfo(response.data);
      }
    } catch (error) {
      console.error('Error fetching schema info:', error);
      notification.error({
        message: 'Error Loading Schema Information',
        description: 'Unable to load database schema information for AI assistance.'
      });
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || !activeConnection || !dbName) return;
    
    // Add user message
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      // Send message to AI API endpoint
      const response = await axios.post('/api/ai/generate-sql', {
        connectionId: activeConnection.id,
        database: dbName,
        prompt: input,
        schema: schemaInfo,
        messageHistory: messages,
      });
      
      if (response.data) {
        // Add AI response
        const aiMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: response.data.explanation || 'Here is the SQL query:',
          sql: response.data.sql,
        };
        
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error generating SQL:', error);
      
      notification.error({
        message: 'Error Generating SQL',
        description: error.message || 'Failed to generate SQL from natural language.'
      });
      
      // Add error message
      const errorMessage = {
        id: `system-error-${Date.now()}`,
        role: 'system',
        content: `Error: ${error.message || 'Failed to generate SQL'}`,
        isError: true,
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    notification.success({
      message: 'Copied',
      description: 'SQL copied to clipboard',
      duration: 2,
    });
  };

  const executeQuery = async (sql) => {
    if (!sql || !activeConnection || !dbName) return;
    
    try {
      // Execute the SQL query
      await axios.post(`/api/database/${dbName}/query`, {
        connectionId: activeConnection.id,
        query: sql
      });
      
      // Navigate to the database page to see results
      navigate(`/database/${dbName}`);
    } catch (error) {
      notification.error({
        message: 'Error Executing Query',
        description: error.message || 'Failed to execute SQL query.'
      });
    }
  };

  const formatSQL = (sql) => {
    try {
      return format(sql, {
        language: 'mysql',
        tabWidth: 2,
        keywordCase: 'upper',
      });
    } catch (error) {
      console.error('Error formatting SQL:', error);
      return sql;
    }
  };

  if (!activeConnection) {
    return (
      <Card>
        <Empty
          description="No active database connection"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={() => navigate('/connection')}>
            Connect to Database
          </Button>
        </Empty>
      </Card>
    );
  }

  return (
    <div className="chat-page">
      <Card className="chat-header">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={4}>
            <RobotOutlined /> AI SQL Assistant
          </Title>
          <Text type="secondary">
            <DatabaseOutlined /> Using database: {dbName}
          </Text>
        </Space>
      </Card>
      
      <Divider style={{ margin: '16px 0' }} />
      
      <Card className="chat-container" style={{ height: 'calc(100vh - 250px)', overflowY: 'auto' }}>
        <List
          itemLayout="vertical"
          dataSource={messages}
          renderItem={(message) => {
            // Skip system messages
            if (message.role === 'system' && !message.isError) return null;
            
            return (
              <List.Item key={message.id} className={`message ${message.role}-message`}>
                <div className="message-header">
                  <Space>
                    {message.role === 'user' ? (
                      <Tag icon={<UserOutlined />} color="blue">You</Tag>
                    ) : message.role === 'assistant' ? (
                      <Tag icon={<RobotOutlined />} color="green">AI</Tag>
                    ) : (
                      <Tag color="red">System</Tag>
                    )}
                  </Space>
                </div>
                
                <div className="message-content">
                  <Paragraph>
                    {message.content}
                  </Paragraph>
                  
                  {message.sql && (
                    <div className="sql-container">
                      <Card
                        size="small"
                        title="Generated SQL"
                        extra={
                          <Space>
                            <Tooltip title="Copy SQL">
                              <Button
                                icon={<CopyOutlined />}
                                size="small"
                                onClick={() => copyToClipboard(message.sql)}
                              />
                            </Tooltip>
                            <Tooltip title="Execute Query">
                              <Button
                                type="primary"
                                icon={<PlayCircleOutlined />}
                                size="small"
                                onClick={() => executeQuery(message.sql)}
                              />
                            </Tooltip>
                          </Space>
                        }
                      >
                        <div className="monaco-editor-container" style={{ height: '150px' }}>
                          <Editor
                            height="150px"
                            language="sql"
                            value={formatSQL(message.sql)}
                            theme="vs-dark"
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                              fontSize: 14,
                            }}
                          />
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              </List.Item>
            );
          }}
        />
        <div ref={messagesEndRef} />
      </Card>
      
      <Card className="chat-input">
        <div className="input-container">
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question like 'Show me all customers who made a purchase in the last month'"
            autoSize={{ minRows: 2, maxRows: 4 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={loading}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSubmit}
            loading={loading}
            disabled={!input.trim()}
          >
            Send
          </Button>
        </div>
        
        <Text type="secondary">
          <MessageOutlined /> Describe what you want to query in natural language
        </Text>
      </Card>
    </div>
  );
};

export default ChatPage; 