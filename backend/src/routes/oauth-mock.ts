/**
 * Mock OAuth Consent Handler
 *
 * Renders a simulated OAuth authorization screen in development/testing mode
 * and redirects back to the OAuth callback handler with a mock authorization code.
 */

import { Router, type Request, type Response } from 'express';

export const oauthMockRouter = Router();

oauthMockRouter.get('/oauth-mock', (req: Request, res: Response) => {
  const { platform, state } = req.query;

  const mockCode = `mock_code_${Date.now()}`;
  const callbackUrl = `/api/auth/oauth/callback?code=${mockCode}&state=${encodeURIComponent(String(state))}`;

  // Auto-redirect or render simple mock consent page
  res.send(`
    <!Root html>
    <html>
      <head>
        <title>Mock ${platform} OAuth Authorization</title>
        <style>
          body { font-family: system-ui, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .btn { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; margin-top: 20px; }
          .platform { color: #4f46e5; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Simulated OAuth Authorization</h2>
          <p>AdSync Development Mode is requesting access to your <span class="platform">${platform} Ads</span> account.</p>
          <a href="${callbackUrl}" class="btn">Grant Consent & Connect</a>
        </div>
      </body>
    </html>
  `);
});
