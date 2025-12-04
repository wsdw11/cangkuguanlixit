import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { authService, userService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { ColumnsType } from 'antd/es/table';

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  created_at: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await userService.getAll();
      setUsers(data);
    } catch (error: any) {
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      await authService.register(values);
      message.success('注册成功');
      setModalVisible(false);
      loadUsers();
    } catch (error: any) {
      message.error(error.response?.data?.error || '注册失败');
    }
  };

  const columns: ColumnsType<User> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (role === 'admin' ? '管理员' : '普通用户'),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleString('zh-CN'),
    },
  ];

  if (!isAdmin) {
    return <div>您没有权限访问此页面</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1>用户管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增用户
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title="新增用户"
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6位' }]}
          >
            <Input.Password placeholder="密码（至少6位）" />
          </Form.Item>
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="姓名" />
          </Form.Item>
          <Form.Item name="role" label="角色" initialValue="user">
            <Select>
              <Select.Option value="user">普通用户</Select.Option>
              <Select.Option value="admin">管理员</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

