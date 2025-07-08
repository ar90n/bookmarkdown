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
      // Serve static assets
      const response = await env.ASSETS.fetch(request);
      
      // If asset not found (404), serve index.html for SPA routing
      if (response.status === 404) {
        const url = new URL(request.url);
        // Serve index.html for all routes (SPA behavior)
        const indexRequest = new Request(`${url.origin}/index.html`, request);
        return env.ASSETS.fetch(indexRequest);
      }
      
      return response;
    } catch (error) {
      return new Response('Internal Server Error', { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;