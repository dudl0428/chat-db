import React, { useState } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Button, 
  Table, 
  Space, 
  Select, 
  Checkbox, 
  Tooltip,
  message,
  InputNumber,
  Popconfirm
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  KeyOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

// 字段类型列表
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
];

const CreateTableModal = ({ visible, database, connectionId, onClose, onSave }) => {
  const [form] = Form.useForm();
  const [tableName, setTableName] = useState('');
  const [fields, setFields] = useState([
    {
      name: 'id',
      type: 'int',
      length: '11',
      decimals: '',
      notNull: true,
      isPrimary: true,
      autoIncrement: true,
      defaultValue: null,
      comment: '主键ID',
      key: 'id',
    },
  ]);
  const [saving, setSaving] = useState(false);

  // 添加新字段
  const addField = () => {
    const newField = {
      name: '',
      type: 'varchar',
      length: '255',
      decimals: '',
      notNull: false,
      isPrimary: false,
      autoIncrement: false,
      defaultValue: null,
      comment: '',
      key: `field-${fields.length}`,
    };
    setFields([...fields, newField]);
  };

  // 删除字段
  const deleteField = (index) => {
    if (fields.length === 1) {
      message.warning('表至少需要一个字段');
      return;
    }
    
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);
  };

  // 上移字段
  const moveFieldUp = (index) => {
    if (index === 0) return;
    const newFields = [...fields];
    const temp = newFields[index];
    newFields[index] = newFields[index - 1];
    newFields[index - 1] = temp;
    setFields(newFields);
  };

  // 下移字段
  const moveFieldDown = (index) => {
    if (index === fields.length - 1) return;
    const newFields = [...fields];
    const temp = newFields[index];
    newFields[index] = newFields[index + 1];
    newFields[index + 1] = temp;
    setFields(newFields);
  };

  // 更新字段
  const updateField = (index, key, value) => {
    const newFields = [...fields];
    newFields[index][key] = value;
    
    // 如果更新了类型，更新长度和小数位
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
      
      // 只有int和bigint可以自增
      if (newFields[index].autoIncrement && !['int', 'bigint'].includes(value)) {
        newFields[index].autoIncrement = false;
      }
    }
    
    // 如果设置了自增，必须为NOT NULL和主键
    if (key === 'autoIncrement' && value) {
      newFields[index].notNull = true;
      newFields[index].isPrimary = true;
    }
    
    // 如果设置为主键，必须为NOT NULL
    if (key === 'isPrimary' && value) {
      newFields[index].notNull = true;
    }
    
    setFields(newFields);
  };

  // 提交创建表
  const handleSubmit = async () => {
    // 验证表名
    if (!tableName.trim()) {
      message.error('请输入表名');
      return;
    }
    
    // 验证字段
    if (fields.some(field => !field.name.trim())) {
      message.error('字段名不能为空');
      return;
    }
    
    // 验证字段名重复
    const fieldNames = fields.map(field => field.name.trim());
    const hasDuplicates = fieldNames.some((name, index) => 
      fieldNames.indexOf(name) !== index
    );
    
    if (hasDuplicates) {
      message.error('存在重复的字段名');
      return;
    }
    
    // 确保至少有一个主键
    if (!fields.some(field => field.isPrimary)) {
      message.error('请至少设置一个主键字段');
      return;
    }
    
    setSaving(true);
    
    try {
      // 构建CREATE TABLE SQL语句
      let sql = `CREATE TABLE \`${tableName}\` (\n`;
      
      // 添加字段定义
      const fieldDefinitions = fields.map(field => {
        let definition = `  \`${field.name}\` ${field.type.toUpperCase()}`;
        
        // 添加长度和小数位
        if (field.length) {
          if (field.decimals) {
            definition += `(${field.length}, ${field.decimals})`;
          } else {
            definition += `(${field.length})`;
          }
        }
        
        // NOT NULL
        if (field.notNull) {
          definition += ' NOT NULL';
        }
        
        // 默认值
        if (field.defaultValue !== null && field.defaultValue !== undefined && field.defaultValue !== '') {
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
      });
      
      // 主键定义
      const primaryKeys = fields.filter(field => field.isPrimary).map(field => `\`${field.name}\``);
      if (primaryKeys.length > 0) {
        fieldDefinitions.push(`  PRIMARY KEY (${primaryKeys.join(', ')})`);
      }
      
      sql += fieldDefinitions.join(',\n');
      sql += '\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;';
      
      // 执行创建表SQL
      const response = await axios.post(`/api/database/${database}/query`, {
        connectionId,
        query: sql
      });
      
      message.success(`表 "${tableName}" 创建成功`);
      onSave && onSave(tableName);
    } catch (error) {
      console.error('创建表失败:', error);
      message.error(`创建表失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // 重置表单
  const handleReset = () => {
    setTableName('');
    setFields([
      {
        name: 'id',
        type: 'int',
        length: '11',
        decimals: '',
        notNull: true,
        isPrimary: true,
        autoIncrement: true,
        defaultValue: null,
        comment: '主键ID',
        key: 'id',
      },
    ]);
  };

  // 字段表格列定义
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
            disabled={fields.length === 1}
          >
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              size="small" 
              disabled={fields.length === 1}
            />
          </Popconfirm>
        </Space>
      ),
    },
    {
      title: '字段名',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (value, record, index) => (
        <Input
          value={value}
          onChange={(e) => updateField(index, 'name', e.target.value)}
          placeholder="字段名称"
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
          <InputNumber
            value={value}
            onChange={(val) => updateField(index, 'length', val)}
            style={{ width: '100%' }}
            min={1}
          />
        ) : null;
      },
    },
    {
      title: '小数位',
      dataIndex: 'decimals',
      key: 'decimals',
      width: 80,
      render: (value, record, index) => {
        const fieldType = fieldTypes.find(type => type.name === record.type);
        return fieldType && fieldType.hasDecimals ? (
          <InputNumber
            value={value}
            onChange={(val) => updateField(index, 'decimals', val)}
            style={{ width: '100%' }}
            min={0}
          />
        ) : null;
      },
    },
    {
      title: '非空',
      dataIndex: 'notNull',
      key: 'notNull',
      width: 60,
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
      width: 60,
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
      width: 60,
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
          placeholder="默认值"
          disabled={record.autoIncrement}
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
          placeholder="注释信息"
        />
      ),
    },
  ];

  return (
    <Modal
      title="创建新表"
      open={visible}
      onCancel={onClose}
      width={1200}
      footer={[
        <Button key="reset" onClick={handleReset}>
          重置
        </Button>,
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={saving}
          onClick={handleSubmit}
        >
          创建
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
      >
        <Form.Item 
          label="表名"
          required
          help="表名只能包含字母、数字和下划线，且不能以数字开头"
        >
          <Input
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="请输入表名"
            maxLength={64}
          />
        </Form.Item>
        
        <Form.Item label="字段设置">
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
            pagination={false}
            size="small"
            scroll={{ y: 400 }}
            rowKey="key"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateTableModal; 