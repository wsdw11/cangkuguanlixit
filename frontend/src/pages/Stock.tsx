import { useEffect, useState } from 'react';
import { Table, Input, Space, Tag, Alert, Button, message, Select } from 'antd';
import { stockService, categoryService } from '../services/api';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

interface StockItem {
  id: number;
  item_code: string;
  item_name: string;
  category?: string;
  category_id?: number | null;
  brand?: string;
  model?: string;
  spec?: string;
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
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [categories, setCategories] = useState<any[]>([]);
  const [typeTag, setTypeTag] = useState<string | undefined>();

  useEffect(() => {
    loadStock();
    loadCategories();
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

  const loadCategories = async () => {
    try {
      const data = await categoryService.getAll();
      setCategories(data);
    } catch (e) {
      // ignore
    }
  };

  const filteredStock = stock.filter((item) => {
    const keyword = searchText.trim().toLowerCase();
    if (keyword) {
      const hit =
        item.item_code?.toLowerCase().includes(keyword) ||
        item.item_name?.toLowerCase().includes(keyword) ||
        item.location_name?.toLowerCase().includes(keyword) ||
        item.category?.toLowerCase().includes(keyword) ||
        item.brand?.toLowerCase().includes(keyword) ||
        item.model?.toLowerCase().includes(keyword) ||
        item.spec?.toLowerCase().includes(keyword);
      if (!hit) return false;
    }
    if (categoryId && item.category_id !== categoryId) return false;
    if (typeTag) {
      const txt = `${item.category || ''}${item.item_name}${item.spec || ''}`.toLowerCase();
      if (!txt.includes(typeTag.toLowerCase())) return false;
    }
    return true;
  });

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
      title: '分类',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
    },
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: '规格',
      dataIndex: 'spec',
      key: 'spec',
      ellipsis: true,
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

  const handleExport = () => {
    if (!stock.length) {
      message.warning('暂无可导出的数据');
      return;
    }
    const data = stock.map((item) => ({
      物品编码: item.item_code,
      物品名称: item.item_name,
      分类: item.category || '',
      品牌: item.brand || '',
      型号: item.model || '',
      规格: item.spec || '',
      位置: item.location_name,
      当前库存: `${item.quantity} ${item.unit}`,
      最低库存: `${item.min_stock} ${item.unit}`,
      状态: item.is_low_stock ? '库存不足' : '正常',
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '库存列表');
    XLSX.writeFile(workbook, `库存列表_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
  };

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

      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <Input
          placeholder="搜索物品编码、名称或位置"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
        <Select
          allowClear
          placeholder="分类筛选"
          style={{ width: 180 }}
          value={categoryId}
          onChange={(v) => setCategoryId(v)}
          options={categories.map((c) => ({ label: c.name, value: c.id }))}
        />
        <Select
          allowClear
          placeholder="类型筛选"
          style={{ width: 160 }}
          value={typeTag}
          onChange={(v) => setTypeTag(v)}
          options={[
            { label: '设备', value: '设备' },
            { label: '线缆', value: '线缆' },
          ]}
        />
        <Button onClick={handleExport}>导出Excel</Button>
      </Space>

      <Table
        columns={columns}
        dataSource={filteredStock}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        scroll={{ x: 900 }}
      />
    </div>
  );
}

