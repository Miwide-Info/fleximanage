const Controller = require('./Controller');

class TokensController {
  constructor (Service) {
    this.service = Service;
  }

  async tokensGET (request, response) {
    // Add no-cache headers to prevent browser caching
    response.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'ETag': `"${Date.now()}"`,
      'Last-Modified': new Date().toUTCString()
    });
    await Controller.handleRequest(request, response, this.service.tokensGET);
  }

  // New endpoint to bypass browser cache completely
  async tokensRefreshGET (request, response) {
    // Add no-cache headers to prevent browser caching
    response.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'ETag': `"${Date.now()}"`,
      'Last-Modified': new Date().toUTCString()
    });
    await Controller.handleRequest(request, response, this.service.tokensGET);
  }

  async tokensIdDELETE (request, response) {
    await Controller.handleRequest(request, response, this.service.tokensIdDELETE);
  }

  async tokensIdGET (request, response) {
    await Controller.handleRequest(request, response, this.service.tokensIdGET);
  }

  async tokensIdPUT (request, response) {
    await Controller.handleRequest(request, response, this.service.tokensIdPUT);
  }

  async tokensPOST (request, response) {
    await Controller.handleRequest(request, response, this.service.tokensPOST);
  }
}

module.exports = TokensController;
