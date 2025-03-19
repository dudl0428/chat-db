import React from 'react';
import { Menu, Dropdown } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ExportOutlined,
  ReloadOutlined,
  ToolOutlined,
  FileTextOutlined,
  KeyOutlined,
  ApiOutlined
} from '@ant-design/icons';

const TableContextMenu = ({ table, visible, position, onAction, onClose }) => {
  const handleMenuClick = (e) => {
    onAction(e.key, table);
    onClose();
  };

  const menu = (
    <Menu onClick={handleMenuClick}>
      <Menu.Item key="openTable" icon={<FileTextOutlined />}>
        打开表
      </Menu.Item>
      <Menu.Item key="designTable" icon={<EditOutlined />}>
        设计表
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="newTable" icon={<FileTextOutlined />}>
        新建表
      </Menu.Item>
      <Menu.Item key="duplicateTable" icon={<CopyOutlined />}>
        复制表
      </Menu.Item>
      <Menu.Item key="deleteTable" icon={<DeleteOutlined />} danger>
        删除表
      </Menu.Item>
      <Menu.Divider />
      <Menu.SubMenu key="exportSub" icon={<ExportOutlined />} title="导出配置为">
        <Menu.Item key="exportSQL">SQL 文件</Menu.Item>
        <Menu.Item key="exportExcel">Excel 文件</Menu.Item>
      </Menu.SubMenu>
      <Menu.Divider />
      <Menu.Item key="refreshTable" icon={<ReloadOutlined />}>
        刷新
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="setTablePermissions" icon={<KeyOutlined />}>
        设置权限
      </Menu.Item>
      <Menu.Item key="manageTable" icon={<ToolOutlined />}>
        管理组
      </Menu.Item>
      <Menu.Item key="renameTable" icon={<EditOutlined />}>
        重命名
      </Menu.Item>
    </Menu>
  );

  return visible ? (
    <div
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        zIndex: 1000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {menu}
    </div>
  ) : null;
};

export default TableContextMenu; 