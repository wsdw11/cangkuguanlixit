import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, Button, message, Card, Space, Tag, DatePicker, Upload } from 'antd';
import { ScanOutlined, CheckOutlined, UploadOutlined, CameraOutlined } from '@ant-design/icons';
import { stockService, itemService, locationService, uploadService } from '../services/api';
import CameraScanner from '../components/CameraScanner';

export default function StockIn() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanTarget, setScanTarget] = useState<'item_code' | 'location_code'>('item_code');

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
    const businessDate = values.business_date ? values.business_date.format('YYYY-MM-DD') : undefined;
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
          business_date: businessDate,
          brand: values.brand,
          model: values.model,
          spec: values.spec,
          serial_no: values.serial_no,
          photo_url: values.photo_url,
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
          business_date: businessDate,
          brand: values.brand,
          model: values.model,
          spec: values.spec,
          serial_no: values.serial_no,
          photo_url: values.photo_url,
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

  const handleUpload = async ({ file }: any) => {
    setUploading(true);
    try {
      const res = await uploadService.uploadImage(file as File);
      form.setFieldsValue({ photo_url: res.url });
      message.success('上传成功');
    } catch (error: any) {
      message.error(error.response?.data?.error || '上传失败');
    } finally {
      setUploading(false);
    }
    return false;
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
                  placeholder="使用扫码枪或摄像头扫描物品编码"
                  onPressEnter={(e: any) => handleScanItem(e.target.value)}
                  addonAfter={
                    <Button
                      type="link"
                      icon={<CameraOutlined />}
                      onClick={() => {
                        setScanTarget('item_code');
                        setScanModalOpen(true);
                      }}
                    />
                  }
                />
              </Form.Item>
              <Form.Item
                name="location_code"
                label="位置编码（扫码）"
                rules={[{ required: true, message: '请扫描或输入位置编码' }]}
              >
                <Input
                  placeholder="使用扫码枪或摄像头扫描位置编码"
                  onPressEnter={(e: any) => handleScanLocation(e.target.value)}
                  addonAfter={
                    <Button
                      type="link"
                      icon={<CameraOutlined />}
                      onClick={() => {
                        setScanTarget('location_code');
                        setScanModalOpen(true);
                      }}
                    />
                  }
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

          <Form.Item name="brand" label="品牌">
            <Input placeholder="品牌，例如：海康、大华" />
          </Form.Item>
          <Form.Item name="model" label="型号">
            <Input placeholder="型号，例如：DS-2CD3T25" />
          </Form.Item>
          <Form.Item name="spec" label="规格">
            <Input placeholder="规格、参数，例如：2MP枪机、8口千兆" />
          </Form.Item>
          <Form.Item name="serial_no" label="序列号/SN">
            <Input placeholder="序列号（可选）" />
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

          <Form.Item name="business_date" label="入库日期">
            <DatePicker style={{ width: '100%' }} placeholder="不选则默认为今天" />
          </Form.Item>

          <Form.Item name="photo_url" label="照片">
            <Upload
              accept="image/*"
              beforeUpload={(file) => handleUpload({ file })}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />} loading={uploading}>上传/拍照</Button>
            </Upload>
            {form.getFieldValue('photo_url') && (
              <div style={{ marginTop: 8 }}>
                <img src={form.getFieldValue('photo_url')} alt="preview" style={{ width: 120 }} />
              </div>
            )}
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              确认入库
            </Button>
          </Form.Item>
        </Form>
      </Card>
      <CameraScanner
        visible={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        title={scanTarget === 'item_code' ? '扫描物品编码' : '扫描位置编码'}
        onResult={(text) => {
          if (scanTarget === 'item_code') {
            form.setFieldsValue({ item_code: text });
            handleScanItem(text);
          } else {
            form.setFieldsValue({ location_code: text });
            handleScanLocation(text);
          }
        }}
      />
    </div>
  );
}

