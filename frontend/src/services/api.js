import axios from 'axios';

// Smartly infer API base URL. Prevent Mixed Content errors when page is HTTPS but code still targets http://localhost:3000
function inferBaseURL () {
  // 1. Prefer explicit environment variable
  if (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim() !== '') {
    console.log('[api] Using environment variable API URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  }
  
  // Force relative path for development to use proxy
  console.log('[api] Using relative path /api for proxy');
  return '/api';
}

const api = axios.create({
  baseURL: inferBaseURL(),
  timeout: 30000, // Increased timeout for HTTPS proxy
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add debug logging
console.log('[api] API configuration:', {
  baseURL: api.defaults.baseURL,
  timeout: api.defaults.timeout,
  NODE_ENV: process.env.NODE_ENV
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