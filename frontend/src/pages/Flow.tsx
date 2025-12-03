import { useEffect, useState } from 'react';
import { Table, Select, DatePicker, Button, Space, Card } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { flowService, itemService, locationService } from '../services/api';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

interface FlowRecord {
  id: number;
  item_code: string;
  item_name: string;
  from_location_code?: string;
  from_location_name?: string;
  to_location_code?: string;
  to_location_name?: string;
  quantity: number;
  flow_type: string;
  operator_name: string;
  created_at: string;
  remark?: string;
}

export default function Flow() {
  const [flows, setFlows] = useState<FlowRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadFlows();
  }, [filters]);

  const loadData = async () => {
    try {
      const [itemsData, locationsData] = await Promise.all([
        itemService.getAll(),
        locationService.getAll(),
      ]);
      setItems(itemsData);
      setLocations(locationsData);
    } catch (error) {
      console.error('加载选项失败:', error);
    }
  };

  const loadFlows = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filters.item_id) params.item_id = filters.item_id;
      if (filters.location_id) params.location_id = filters.location_id;
      if (filters.flow_type) params.flow_type = filters.flow_type;
      if (filters.start_date) params.start_date = filters.start_date.format('YYYY-MM-DD');
      if (filters.end_date) params.end_date = filters.end_date.format('YYYY-MM-DD');

      const data = await flowService.getAll(params);
      setFlows(data);
    } catch (error: any) {
      console.error('加载流向记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadFlows();
  };

  const handleReset = () => {
    setFilters({});
  };

  const columns: ColumnsType<FlowRecord> = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
      width: 180,
    },
    {
      title: '物品',
      key: 'item',
      render: (_, record) => `${record.item_code} - ${record.item_name}`,
    },
    {
      title: '流向类型',
      dataIndex: 'flow_type',
      key: 'flow_type',
      render: (type) => {
        const typeMap: any = {
          in: '入库',
          out: '出库',
          transfer: '转移',
          borrow: '借出',
          return: '归还',
        };
        return typeMap[type] || type;
      },
    },
    {
      title: '从位置',
      key: 'from',
      render: (_, record) => record.from_location_name || '-',
    },
    {
      title: '到位置',
      key: 'to',
      render: (_, record) => record.to_location_name || '-',
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '操作人',
      dataIndex: 'operator_name',
      key: 'operator_name',
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
  ];

  return (
    <div>
      <h1>流向追踪</h1>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="选择物品"
            style={{ width: 200 }}
            allowClear
            showSearch
            value={filters.item_id}
            onChange={(value) => setFilters({ ...filters, item_id: value })}
            options={items.map((item) => ({
              value: item.id,
              label: `${item.code} - ${item.name}`,
            }))}
          />
          <Select
            placeholder="选择位置"
            style={{ width: 200 }}
            allowClear
            showSearch
            value={filters.location_id}
            onChange={(value) => setFilters({ ...filters, location_id: value })}
            options={locations.map((loc) => ({
              value: loc.id,
              label: `${loc.code} - ${loc.name}`,
            }))}
          />
          <Select
            placeholder="流向类型"
            style={{ width: 150 }}
            allowClear
            value={filters.flow_type}
            onChange={(value) => setFilters({ ...filters, flow_type: value })}
            options={[
              { value: 'in', label: '入库' },
              { value: 'out', label: '出库' },
              { value: 'transfer', label: '转移' },
              { value: 'borrow', label: '借出' },
              { value: 'return', label: '归还' },
            ]}
          />
          <DatePicker
            placeholder="开始日期"
            value={filters.start_date}
            onChange={(date) => setFilters({ ...filters, start_date: date })}
          />
          <DatePicker
            placeholder="结束日期"
            value={filters.end_date}
            onChange={(date) => setFilters({ ...filters, end_date: date })}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            查询
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={flows}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1200 }}
      />
    </div>
  );
}

