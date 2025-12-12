import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout as AntLayout,
  Menu,
  Avatar,
  Dropdown,
  Space,
  Button,
  Grid,
} from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  InboxOutlined,
  ExportOutlined,
  EnvironmentOutlined,
  SwapOutlined,
  FileTextOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import type { MenuProps } from 'antd';
import { useMemo, useState } from 'react';

const { Header, Sider, Content } = AntLayout;

const menuItems: MenuProps['items'] = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: '/items',
    icon: <AppstoreOutlined />,
    label: '物品管理',
  },
  {
    key: '/stock',
    icon: <InboxOutlined />,
    label: '库存管理',
  },
  {
    key: '/stock-in',
    icon: <InboxOutlined />,
    label: '入库操作',
  },
  {
    key: '/stock-out',
    icon: <ExportOutlined />,
    label: '出库操作',
  },
  {
    key: '/locations',
    icon: <EnvironmentOutlined />,
    label: '位置管理',
  },
  {
    key: '/borrow',
    icon: <SwapOutlined />,
    label: '借还管理',
  },
  {
    key: '/flow',
    icon: <FileTextOutlined />,
    label: '流向追踪',
  },
  {
    key: '/users',
    icon: <UserOutlined />,
    label: '用户管理',
  },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const screens = Grid.useBreakpoint();
  const isMobile = useMemo(() => !screens.md, [screens]);
  const [collapsed, setCollapsed] = useState(true);

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    if (isMobile) setCollapsed(true);
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        theme="dark"
        width={200}
        collapsible
        collapsed={isMobile ? collapsed : false}
        collapsedWidth={isMobile ? 0 : 80}
        breakpoint="md"
        onBreakpoint={(broken) => {
          if (broken) setCollapsed(true);
        }}
        onCollapse={(value) => setCollapsed(value)}
        style={{
          position: isMobile ? 'fixed' : 'relative',
          zIndex: 1000,
          height: '100vh',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 18,
            fontWeight: 'bold',
          }}
        >
          仓库管理系统
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <AntLayout
        style={{
          marginLeft: isMobile ? 0 : 200,
          transition: 'margin-left 0.2s ease',
        }}
      >
        <Header
          style={{
            background: '#fff',
            padding: '0 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: isMobile ? 'sticky' : 'relative',
            top: 0,
            zIndex: 999,
          }}
        >
          {isMobile ? (
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
          ) : (
            <div />
          )}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.name || user?.username}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content
          style={{
            margin: isMobile ? '12px' : '24px',
            background: '#fff',
            padding: isMobile ? 12 : 24,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}

