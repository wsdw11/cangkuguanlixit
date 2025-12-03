import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { locationService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { ColumnsType } from 'antd/es/table';

interface Location {
  id: number;
  code: string;
  name: string;
  area?: string;
  description?: string;
}

export default function Locations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [form] = Form.useForm();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const data = await locationService.getAll();
      setLocations(data);
    } catch (error: any) {
      message.error('加载位置列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingLocation(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Location) => {
    setEditingLocation(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await locationService.delete(id);
      message.success('删除成功');
      loadLocations();
    } catch (error: any) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingLocation) {
        await locationService.update(editingLocation.id, values);
        message.success('更新成功');
      } else {
        await locationService.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadLocations();
    } catch (error: any) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  const columns: ColumnsType<Location> = [
    {
      title: '位置编码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '位置名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '区域',
      dataIndex: 'area',
      key: 'area',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          {isAdmin && (
            <>
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                编辑
              </Button>
              <Popconfirm
                title="确定要删除这个位置吗？"
                onConfirm={() => handleDelete(record.id)}
              >
                <Button type="link" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1>位置管理</h1>
        {isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增位置
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={locations}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={editingLocation ? '编辑位置' : '新增位置'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="code"
            label="位置编码"
            rules={[{ required: true, message: '请输入位置编码' }]}
          >
            <Input disabled={!!editingLocation} placeholder="位置编码（用于扫码）" />
          </Form.Item>
          <Form.Item
            name="name"
            label="位置名称"
            rules={[{ required: true, message: '请输入位置名称' }]}
          >
            <Input placeholder="位置名称" />
          </Form.Item>
          <Form.Item name="area" label="区域">
            <Input placeholder="所属区域" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="位置描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

