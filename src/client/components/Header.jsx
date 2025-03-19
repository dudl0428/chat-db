import React from 'react';
import { Tag, Typography } from 'antd';
import { PageHeader } from '@ant-design/pro-components';
import { DatabaseOutlined, TableOutlined } from '@ant-design/icons';

const { Text } = Typography;

const Header = ({ activeConnection, selectedDatabase, selectedTable }) => {
  // Create title based on active elements
  let title = 'DB AI Assistant';
  let tags = [];
  
  if (activeConnection) {
    title = activeConnection.name || 'Database Connection';
    tags.push(
      <Tag color="blue" key="connection">
        <DatabaseOutlined /> {activeConnection.host}:{activeConnection.port}
      </Tag>
    );
  }
  
  if (selectedDatabase) {
    tags.push(
      <Tag color="green" key="database">
        <DatabaseOutlined /> {selectedDatabase}
      </Tag>
    );
  }
  
  if (selectedTable) {
    tags.push(
      <Tag color="purple" key="table">
        <TableOutlined /> {selectedTable}
      </Tag>
    );
  }
  
  return (
    <PageHeader
      className="header"
      title={title}
      tags={tags}
      extra={
        activeConnection && (
          <Text type="secondary">
            {`${activeConnection.user}@${activeConnection.host}`}
          </Text>
        )
      }
    />
  );
};

export default Header; 