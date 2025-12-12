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

type ApiPromise<T = any> = Promise<T>;

const apiGet = <T = any>(url: string, config?: any): ApiPromise<T> =>
  api.get(url, config) as ApiPromise<T>;
const apiPost = <T = any>(url: string, data?: any, config?: any): ApiPromise<T> =>
  api.post(url, data, config) as ApiPromise<T>;
const apiPut = <T = any>(url: string, data?: any): ApiPromise<T> =>
  api.put(url, data) as ApiPromise<T>;
const apiDelete = <T = any>(url: string): ApiPromise<T> =>
  api.delete(url) as ApiPromise<T>;

export const dashboardService = {
  getSummary: (): ApiPromise<any> => apiGet('/dashboard/summary'),
};

export const categoryService = {
  getAll: (): ApiPromise<any[]> => apiGet('/categories'),
  create: (data: any): ApiPromise<any> => apiPost('/categories', data),
  update: (id: number, data: any): ApiPromise<any> => apiPut(`/categories/${id}`, data),
  remove: (id: number): ApiPromise<any> => apiDelete(`/categories/${id}`),
};

export const authService = {
  login: (username: string, password: string): ApiPromise<any> =>
    apiPost('/auth/login', { username, password }),
  register: (data: any): ApiPromise<any> => apiPost('/auth/register', data),
};

export const itemService = {
  getAll: (): ApiPromise<any[]> => apiGet('/items'),
  getByCode: (code: string): ApiPromise<any> => apiGet(`/items/code/${code}`),
  create: (data: any): ApiPromise<any> => apiPost('/items', data),
  update: (id: number, data: any): ApiPromise<any> => apiPut(`/items/${id}`, data),
  delete: (id: number): ApiPromise<any> => apiDelete(`/items/${id}`),
  importExcel: (file: File): ApiPromise<any> => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/items/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const locationService = {
  getAll: (): ApiPromise<any[]> => apiGet('/location'),
  getByCode: (code: string): ApiPromise<any> => apiGet(`/location/code/${code}`),
  create: (data: any): ApiPromise<any> => apiPost('/location', data),
  update: (id: number, data: any): ApiPromise<any> => apiPut(`/location/${id}`, data),
  delete: (id: number): ApiPromise<any> => apiDelete(`/location/${id}`),
};

export const stockService = {
  getAll: (params?: any): ApiPromise<any[]> => apiGet('/stock', { params }),
  getLowStock: (): ApiPromise<any[]> => apiGet('/stock/low-stock'),
  stockIn: (data: any): ApiPromise<any> => apiPost('/stock/in', data),
  stockOut: (data: any): ApiPromise<any> => apiPost('/stock/out', data),
  stockInScan: (data: any): ApiPromise<any> => apiPost('/stock/in/scan', data),
  stockOutScan: (data: any): ApiPromise<any> => apiPost('/stock/out/scan', data),
};

export const borrowService = {
  getAll: (): ApiPromise<any[]> => apiGet('/borrow'),
  borrow: (data: any): ApiPromise<any> => apiPost('/borrow/borrow', data),
  return: (data: any): ApiPromise<any> => apiPost('/borrow/return', data),
  borrowScan: (data: any): ApiPromise<any> => apiPost('/borrow/borrow/scan', data),
};

export const flowService = {
  getAll: (params?: any): ApiPromise<any[]> => apiGet('/flow', { params }),
  getByItem: (itemId: number): ApiPromise<any[]> => apiGet(`/flow/item/${itemId}`),
};

export const userService = {
  getAll: (): ApiPromise<any[]> => apiGet('/users'),
};

export const uploadService = {
  uploadImage: (file: File): ApiPromise<{ url: string }> => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export default api;

