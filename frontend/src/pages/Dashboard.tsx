import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Alert } from 'antd';
import { InboxOutlined, WarningOutlined, AppstoreOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { stockService } from '../services/api';
import type { ColumnsType } from 'antd/es/table';

interface LowStockItem {
  id: number;
  item_code: string;
  item_name: string;
  location_code: string;
  location_name: string;
  quantity: number;
  min_stock: number;
  shortage: number;
  unit: string;
}

export default function Dashboard() {
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalItems: 0,
    totalLocations: 0,
    lowStockCount: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const lowStockData = await stockService.getLowStock();
      setLowStock(lowStockData);
      setStats({
        totalItems: 0,
        totalLocations: 0,
        lowStockCount: lowStockData.length,
      });
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<LowStockItem> = [
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
      render: (value, record) => `${value} ${record.unit}`,
    },
    {
      title: '最低库存',
      dataIndex: 'min_stock',
      key: 'min_stock',
      render: (value, record) => `${value} ${record.unit}`,
    },
    {
      title: '缺口',
      dataIndex: 'shortage',
      key: 'shortage',
      render: (value) => (
        <span style={{ color: 'red', fontWeight: 'bold' }}>{value}</span>
      ),
    },
  ];

  return (
    <div>
      <h1>仪表盘</h1>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="低库存预警"
              value={stats.lowStockCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="物品总数"
              value={stats.totalItems}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="位置总数"
              value={stats.totalLocations}
              prefix={<EnvironmentOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="库存总量"
              value={0}
              prefix={<InboxOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {lowStock.length > 0 && (
        <Alert
          message="库存预警"
          description={`有 ${lowStock.length} 个物品库存不足，请及时补货！`}
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Card title="低库存物品列表">
        <Table
          columns={columns}
          dataSource={lowStock}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}

