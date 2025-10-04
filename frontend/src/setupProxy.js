const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://flexi-backend:3443',
      changeOrigin: true,
      secure: false, // Bypass SSL certificate verification
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying request:', req.method, req.url);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('Proxy response:', proxyRes.statusCode, req.url);
      }
    })
  );
};