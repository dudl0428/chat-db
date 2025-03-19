import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  Typography, 
  Select, 
  Divider, 
  notification,
  Spin
} from 'antd';
import { 
  DatabaseOutlined, 
  LockOutlined, 
  UserOutlined,
  LinkOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const ConnectionPage = ({ addConnection, setActiveConnection, setDatabases }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    
    try {
      // Make API call to test and establish connection
      const response = await axios.post('/api/connection/test', values);
      
      if (response.data.success) {
        // Use the connection info returned from the server
        const newConnection = response.data.connection;
        
        // Set as active connection
        setActiveConnection(newConnection);
        
        // Get databases from the connection
        const dbResponse = await axios.get('/api/database', {
          params: { connectionId: newConnection.id }
        });
        
        setDatabases(dbResponse.data);
        
        notification.success({
          message: 'Connection Successful',
          description: 'Successfully connected to the database server.'
        });
        
        // Navigate to first database or stay on this page
        if (dbResponse.data.length > 0) {
          navigate(`/database/${dbResponse.data[0].name}`);
        }
      } else {
        throw new Error(response.data.message || 'Failed to connect');
      }
    } catch (error) {
      notification.error({
        message: 'Connection Failed',
        description: error.message || 'Failed to connect to the database server.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="connection-form">
      <Title level={3}>
        <DatabaseOutlined /> Connect to MySQL Database
      </Title>
      <Text type="secondary">
        Enter your MySQL database connection details below.
      </Text>
      
      <Divider />
      
      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            host: 'localhost',
            port: 3306,
            type: 'mysql'
          }}
        >
          <Form.Item
            name="name"
            label="Connection Name"
            rules={[{ required: false, message: 'Please enter a name for this connection' }]}
          >
            <Input 
              placeholder="My Database Connection" 
              prefix={<LinkOutlined />} 
            />
          </Form.Item>
          
          <Form.Item
            name="type"
            label="Database Type"
            rules={[{ required: true, message: 'Please select a database type' }]}
          >
            <Select>
              <Option value="mysql">MySQL</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="host"
            label="Host"
            rules={[{ required: true, message: 'Please enter the host' }]}
          >
            <Input placeholder="localhost" />
          </Form.Item>
          
          <Form.Item
            name="port"
            label="Port"
            rules={[{ required: true, message: 'Please enter the port' }]}
          >
            <Input placeholder="3306" type="number" />
          </Form.Item>
          
          <Form.Item
            name="user"
            label="Username"
            rules={[{ required: true, message: 'Please enter the username' }]}
          >
            <Input 
              placeholder="root" 
              prefix={<UserOutlined />} 
            />
          </Form.Item>
          
          <Form.Item
            name="password"
            label="Password"
          >
            <Input.Password 
              placeholder="password" 
              prefix={<LockOutlined />} 
            />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Connect
            </Button>
          </Form.Item>
        </Form>
      </Spin>
    </div>
  );
};

export default ConnectionPage; 