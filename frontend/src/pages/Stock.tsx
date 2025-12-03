import { useEffect, useState } from 'react';
import { Table, Input, Space, Tag, Alert } from 'antd';
import { stockService } from '../services/api';
import type { ColumnsType } from 'antd/es/table';

interface StockItem {
  id: number;
  item_code: string;
  item_name: string;
  location_code: string;
  location_name: string;
  quantity: number;
  unit: string;
  min_stock: number;
  is_low_stock: number;
}

export default function Stock() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadStock();
  }, []);

  const loadStock = async () => {
    setLoading(true);
    try {
      const data = await stockService.getAll();
      setStock(data);
    } catch (error: any) {
      console.error('加载库存失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStock = stock.filter(
    (item) =>
      item.item_code.toLowerCase().includes(searchText.toLowerCase()) ||
      item.item_name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.location_name.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns: ColumnsType<StockItem> = [
    {
      title: '物品编码',
      dataIndex: 'item_code',
      key: 'item_code',
    },
    {
      title: '物品名称',
      dataIndex: 'item_name',
      key: 'item_name',
    },
    {
      title: '位置',
      dataIndex: 'location_name',
      key: 'location_name',
    },
    {
      title: '当前库存',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (value, record) => (
        <span style={{ fontWeight: 'bold' }}>
          {value} {record.unit}
        </span>
      ),
    },
    {
      title: '最低库存',
      dataIndex: 'min_stock',
      key: 'min_stock',
      render: (value, record) => `${value} ${record.unit}`,
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => {
        if (record.is_low_stock) {
          return <Tag color="red">库存不足</Tag>;
        }
        return <Tag color="green">正常</Tag>;
      },
    },
  ];

  const lowStockCount = stock.filter((item) => item.is_low_stock).length;

  return (
    <div>
      <h1>库存管理</h1>

      {lowStockCount > 0 && (
        <Alert
          message="库存预警"
          description={`有 ${lowStockCount} 个物品库存不足，请及时补货！`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索物品编码、名称或位置"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
      </Space>

      <Table
        columns={columns}
        dataSource={filteredStock}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
      />
    </div>
  );
}

