import axios from 'axios';

// Smartly infer API base URL. Prevent Mixed Content errors when page is HTTPS but code still targets http://localhost:3000
function inferBaseURL () {
  // 1. Prefer explicit environment variable
  if (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim() !== '') {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  }
  // 2. In browser: use current origin + /api (backend serves /api on same origin)
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin.replace(/\/$/, '') + '/api';
  }
  // 3. Fallback: local development default
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
    // No response usually means: network down / CORS / Mixed Content / self-signed certificate rejected
    if (!error.response) {
      // Add diagnostic info to console
      // Avoid intrusive alert popups
      // eslint-disable-next-line no-console
      console.warn('[api] Network error (possibly CORS / Mixed Content / certificate) ->', {
        message: error.message,
        baseURL: api.defaults.baseURL,
        url: error.config?.url,
        httpsPage: typeof window !== 'undefined' ? window.location.protocol === 'https:' : undefined
      });
    } else if (error.response.status === 401) {
      // Redirect only if not already on login page to avoid loop
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