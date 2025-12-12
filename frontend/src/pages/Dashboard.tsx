import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Alert, Progress, List, Typography } from 'antd';
import { InboxOutlined, WarningOutlined, AppstoreOutlined, EnvironmentOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { stockService, dashboardService } from '../services/api';
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

interface DashboardSummary {
  totalItems: number;
  totalLocations: number;
  totalStockQuantity: number;
  lowStockCount: number;
  categoryStats: {
    category: string;
    item_count: number;
    total_quantity: number;
  }[];
  inOutTrend: {
    date: string;
    stock_in_qty: number;
    stock_out_qty: number;
  }[];
}

export default function Dashboard() {
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary>({
    totalItems: 0,
    totalLocations: 0,
    totalStockQuantity: 0,
    lowStockCount: 0,
    categoryStats: [],
    inOutTrend: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [lowStockData, summaryData] = await Promise.all([
        stockService.getLowStock(),
        dashboardService.getSummary(),
      ]);

      setLowStock(lowStockData);
      setSummary(summaryData);
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
              value={summary.lowStockCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="物品总数"
              value={summary.totalItems}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="位置总数"
              value={summary.totalLocations}
              prefix={<EnvironmentOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="库存总量"
              value={summary.totalStockQuantity}
              prefix={<InboxOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {lowStock.length > 0 && (
        <Alert
          message="库存预警"
          description={`有 ${summary.lowStockCount} 个物品库存不足，请及时补货！`}
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="近30天入库/出库趋势">
            {summary.inOutTrend.length === 0 ? (
              <div>暂无数据</div>
            ) : (
              <List
                size="small"
                dataSource={summary.inOutTrend.slice(-14)}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <span style={{ color: '#52c41a' }} key="in">
                        <ArrowUpOutlined /> 入 {item.stock_in_qty || 0}
                      </span>,
                      <span style={{ color: '#fa541c' }} key="out">
                        <ArrowDownOutlined /> 出 {item.stock_out_qty || 0}
                      </span>,
                    ]}
                  >
                    <List.Item.Meta
                      title={<Typography.Text>{item.date}</Typography.Text>}
                      description={
                        <Progress
                          percent={
                            item.stock_in_qty + item.stock_out_qty > 0
                              ? Math.min(
                                  100,
                                  Math.round(
                                    (item.stock_in_qty /
                                      Math.max(item.stock_in_qty + item.stock_out_qty, 1)) *
                                      100
                                  )
                                )
                              : 0
                          }
                          format={() =>
                            `入:${item.stock_in_qty || 0} / 出:${item.stock_out_qty || 0}`
                          }
                        />
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="快速提示" bodyStyle={{ minHeight: 180 }}>
            <p>• 关注低库存物品，及时补货。</p>
            <p>• 完善品牌/型号/规格/SN，方便定位设备。</p>
            <p>• 借还/领用时拍照上传，留存证据。</p>
            <p>• 导入/导出 Excel 便于批量维护与备份。</p>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="分类统计">
            {summary.categoryStats.length === 0 ? (
              <div>暂无分类数据</div>
            ) : (
              <List
                dataSource={summary.categoryStats}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`${item.category}（${item.item_count} 种物品）`}
                      description={
                        <Progress
                          percent={
                            summary.totalStockQuantity
                              ? parseFloat(
                                  ((item.total_quantity / summary.totalStockQuantity) * 100).toFixed(1)
                                )
                              : 0
                          }
                          format={(percent) =>
                            `${item.total_quantity} 件${percent ? ` (${percent}%)` : ''}`
                          }
                        />
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="低库存物品列表">
            <Table
              columns={columns}
              dataSource={lowStock}
              loading={loading}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ x: 700 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

