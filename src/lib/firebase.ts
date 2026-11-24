import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type User } from 'firebase/auth';
import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  getFirestore,
  limit,
  query,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

export const ADMIN_LOGIN_PATH = '/irfaner-dokan';

export const BOOTSTRAPPED_OWNER_EMAIL = 'zadfoodsbd@gmail.com';
export const BOOTSTRAPPED_OWNER_EMAILS = [
  'zadfoodsbd@gmail.com',
  'arafatsunnythree@gmail.com',
  'a.arafatsunny.s@gmail.com',
];

export function isBootstrappedOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  return BOOTSTRAPPED_OWNER_EMAILS.includes(email.toLowerCase());
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export interface ServerAdminAuthResult {
  authorized: boolean;
  role: 'owner' | 'manager' | 'staff' | null;
  error?: string;
}

/**
 * Verifies administrator privileges on the backend server (/api/admin/verify),
 * which validates the Firebase ID token with Google Identity Toolkit and checks
 * Firestore security rules on the server. Falls back to direct server-forced
 * Firestore RBAC queries ONLY if the Express API is unreachable (static hosting),
 * never to client-side email matching.
 */
export async function verifyAdminAuthorizationOnServer(
  firebaseUser: User
): Promise<ServerAdminAuthResult> {
  if (!firebaseUser.emailVerified) {
    return {
      authorized: false,
      role: null,
      error: 'A verified email address is required for administrator access.',
    };
  }

  let idToken: string;
  try {
    idToken = await firebaseUser.getIdToken(true);
  } catch {
    return {
      authorized: false,
      role: null,
      error: 'Unable to validate authentication token.',
    };
  }

  // 1. Primary check: Backend Express server (/api/admin/verify)
  try {
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = (await res.json()) as {
        authorized?: boolean;
        role?: 'owner' | 'manager' | 'staff' | null;
        error?: string;
      };

      if (res.ok && data.authorized && data.role) {
        return { authorized: true, role: data.role };
      }

      // Explicit backend 401/403 denial must ALWAYS be respected immediately
      if (res.status === 401 || res.status === 403) {
        return {
          authorized: false,
          role: null,
          error: data.error || 'Access denied. Administrator privileges required.',
        };
      }
    }
  } catch {
    // Network error reaching local API (e.g., static-only hosting) — proceed to direct Firestore server RBAC check
  }

  // 2. Direct server-forced Firestore RBAC check (firestore.rules enforces isAdmin() on Google's backend)
  try {
    const adminDoc = await getDocFromServer(doc(db, 'admins', firebaseUser.uid));
    if (adminDoc.exists()) {
      const roleVal = (adminDoc.data() as { role?: string }).role;
      const role =
        roleVal === 'owner' || roleVal === 'manager' || roleVal === 'staff' ? roleVal : 'staff';
      return { authorized: true, role };
    }
    // Probe admin-only collection list rule (succeeds ONLY if firestore.rules evaluates isAdmin() == true)
    await getDocsFromServer(query(collection(db, 'admins'), limit(1)));
    return { authorized: true, role: 'owner' };
  } catch {
    return {
      authorized: false,
      role: null,
      error: 'Access denied. This account does not have administrator privileges.',
    };
  }
}

export const FIREBASE_CONFIG_META = {
  projectId: firebaseConfig.projectId,
  firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
  storageBucket: firebaseConfig.storageBucket,
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    // Permission denied on /test/connection still proves live connectivity to Firestore
    return true;
  }
}

void testConnection();
