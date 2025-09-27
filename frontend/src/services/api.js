import axios from 'axios';

// 智能推断 API 基础地址，解决在 https 环境下仍指向 http://localhost:3000 导致浏览器 Mixed Content 拒绝的问题
function inferBaseURL () {
  // 1. 优先使用显式环境变量
  if (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim() !== '') {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  }
  // 2. 浏览器环境下：使用当前 origin + /api （后端已在同域暴露 /api 路径时适用）
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin.replace(/\/$/, '') + '/api';
  }
  // 3. 回退：开发本地默认
  return 'http://localhost:3000/api';
}

const api = axios.create({
  baseURL: inferBaseURL(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
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

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 没有 response 通常是：网络断开 / CORS / Mixed Content / self-signed 证书被拒（若未加 -k 或未受信）
    if (!error.response) {
      // 附加可诊断信息到控制台
      // 不使用 alert，保持无侵入
      // eslint-disable-next-line no-console
      console.warn('[api] Network error (可能是跨域 / Mixed Content / 证书) ->', {
        message: error.message,
        baseURL: api.defaults.baseURL,
        url: error.config?.url,
        httpsPage: typeof window !== 'undefined' ? window.location.protocol === 'https:' : undefined
      });
    } else if (error.response.status === 401) {
      // 仅当当前不是登录页时才跳转，避免登录页循环跳转
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export { inferBaseURL };

export default api;