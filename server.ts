import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADMIN_LOGIN_PATH = '/irfaner-dokan';
const VALID_UID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

// Server-side authorized owner emails (synchronized with firestore.rules isBootstrappedOwner)
const BOOTSTRAPPED_OWNER_EMAILS = new Set([
  'zadfoodsbd@gmail.com',
  'arafatsunnythree@gmail.com',
  'a.arafatsunny.s@gmail.com',
]);

interface FirebaseAppletConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId?: string;
}

function loadFirebaseConfig(): FirebaseAppletConfig {
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(raw) as FirebaseAppletConfig;
}

const firebaseConfig = loadFirebaseConfig();
const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId || '(default)';

type TokenLookupOutcome =
  | { status: 'ok'; uid: string; email: string; emailVerified: boolean }
  | { status: 'invalid' }
  | { status: 'unavailable' };

async function verifyFirebaseIdToken(idToken: string): Promise<TokenLookupOutcome> {
  if (!idToken || idToken.length > 8192) return { status: 'invalid' };

  const lookupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
    firebaseConfig.apiKey
  )}`;

  let response: globalThis.Response;
  try {
    response = await fetch(lookupUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
  } catch (err) {
    console.error('Identity Toolkit network error:', err);
    return { status: 'unavailable' };
  }

  if (response.status >= 500) {
    return { status: 'unavailable' };
  }

  if (!response.ok) {
    return { status: 'invalid' };
  }

  const payload = (await response.json()) as {
    users?: Array<{
      localId?: string;
      email?: string;
      emailVerified?: boolean;
      disabled?: boolean;
    }>;
  };

  const account = payload.users?.[0];
  if (!account || account.disabled || !account.localId || !VALID_UID_PATTERN.test(account.localId)) {
    return { status: 'invalid' };
  }

  return {
    status: 'ok',
    uid: account.localId,
    email: (account.email || '').trim(),
    emailVerified: Boolean(account.emailVerified),
  };
}

type FirestoreAdminCheckResult =
  | { status: 'authorized'; role: 'owner' | 'manager' | 'staff' }
  | { status: 'denied' }
  | { status: 'unavailable' };

async function checkStaffAdminInFirestore(
  uid: string,
  idToken: string
): Promise<FirestoreAdminCheckResult> {
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    firebaseConfig.projectId
  )}/databases/${encodeURIComponent(firestoreDatabaseId)}/documents`;

  const headers = {
    Authorization: `Bearer ${idToken}`,
  };

  try {
    // Check explicit /admins/{uid} record (firestore.rules allows owner/staff to get their own admin doc)
    const docUrl = `${baseUrl}/admins/${encodeURIComponent(uid)}?key=${encodeURIComponent(
      firebaseConfig.apiKey
    )}`;
    const docRes = await fetch(docUrl, { method: 'GET', headers });

    if (docRes.ok) {
      const docData = (await docRes.json()) as {
        fields?: { role?: { stringValue?: string } };
      };
      const roleVal = docData.fields?.role?.stringValue;
      if (roleVal === 'owner' || roleVal === 'manager' || roleVal === 'staff') {
        return { status: 'authorized', role: roleVal };
      }
      return { status: 'authorized', role: 'staff' };
    }

    if (docRes.status === 404 || docRes.status === 403) {
      return { status: 'denied' };
    }

    console.warn(`Firestore REST /admins/${uid} unexpected status: ${docRes.status}`);
    return { status: 'unavailable' };
  } catch (err) {
    console.warn('Firestore REST admin check error:', err);
    return { status: 'unavailable' };
  }
}

function applyAdminSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  const reqPath = req.path;
  if (
    reqPath === ADMIN_LOGIN_PATH ||
    reqPath.startsWith(`${ADMIN_LOGIN_PATH}/`) ||
    reqPath === '/admin' ||
    reqPath.startsWith('/admin/') ||
    reqPath.startsWith('/api/admin/')
  ) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
  }
  next();
}

async function startServer(): Promise<void> {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT) || 3000;

  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));
  app.use(applyAdminSecurityHeaders);

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // Server-side Admin Authentication & Role-Based Authorization verification
  app.post('/api/admin/verify', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization || '';
      if (!authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          authorized: false,
          error: 'Authentication token is required.',
        });
        return;
      }

      const idToken = authHeader.slice('Bearer '.length).trim();
      const lookup = await verifyFirebaseIdToken(idToken);

      if (lookup.status === 'unavailable') {
        res.status(503).json({
          authorized: false,
          fallbackToFirestoreSdk: true,
          error: 'Authentication verification service temporarily unavailable.',
        });
        return;
      }

      if (lookup.status !== 'ok') {
        res.status(401).json({
          authorized: false,
          error: 'Invalid or expired authentication session.',
        });
        return;
      }

      if (!lookup.emailVerified) {
        res.status(403).json({
          authorized: false,
          error: 'A verified email address is required for administrator access.',
        });
        return;
      }

      // 1. Server-verified owner check (email & emailVerified confirmed directly by Google Auth backend)
      if (BOOTSTRAPPED_OWNER_EMAILS.has(lookup.email.toLowerCase())) {
        res.status(200).json({
          authorized: true,
          uid: lookup.uid,
          email: lookup.email,
          role: 'owner',
        });
        return;
      }

      // 2. Owner-authorized manager/staff check in Firestore /admins/{uid}
      const staffCheck = await checkStaffAdminInFirestore(lookup.uid, idToken);
      if (staffCheck.status === 'authorized') {
        res.status(200).json({
          authorized: true,
          uid: lookup.uid,
          email: lookup.email,
          role: staffCheck.role,
        });
        return;
      }

      if (staffCheck.status === 'unavailable') {
        res.status(503).json({
          authorized: false,
          fallbackToFirestoreSdk: true,
          error: 'Unable to reach admin registry right now.',
        });
        return;
      }

      res.status(403).json({
        authorized: false,
        error: 'Access denied. This account does not have administrator privileges.',
      });
    } catch (error) {
      console.error('Admin verification failed:', error);
      res.status(503).json({
        authorized: false,
        fallbackToFirestoreSdk: true,
        error: 'Unable to verify administrator authorization right now.',
      });
    }
  });

  // Return JSON 404 for unknown API endpoints
  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    const indexHtmlPath = path.join(distDir, 'index.html');

    app.use(
      express.static(distDir, {
        index: false,
        maxAge: '1h',
      })
    );

    // SPA catch-all so private admin route (/irfaner-dokan), /admin, and storefront routes work after deployment
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(indexHtmlPath);
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(
      `ZAD Foods server running on http://0.0.0.0:${port} (${isProduction ? 'production' : 'development'})`
    );
  });
}

void startServer();
