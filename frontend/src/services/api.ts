import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// 请求拦截器 - 添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  register: (data: any) => api.post('/auth/register', data),
};

export const itemService = {
  getAll: () => api.get('/items'),
  getByCode: (code: string) => api.get(`/items/code/${code}`),
  create: (data: any) => api.post('/items', data),
  update: (id: number, data: any) => api.put(`/items/${id}`, data),
  delete: (id: number) => api.delete(`/items/${id}`),
};

export const locationService = {
  getAll: () => api.get('/location'),
  getByCode: (code: string) => api.get(`/location/code/${code}`),
  create: (data: any) => api.post('/location', data),
  update: (id: number, data: any) => api.put(`/location/${id}`, data),
  delete: (id: number) => api.delete(`/location/${id}`),
};

export const stockService = {
  getAll: () => api.get('/stock'),
  getLowStock: () => api.get('/stock/low-stock'),
  stockIn: (data: any) => api.post('/stock/in', data),
  stockOut: (data: any) => api.post('/stock/out', data),
  stockInScan: (data: any) => api.post('/stock/in/scan', data),
  stockOutScan: (data: any) => api.post('/stock/out/scan', data),
};

export const borrowService = {
  getAll: () => api.get('/borrow'),
  borrow: (data: any) => api.post('/borrow/borrow', data),
  return: (data: any) => api.post('/borrow/return', data),
  borrowScan: (data: any) => api.post('/borrow/borrow/scan', data),
};

export const flowService = {
  getAll: (params?: any) => api.get('/flow', { params }),
  getByItem: (itemId: number) => api.get(`/flow/item/${itemId}`),
};

export const userService = {
  getAll: () => api.get('/users'),
};

export default api;

