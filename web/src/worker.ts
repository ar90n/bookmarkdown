/**
 * Cloudflare Worker for BookMarkDown Web Application
 * Serves static assets for the React SPA
 */

export interface Env {
  ASSETS: Fetcher;
  ENVIRONMENT: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      
      // Force HTTPS redirect for production (except for localhost)
      if (url.protocol === 'http:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        url.protocol = 'https:';
        return Response.redirect(url.toString(), 301);
      }
      
      // Serve static assets
      const response = await env.ASSETS.fetch(request);
      
      // If asset not found (404), serve index.html for SPA routing
      if (response.status === 404) {
        // Preserve query parameters when serving index.html
        const indexUrl = new URL(url);
        indexUrl.pathname = '/index.html';
        const indexRequest = new Request(indexUrl.toString(), request);
        
        const indexResponse = await env.ASSETS.fetch(indexRequest);
        
        // Add security headers
        const headers = new Headers(indexResponse.headers);
        headers.set('X-Content-Type-Options', 'nosniff');
        headers.set('X-Frame-Options', 'DENY');
        headers.set('X-XSS-Protection', '1; mode=block');
        headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        return new Response(indexResponse.body, {
          status: indexResponse.status,
          statusText: indexResponse.statusText,
          headers
        });
      }
      
      return response;
    } catch (error) {
      return new Response('Internal Server Error', { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;