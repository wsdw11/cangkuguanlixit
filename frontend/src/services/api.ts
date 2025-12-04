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
  login: (username: string, password: string): Promise<any> =>
    api.post('/auth/login', { username, password }) as any,
  register: (data: any): Promise<any> =>
    api.post('/auth/register', data) as any,
};

export const itemService = {
  getAll: (): Promise<any[]> => api.get('/items') as any,
  getByCode: (code: string): Promise<any> =>
    api.get(`/items/code/${code}`) as any,
  create: (data: any): Promise<any> =>
    api.post('/items', data) as any,
  update: (id: number, data: any): Promise<any> =>
    api.put(`/items/${id}`, data) as any,
  delete: (id: number): Promise<any> =>
    api.delete(`/items/${id}`) as any,
};

export const locationService = {
  getAll: (): Promise<any[]> => api.get('/location') as any,
  getByCode: (code: string): Promise<any> =>
    api.get(`/location/code/${code}`) as any,
  create: (data: any): Promise<any> =>
    api.post('/location', data) as any,
  update: (id: number, data: any): Promise<any> =>
    api.put(`/location/${id}`, data) as any,
  delete: (id: number): Promise<any> =>
    api.delete(`/location/${id}`) as any,
};

export const stockService = {
  getAll: (): Promise<any[]> => api.get('/stock') as any,
  getLowStock: (): Promise<any[]> => api.get('/stock/low-stock') as any,
  stockIn: (data: any): Promise<any> =>
    api.post('/stock/in', data) as any,
  stockOut: (data: any): Promise<any> =>
    api.post('/stock/out', data) as any,
  stockInScan: (data: any): Promise<any> =>
    api.post('/stock/in/scan', data) as any,
  stockOutScan: (data: any): Promise<any> =>
    api.post('/stock/out/scan', data) as any,
};

export const borrowService = {
  getAll: (): Promise<any[]> => api.get('/borrow') as any,
  borrow: (data: any): Promise<any> =>
    api.post('/borrow/borrow', data) as any,
  return: (data: any): Promise<any> =>
    api.post('/borrow/return', data) as any,
  borrowScan: (data: any): Promise<any> =>
    api.post('/borrow/borrow/scan', data) as any,
};

export const flowService = {
  getAll: (params?: any): Promise<any[]> =>
    api.get('/flow', { params }) as any,
  getByItem: (itemId: number): Promise<any[]> =>
    api.get(`/flow/item/${itemId}`) as any,
};

export const userService = {
  getAll: (): Promise<any[]> => api.get('/users') as any,
};

export default api;

