import React, { useState } from 'react';
import { Button, Modal, Form, Input, Space, message, Popconfirm, notification } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ExportOutlined } from '@ant-design/icons';
import axios from 'axios';
import * as XLSX from 'xlsx';

const TableDataOperations = ({ 
  database, 
  table, 
  connectionId, 
  selectedRows, 
  columns, 
  onSuccess 
}) => {
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 处理新增数据
  const handleAdd = async (values) => {
    try {
      setLoading(true);
      await axios.post(`/api/database/${database}/tables/${table}/data`, {
        data: values,
        connectionId
      });
      message.success('数据添加成功');
      setAddModalVisible(false);
      form.resetFields();
      onSuccess && onSuccess();
    } catch (error) {
      notification.error({
        message: '添加失败',
        description: error.response?.data?.message || error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // 处理编辑数据
  const handleEdit = async (values) => {
    if (!selectedRows || selectedRows.length !== 1) {
      message.warning('请选择一条记录进行编辑');
      return;
    }

    try {
      setLoading(true);
      const record = selectedRows[0];
      // 构建where条件，使用主键或唯一键
      const where = {};
      columns.forEach(col => {
        if (col.key === 'PRI' || col.key === 'UNI') {
          where[col.name] = record[col.name];
        }
      });

      await axios.put(`/api/database/${database}/tables/${table}/data`, {
        data: values,
        where,
        connectionId
      });
      message.success('数据更新成功');
      setEditModalVisible(false);
      form.resetFields();
      onSuccess && onSuccess();
    } catch (error) {
      notification.error({
        message: '更新失败',
        description: error.response?.data?.message || error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // 处理删除数据
  const handleDelete = async () => {
    if (!selectedRows || selectedRows.length === 0) {
      message.warning('请至少选择一条记录');
      return;
    }

    try {
      setLoading(true);
      const record = selectedRows[0];
      // 构建where条件，使用主键或唯一键
      const where = {};
      columns.forEach(col => {
        if (col.key === 'PRI' || col.key === 'UNI') {
          where[col.name] = record[col.name];
        }
      });

      await axios.delete(`/api/database/${database}/tables/${table}/data`, {
        data: { where, connectionId }
      });
      message.success('数据删除成功');
      onSuccess && onSuccess();
    } catch (error) {
      notification.error({
        message: '删除失败',
        description: error.response?.data?.message || error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // 处理导出数据
  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/database/${database}/tables/${table}/export`, {
        params: { connectionId }
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
      XLSX.utils.book_append_sheet(wb, ws, table);

      // 导出文件
      XLSX.writeFile(wb, filename);
      message.success('数据导出成功');
    } catch (error) {
      notification.error({
        message: '导出失败',
        description: error.response?.data?.message || error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // 渲染表单项
  const renderFormItems = () => {
    return columns.map(column => (
      <Form.Item
        key={column.name}
        name={column.name}
        label={column.comment || column.name}
        rules={[
          {
            required: !column.nullable && !column.extra?.includes('auto_increment'),
            message: `请输入${column.comment || column.name}`
          }
        ]}
      >
        <Input 
          placeholder={`请输入${column.comment || column.name}`}
          disabled={column.extra?.includes('auto_increment')}
        />
      </Form.Item>
    ));
  };

  return (
    <>
      <Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddModalVisible(true)}
        >
          新建
        </Button>
        <Button
          icon={<EditOutlined />}
          onClick={() => {
            if (selectedRows?.length === 1) {
              form.setFieldsValue(selectedRows[0]);
              setEditModalVisible(true);
            } else {
              message.warning('请选择一条记录进行编辑');
            }
          }}
        >
          编辑
        </Button>
        <Popconfirm
          title="确定要删除选中的记录吗？"
          onConfirm={handleDelete}
          okText="确定"
          cancelText="取消"
        >
          <Button
            danger
            icon={<DeleteOutlined />}
            disabled={!selectedRows?.length}
          >
            删除
          </Button>
        </Popconfirm>
        <Button
          icon={<ExportOutlined />}
          onClick={handleExport}
        >
          导出
        </Button>
      </Space>

      {/* 新增数据模态框 */}
      <Modal
        title="新增数据"
        open={addModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setAddModalVisible(false);
          form.resetFields();
        }}
        confirmLoading={loading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAdd}
        >
          {renderFormItems()}
        </Form>
      </Modal>

      {/* 编辑数据模态框 */}
      <Modal
        title="编辑数据"
        open={editModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          form.resetFields();
        }}
        confirmLoading={loading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEdit}
        >
          {renderFormItems()}
        </Form>
      </Modal>
    </>
  );
};

export default TableDataOperations; 