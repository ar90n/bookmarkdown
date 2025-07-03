/*
 * Copyright 2024 BookMarkDown Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ALLOWED_ORIGINS: string;
}

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface AuthTokens {
  accessToken: string;
  tokenType: string;
  scope: string;
  expiresAt: string;
}

interface AuthResponse {
  user: GitHubUser;
  tokens: AuthTokens;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('origin');
    
    // CORS handling
    const corsHeaders = getCorsHeaders(origin, env.ALLOWED_ORIGINS);
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      switch (url.pathname) {
        case '/auth/github':
          return handleGitHubAuth(request, env);
        
        case '/auth/callback':
          return handleAuthCallback(request, env);
        
        case '/auth/refresh':
          return handleTokenRefresh(request, env);
        
        case '/auth/revoke':
          return handleTokenRevoke(request, env);
        
        default:
          return new Response('Not Found', { 
            status: 404,
            headers: corsHeaders 
          });
      }
    } catch (error) {
      console.error('OAuth service error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};

function getCorsHeaders(origin: string | null, allowedOrigins: string): Record<string, string> {
  const origins = allowedOrigins.split(',').map(o => o.trim());
  const isAllowed = origin && origins.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : origins[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  };
}

async function handleGitHubAuth(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const redirectUri = url.searchParams.get('redirect_uri');
  const state = url.searchParams.get('state');
  
  if (!redirectUri || !state) {
    return new Response(JSON.stringify({ 
      error: 'Missing required parameters',
      message: 'redirect_uri and state parameters are required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Generate GitHub OAuth URL
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  githubAuthUrl.searchParams.set('redirect_uri', `${url.origin}/auth/callback`);
  githubAuthUrl.searchParams.set('scope', 'gist user:email');
  githubAuthUrl.searchParams.set('state', `${state}:${encodeURIComponent(redirectUri)}`);

  return Response.redirect(githubAuthUrl.toString(), 302);
}

async function handleAuthCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  
  if (error) {
    return new Response(JSON.stringify({ 
      error: 'GitHub OAuth error',
      message: error
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!code || !state) {
    return new Response(JSON.stringify({ 
      error: 'Missing authorization code or state'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Parse state to get original redirect URI
    const [originalState, redirectUri] = state.split(':', 2);
    const decodedRedirectUri = decodeURIComponent(redirectUri);

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'BookMarkDown-OAuth/1.0.0'
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${url.origin}/auth/callback`
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
    }

    const tokenData: GitHubTokenResponse = await tokenResponse.json();

    // Get user information
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'BookMarkDown-OAuth/1.0.0'
      }
    });

    if (!userResponse.ok) {
      throw new Error(`User info fetch failed: ${userResponse.statusText}`);
    }

    const userData: GitHubUser = await userResponse.json();

    // Create auth response
    const authResponse: AuthResponse = {
      user: userData,
      tokens: {
        accessToken: tokenData.access_token,
        tokenType: tokenData.token_type,
        scope: tokenData.scope,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 hours
      }
    };

    // Redirect back to client with auth data
    const finalRedirectUrl = new URL(decodedRedirectUri);
    finalRedirectUrl.searchParams.set('auth', btoa(JSON.stringify(authResponse)));
    finalRedirectUrl.searchParams.set('state', originalState);

    return Response.redirect(finalRedirectUrl.toString(), 302);

  } catch (error) {
    console.error('Auth callback error:', error);
    return new Response(JSON.stringify({ 
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleTokenRefresh(request: Request, _env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // For GitHub tokens, we don't have refresh tokens
  // This endpoint would validate the current token and return user info
  try {
    const body = await request.json() as { accessToken: string };
    
    if (!body.accessToken) {
      return new Response(JSON.stringify({ 
        error: 'Missing access token'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate token with GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${body.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'BookMarkDown-OAuth/1.0.0'
      }
    });

    if (!userResponse.ok) {
      return new Response(JSON.stringify({ 
        error: 'Invalid or expired token'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userData: GitHubUser = await userResponse.json();

    return new Response(JSON.stringify({
      user: userData,
      tokens: {
        accessToken: body.accessToken,
        tokenType: 'bearer',
        scope: 'gist user:email',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Token refresh failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleTokenRevoke(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await request.json() as { accessToken: string };
    
    if (!body.accessToken) {
      return new Response(JSON.stringify({ 
        error: 'Missing access token'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Revoke token with GitHub
    const revokeResponse = await fetch(`https://api.github.com/applications/${env.GITHUB_CLIENT_ID}/token`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${btoa(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`)}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'BookMarkDown-OAuth/1.0.0'
      },
      body: JSON.stringify({
        access_token: body.accessToken
      })
    });

    if (!revokeResponse.ok && revokeResponse.status !== 404) {
      throw new Error(`Token revocation failed: ${revokeResponse.statusText}`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Token revoked successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Token revocation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}