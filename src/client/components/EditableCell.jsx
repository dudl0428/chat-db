import React from 'react';
import { Form, Input } from 'antd';

const EditableCell = ({
  editing,
  dataIndex,
  title,
  record,
  index,
  children,
  ...restProps
}) => {
  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[
            {
              required: true,
              message: `请输入${title}`,
            },
          ]}
        >
          <Input size="small" />
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
};

export default EditableCell; 