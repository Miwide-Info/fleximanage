// flexiWAN SD-WAN software - flexiEdge, flexiManage.
// For more information go to https://flexiwan.com
// Copyright (C) 2021  flexiWAN Ltd.

const compression = require('compression');

// Advanced compression middleware with optimized settings
const compressionMiddleware = compression({
  // Only compress responses that are larger than this threshold (in bytes)
  threshold: 1024,
  
  // Compression level (1-9, 6 is default)
  // Higher levels = better compression but more CPU usage
  level: 6,
  
  // Use zlib options for better performance
  windowBits: 15,
  memLevel: 8,
  
  // Custom filter function to determine what to compress
  filter: function (req, res) {
    // Don't compress if the request includes a cache-control directive 
    // to not transform the response
    if (req.headers['cache-control'] && req.headers['cache-control'].includes('no-transform')) {
      return false;
    }

    // Don't compress responses with this request header
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Compress text-based content types
    const contentType = res.getHeader('content-type');
    if (contentType) {
      const type = contentType.split(';')[0];
      const compressibleTypes = [
        'text/html',
        'text/css',
        'text/javascript',
        'text/plain',
        'text/xml',
        'application/json',
        'application/javascript',
        'application/xml',
        'application/rss+xml',
        'application/atom+xml',
        'image/svg+xml'
      ];
      
      return compressibleTypes.includes(type);
    }

    // Fall back to default compression filter
    return compression.filter(req, res);
  }
});

module.exports = compressionMiddleware;