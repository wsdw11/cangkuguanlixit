import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker, message, Space, Tag } from 'antd';
import { SwapOutlined, ScanOutlined } from '@ant-design/icons';
import { borrowService, itemService, locationService, userService } from '../services/api';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

interface BorrowRecord {
  id: number;
  item_code: string;
  item_name: string;
  location_code: string;
  location_name: string;
  quantity: number;
  borrower_name: string;
  type: string;
  status: string;
  borrow_date: string;
  expected_return_date?: string;
  actual_return_date?: string;
}

export default function Borrow() {
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [borrowModalVisible, setBorrowModalVisible] = useState(false);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [scanMode, setScanMode] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recordsData, itemsData, locationsData, usersData] = await Promise.all([
        borrowService.getAll(),
        itemService.getAll(),
        locationService.getAll(),
        userService.getAll(),
      ]);
      setRecords(recordsData);
      setItems(itemsData);
      setLocations(locationsData);
      setUsers(usersData);
    } catch (error: any) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBorrow = () => {
    form.resetFields();
    setBorrowModalVisible(true);
  };

  const handleReturn = (record: BorrowRecord) => {
    form.setFieldsValue({ record_id: record.id });
    setReturnModalVisible(true);
  };

  const handleBorrowSubmit = async (values: any) => {
    try {
      if (scanMode && values.item_code && values.location_code) {
        await borrowService.borrowScan({
          item_code: values.item_code,
          location_code: values.location_code,
          quantity: values.quantity,
          borrower_id: values.borrower_id,
          expected_return_date: values.expected_return_date?.format('YYYY-MM-DD'),
          remark: values.remark,
        });
      } else {
        await borrowService.borrow({
          item_id: values.item_id,
          location_id: values.location_id,
          quantity: values.quantity,
          borrower_id: values.borrower_id,
          expected_return_date: values.expected_return_date?.format('YYYY-MM-DD'),
          remark: values.remark,
        });
      }
      message.success('借出成功');
      setBorrowModalVisible(false);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.error || '借出失败');
    }
  };

  const handleReturnSubmit = async (values: any) => {
    try {
      await borrowService.return({
        record_id: values.record_id,
        remark: values.remark,
      });
      message.success('归还成功');
      setReturnModalVisible(false);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.error || '归还失败');
    }
  };

  const columns: ColumnsType<BorrowRecord> = [
    {
      title: '物品',
      key: 'item',
      render: (_, record) => `${record.item_code} - ${record.item_name}`,
    },
    {
      title: '位置',
      key: 'location',
      render: (_, record) => `${record.location_code} - ${record.location_name}`,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '借用人',
      dataIndex: 'borrower_name',
      key: 'borrower_name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (type === 'borrow' ? '借出' : '归还'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap: any = {
          borrowed: { text: '已借出', color: 'orange' },
          returned: { text: '已归还', color: 'green' },
          overdue: { text: '逾期', color: 'red' },
        };
        const s = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '借出日期',
      dataIndex: 'borrow_date',
      key: 'borrow_date',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '预计归还',
      dataIndex: 'expected_return_date',
      key: 'expected_return_date',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        record.type === 'borrow' && record.status === 'borrowed' ? (
          <Button type="link" onClick={() => handleReturn(record)}>
            归还
          </Button>
        ) : null
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1>借还管理</h1>
        <Space>
          <Tag color={scanMode ? 'blue' : 'default'}>
            {scanMode ? '扫码模式' : '手动模式'}
          </Tag>
          <Button
            icon={<ScanOutlined />}
            onClick={() => setScanMode(!scanMode)}
          >
            {scanMode ? '切换到手动模式' : '切换到扫码模式'}
          </Button>
          <Button type="primary" icon={<SwapOutlined />} onClick={handleBorrow}>
            借出物品
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={records}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title="借出物品"
        open={borrowModalVisible}
        onOk={() => form.submit()}
        onCancel={() => setBorrowModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleBorrowSubmit}>
          {scanMode ? (
            <>
              <Form.Item
                name="item_code"
                label="物品编码（扫码）"
                rules={[{ required: true }]}
              >
                <Input placeholder="扫描物品编码" />
              </Form.Item>
              <Form.Item
                name="location_code"
                label="位置编码（扫码）"
                rules={[{ required: true }]}
              >
                <Input placeholder="扫描位置编码" />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item name="item_id" label="物品" rules={[{ required: true }]}>
                <Select
                  showSearch
                  options={items.map((item) => ({
                    value: item.id,
                    label: `${item.code} - ${item.name}`,
                  }))}
                />
              </Form.Item>
              <Form.Item name="location_id" label="位置" rules={[{ required: true }]}>
                <Select
                  showSearch
                  options={locations.map((loc) => ({
                    value: loc.id,
                    label: `${loc.code} - ${loc.name}`,
                  }))}
                />
              </Form.Item>
            </>
          )}
          <Form.Item name="quantity" label="数量" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="borrower_id" label="借用人" rules={[{ required: true }]}>
            <Select
              showSearch
              options={users.map((user) => ({
                value: user.id,
                label: `${user.name} (${user.username})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="expected_return_date" label="预计归还日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="归还物品"
        open={returnModalVisible}
        onOk={() => form.submit()}
        onCancel={() => setReturnModalVisible(false)}
      >
        <Form form={form} layout="vertical" onFinish={handleReturnSubmit}>
          <Form.Item name="record_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

