import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, message, Popconfirm, Space, Divider, Upload, TreeSelect } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { itemService, categoryService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

interface Item {
  id: number;
  code: string;
  name: string;
  category?: string;
  category_id?: number | null;
  unit: string;
  min_stock: number;
  description?: string;
  brand?: string;
  model?: string;
  spec?: string;
  remark?: string;
}

export default function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const defaultUnits = ['个', '件', '米', '卷', '台', '套', '箱'];
  const [unitOptions, setUnitOptions] = useState(defaultUnits);
  const [newUnit, setNewUnit] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [form] = Form.useForm();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isWarehouse = user?.role === 'warehouse';

  useEffect(() => {
    loadItems();
    loadCategories();
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const unitsFromItems = Array.from(
      new Set(items.map((item) => item.unit).filter((u): u is string => !!u))
    );
    setUnitOptions((prev) => Array.from(new Set([...prev, ...unitsFromItems])));
  }, [items]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await itemService.getAll();
      setItems(data);
    } catch (error: any) {
      message.error('加载物品列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await categoryService.getAll();
      setCategories(data);
    } catch (error) {
      // ignore
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({ unit: '个', min_stock: 0 });
    setModalVisible(true);
  };

  const handleEdit = (record: Item) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await itemService.delete(id);
      message.success('删除成功');
      loadItems();
    } catch (error: any) {
      message.error('删除失败');
    }
  };

  const handleAddUnit = () => {
    const value = newUnit.trim();
    if (value && !unitOptions.includes(value)) {
      setUnitOptions((prev) => [...prev, value]);
      form.setFieldsValue({ unit: value });
    }
    setNewUnit('');
  };

  const handleDownloadTemplate = () => {
    // 创建模板数据
    const templateData = [
      {
        '物品编码': 'ITEM001',
        '物品名称': '示例物品1',
        '分类': '设备/监控设备',
        '单位': '台',
        '最低库存': 10,
        '品牌': '海康',
        '型号': 'DS-2CD3T25',
        '规格': '2MP枪机',
        '描述': '这是示例物品的描述',
        '备注': '备注信息',
      },
      {
        '物品编码': 'ITEM002',
        '物品名称': '示例物品2',
        '分类': '线缆/网线',
        '单位': '米',
        '最低库存': 100,
        '品牌': '',
        '型号': '',
        '规格': '超五类',
        '描述': '',
        '备注': '',
      },
    ];

    // 创建工作表
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // 设置列宽
    const colWidths = [
      { wch: 15 }, // 物品编码
      { wch: 20 }, // 物品名称
      { wch: 25 }, // 分类
      { wch: 10 }, // 单位
      { wch: 12 }, // 最低库存
      { wch: 15 }, // 品牌
      { wch: 20 }, // 型号
      { wch: 20 }, // 规格
      { wch: 30 }, // 描述
      { wch: 30 }, // 备注
    ];
    ws['!cols'] = colWidths;

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '物品导入模板');

    // 下载文件
    XLSX.writeFile(wb, '物品导入模板.xlsx');
    message.success('模板下载成功');
  };

  const handleImport = async ({ file }: any) => {
    setImportLoading(true);
    try {
      await itemService.importExcel(file as File);
      message.success('导入完成');
      loadItems();
      loadCategories();
    } catch (error: any) {
      message.error(error.response?.data?.error || '导入失败');
    } finally {
      setImportLoading(false);
    }
    return false;
  };

  const handleExport = () => {
    if (!items.length) {
      message.warning('暂无可导出的数据');
      return;
    }
    const data = items.map((item) => ({
      物品编码: item.code,
      物品名称: item.name,
      分类: item.category || '',
      品牌: item.brand || '',
      型号: item.model || '',
      规格: item.spec || '',
      单位: item.unit,
      最低库存: item.min_stock,
      描述: item.description || '',
      备注: item.remark || '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '物品列表');
    XLSX.writeFile(workbook, `物品列表_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingItem) {
        await itemService.update(editingItem.id, values);
        message.success('更新成功');
      } else {
        await itemService.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadItems();
    } catch (error: any) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  const categoryTree = (() => {
    const map: Record<number, any> = {};
    categories.forEach((c) => (map[c.id] = { ...c, children: [] }));
    const roots: any[] = [];
    categories.forEach((c) => {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].children.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });
    return roots;
  })();

  const categoryLabelMap = categories.reduce((acc, cur) => {
    acc[cur.id] = cur.name;
    return acc;
  }, {} as Record<number, string>);

  const columns: ColumnsType<Item> = [
    {
      title: '物品编码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '物品名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (_, record) => record.category || (record.category_id ? categoryLabelMap[record.category_id] : ''),
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
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
    },
    {
      title: '最低库存',
      dataIndex: 'min_stock',
      key: 'min_stock',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          {(isAdmin || isWarehouse) && (
            <>
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                编辑
              </Button>
              <Popconfirm
                title="确定要删除这个物品吗？"
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h1>物品管理</h1>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
            下载模板
          </Button>
          <Upload
            accept=".xlsx,.xls"
            beforeUpload={(file) => handleImport({ file })}
            showUploadList={false}
            disabled={importLoading}
          >
            <Button loading={importLoading} icon={<UploadOutlined />}>导入Excel</Button>
          </Upload>
          <Button onClick={handleExport}>导出Excel</Button>
          {(isAdmin || isWarehouse) && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增物品
            </Button>
          )}
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={items}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        scroll={{ x: 900 }}
      />

      <Modal
        title={editingItem ? '编辑物品' : '新增物品'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="code"
            label="物品编码"
            rules={[{ required: true, message: '请输入物品编码' }]}
          >
            <Input disabled={!!editingItem} placeholder="物品编码（用于扫码）" />
          </Form.Item>
          <Form.Item
            name="name"
            label="物品名称"
            rules={[{ required: true, message: '请输入物品名称' }]}
          >
            <Input placeholder="物品名称" />
          </Form.Item>
          <Form.Item name="category_id" label="分类">
            <TreeSelect
              allowClear
              showSearch
              placeholder="选择分类"
              treeDefaultExpandAll
              treeData={categoryTree.map((c) => ({
                title: c.name,
                value: c.id,
                children: c.children?.map((child: any) => ({
                  title: child.name,
                  value: child.id,
                  children: child.children?.map((n: any) => ({
                    title: n.name,
                    value: n.id,
                  })),
                })),
              }))}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item name="unit" label="单位" initialValue="个">
            <Select
              showSearch
              options={unitOptions.map((unit) => ({ value: unit, label: unit }))}
              placeholder="选择或新增单位"
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', gap: 8, padding: '0 8px 4px' }}>
                    <Input
                      placeholder="新增单位"
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      onPressEnter={handleAddUnit}
                    />
                    <Button type="link" onClick={handleAddUnit}>
                      添加
                    </Button>
                  </div>
                </>
              )}
            />
          </Form.Item>
          <Form.Item name="min_stock" label="最低库存" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="brand" label="品牌">
            <Input placeholder="品牌，例如：海康、大华" />
          </Form.Item>
          <Form.Item name="model" label="型号">
            <Input placeholder="型号，例如：DS-2CD3T25" />
          </Form.Item>
          <Form.Item name="spec" label="规格">
            <Input placeholder="规格、参数，例如：2MP枪机、8口千兆" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="物品描述" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

