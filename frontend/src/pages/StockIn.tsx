import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, Button, message, Card, Space, Tag } from 'antd';
import { ScanOutlined, CheckOutlined } from '@ant-design/icons';
import { stockService, itemService, locationService } from '../services/api';

export default function StockIn() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
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

  const handleScanItem = async (code: string) => {
    try {
      const item = await itemService.getByCode(code);
      form.setFieldsValue({ item_id: item.id, item_code: item.code });
      message.success(`已扫描物品: ${item.name}`);
    } catch (error: any) {
      message.error('物品不存在，请先创建该物品');
    }
  };

  const handleScanLocation = async (code: string) => {
    try {
      const location = await locationService.getByCode(code);
      form.setFieldsValue({ location_id: location.id, location_code: location.code });
      message.success(`已扫描位置: ${location.name}`);
    } catch (error: any) {
      message.error('位置不存在，请先创建该位置');
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      if (scanMode && values.item_code && values.location_code) {
        // 扫码模式
        await stockService.stockInScan({
          item_code: values.item_code,
          location_code: values.location_code,
          quantity: values.quantity,
          supplier: values.supplier,
          batch_no: values.batch_no,
          remark: values.remark,
        });
      } else {
        // 普通模式
        await stockService.stockIn({
          item_id: values.item_id,
          location_id: values.location_id,
          quantity: values.quantity,
          supplier: values.supplier,
          batch_no: values.batch_no,
          remark: values.remark,
        });
      }
      message.success('入库成功');
      form.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.error || '入库失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1>入库操作</h1>
        <Space>
          <Tag color={scanMode ? 'blue' : 'default'}>
            {scanMode ? '扫码模式' : '手动模式'}
          </Tag>
          <Button
            icon={scanMode ? <CheckOutlined /> : <ScanOutlined />}
            onClick={() => {
              setScanMode(!scanMode);
              form.resetFields();
            }}
          >
            {scanMode ? '切换到手动模式' : '切换到扫码模式'}
          </Button>
        </Space>
      </div>

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {scanMode ? (
            <>
              <Form.Item
                name="item_code"
                label="物品编码（扫码）"
                rules={[{ required: true, message: '请扫描或输入物品编码' }]}
              >
                <Input
                  placeholder="使用扫码枪扫描物品编码"
                  onPressEnter={(e: any) => handleScanItem(e.target.value)}
                />
              </Form.Item>
              <Form.Item
                name="location_code"
                label="位置编码（扫码）"
                rules={[{ required: true, message: '请扫描或输入位置编码' }]}
              >
                <Input
                  placeholder="使用扫码枪扫描位置编码"
                  onPressEnter={(e: any) => handleScanLocation(e.target.value)}
                />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item
                name="item_id"
                label="物品"
                rules={[{ required: true, message: '请选择物品' }]}
              >
                <Select
                  showSearch
                  placeholder="选择物品"
                  optionFilterProp="children"
                  filterOption={(input, option: any) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={items.map((item) => ({
                    value: item.id,
                    label: `${item.code} - ${item.name}`,
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="location_id"
                label="位置"
                rules={[{ required: true, message: '请选择位置' }]}
              >
                <Select
                  showSearch
                  placeholder="选择位置"
                  optionFilterProp="children"
                  filterOption={(input, option: any) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={locations.map((loc) => ({
                    value: loc.id,
                    label: `${loc.code} - ${loc.name}`,
                  }))}
                />
              </Form.Item>
            </>
          )}

          <Form.Item
            name="quantity"
            label="数量"
            rules={[{ required: true, message: '请输入数量' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="入库数量" />
          </Form.Item>

          <Form.Item name="supplier" label="供应商">
            <Input placeholder="供应商名称（可选）" />
          </Form.Item>

          <Form.Item name="batch_no" label="批次号">
            <Input placeholder="批次号（可选）" />
          </Form.Item>

          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="备注信息（可选）" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              确认入库
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

