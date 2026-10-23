import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  applyActionCode,
  checkActionCode,
  reload,
  sendPasswordResetEmail,
  ActionCodeSettings,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  Firestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  collection,
  query,
  onSnapshot,
  runTransaction,
  getDocs,
  where,
  orderBy,
  limit,
  addDoc,
  deleteDoc,
  serverTimestamp,
  DocumentData,
  QuerySnapshot,
  Unsubscribe,
} from 'firebase/firestore';

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

export interface FirebaseConnectionStatus {
  isConfigured: boolean;
  isConnected: boolean;
  projectId: string;
  authDomain: string;
  error?: string;
  missingKeys: string[];
  isDatabaseMissing?: boolean;
  setupUrl?: string;
  setupInstructions?: string;
}

// 1. Web App configuration values from Vite environment variables or defaults for project 'smartipds'
// Helper to read any saved Web App config from browser localStorage
function getSavedWebConfig(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('smartpds_firebase_web_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // Ignore parse error
  }
  return {};
}

// 1. Web App configuration values from Vite environment variables or browser localStorage
// Strictly bound to project 'smartipds' and default database per system requirements
const env = (typeof import.meta !== 'undefined' && import.meta.env && Object.keys(import.meta.env).length > 0)
  ? (import.meta.env as Record<string, string>)
  : (typeof process !== 'undefined' && process.env ? (process.env as unknown as Record<string, string>) : ({} as Record<string, string>));

const savedWeb = getSavedWebConfig();

export const firebaseConfig = {
  apiKey: savedWeb.apiKey || env.VITE_FIREBASE_API_KEY || '',
  authDomain: savedWeb.authDomain || env.VITE_FIREBASE_AUTH_DOMAIN || 'smartipds.firebaseapp.com',
  projectId: 'smartipds', // Locked strictly to smartipds per Non-Negotiable Rule 3
  storageBucket: savedWeb.storageBucket || env.VITE_FIREBASE_STORAGE_BUCKET || 'smartipds.firebasestorage.app',
  messagingSenderId: savedWeb.messagingSenderId || env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: savedWeb.appId || env.VITE_FIREBASE_APP_ID || '',
};

export function getFirebaseConfig() {
  return { ...firebaseConfig };
}

export function saveFirebaseWebConfig(config: {
  apiKey: string;
  appId: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}) {
  if (typeof window === 'undefined') return;
  const payload = {
    apiKey: config.apiKey?.trim() || '',
    appId: config.appId?.trim() || '',
    authDomain: config.authDomain?.trim() || 'smartipds.firebaseapp.com',
    projectId: 'smartipds',
    storageBucket: config.storageBucket?.trim() || 'smartipds.firebasestorage.app',
    messagingSenderId: config.messagingSenderId?.trim() || '',
  };
  localStorage.setItem('smartpds_firebase_web_config', JSON.stringify(payload));
  // Update in-memory config object
  Object.assign(firebaseConfig, payload);
}

export function clearFirebaseWebConfig() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('smartpds_firebase_web_config');
  firebaseConfig.apiKey = env.VITE_FIREBASE_API_KEY || '';
  firebaseConfig.appId = env.VITE_FIREBASE_APP_ID || '';
}

// Required environment variable names for Firebase Web connection
export const REQUIRED_FIREBASE_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_APP_ID',
] as const;

export function getMissingConfigKeys(): string[] {
  const missing: string[] = [];
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.trim() === '' || firebaseConfig.apiKey.startsWith('YOUR_') || firebaseConfig.apiKey.includes('placeholder')) {
    missing.push('apiKey');
  }
  if (!firebaseConfig.appId || firebaseConfig.appId.trim() === '' || firebaseConfig.appId.startsWith('YOUR_') || firebaseConfig.appId.includes('000000000000')) {
    missing.push('appId');
  }
  return missing;
}

export function checkIsFirebaseConfigured(): boolean {
  return getMissingConfigKeys().length === 0;
}

export const missingConfigKeys = getMissingConfigKeys();
export const isFirebaseConfigured = checkIsFirebaseConfigured();

export interface SafeFirebaseDiagnostic {
  targetProjectId: string;
  isConfigured: boolean;
  missingEnvVarNames: string[];
  lastErrorCode: string | null;
}

export function getSafeFirebaseDiagnostic(lastErrorCode?: string | null): SafeFirebaseDiagnostic {
  return {
    targetProjectId: firebaseConfig.projectId || 'smartipds',
    isConfigured: checkIsFirebaseConfigured(),
    missingEnvVarNames: getMissingConfigKeys(),
    lastErrorCode: lastErrorCode || null,
  };
}

// 2. Initialize Firebase App safely without crashing if config is pending
let app: FirebaseApp;
if (getApps().length > 0) {
  app = getApp();
} else {
  app = initializeApp({
    apiKey: firebaseConfig.apiKey || 'placeholder-api-key-smartipds',
    authDomain: firebaseConfig.authDomain || 'smartipds.firebaseapp.com',
    projectId: 'smartipds',
    storageBucket: firebaseConfig.storageBucket || 'smartipds.firebasestorage.app',
    messagingSenderId: firebaseConfig.messagingSenderId || '',
    appId: firebaseConfig.appId || '1:000000000000:web:0000000000000000000000',
  });
}

// 3. Centralized Auth and Cloud Firestore instances (reused across the entire application)
export const auth: Auth = getAuth(app);
let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(app, { ignoreUndefinedProperties: true });
} catch {
  firestoreInstance = getFirestore(app);
}
export const db: Firestore = firestoreInstance;

// 4. Standardized Firestore Error Handler
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('[SmartPDS Firestore Error]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 5. Verification Diagnostic Operation to Cloud Firestore
// Uses standard Firebase Web SDK operation getDocFromServer on /test/connection
// Accurately differentiates active database, permission-denied, truly missing database, and network failure
export async function testFirestoreConnection(): Promise<FirebaseConnectionStatus> {
  const configured = checkIsFirebaseConfigured();
  const missing = getMissingConfigKeys();
  const status: FirebaseConnectionStatus = {
    isConfigured: configured,
    isConnected: false,
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    missingKeys: missing,
  };

  if (!configured) {
    status.error = `Firebase Web configuration pending. Please configure API Key & App ID for project ${firebaseConfig.projectId}.`;
    return status;
  }

  try {
    const testDocRef = doc(db, 'test', 'connection');
    await getDocFromServer(testDocRef);
    // If the server responded with document snapshot (exists: true or false), Cloud Firestore is verified active!
    status.isConnected = true;
    status.isDatabaseMissing = false;
    status.error = undefined;
    console.log('[SmartPDS Firebase]: Connected successfully to Cloud Firestore (project: smartipds).');
    return status;
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    const code = (error as any)?.code || '';

    // PERMISSION_DENIED proves the Cloud Firestore default database exists and its security rules responded!
    if (
      code === 'permission-denied' ||
      msg.includes('permission-denied') ||
      msg.includes('Missing or insufficient permissions')
    ) {
      status.isConnected = true;
      status.isDatabaseMissing = false;
      status.error = 'Cloud Firestore (default) is active and reachable (access governed by security rules).';
      console.log('[SmartPDS Firebase]: Cloud Firestore endpoint reached (authenticated rule response).');
      return status;
    }

    // Truly missing database (default does not exist for project)
    if (
      code === 'not-found' &&
      (msg.includes('database (default) does not exist') || msg.includes('does not exist for project'))
    ) {
      status.isConnected = false;
      status.isDatabaseMissing = true;
      status.error = `The database (default) does not exist for project ${firebaseConfig.projectId}.`;
      status.setupUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`;
      status.setupInstructions = `1. Open Firebase Console (https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore)\n2. Click "Create database"\n3. Select Production Mode\n4. Location: asia-south1 or us-central1\n5. Enable`;
      console.warn('[SmartPDS Firebase]: Database (default) does not exist in project:', firebaseConfig.projectId);
      return status;
    }

    // Offline / Network failure
    if (code === 'unavailable' || msg.includes('the client is offline') || msg.includes('network-request-failed')) {
      status.isConnected = false;
      status.isDatabaseMissing = false;
      status.error = 'Network offline: Unable to reach Google Cloud Firestore servers. Check internet connection.';
      console.warn('[SmartPDS Firebase]: Network unreachable:', msg);
      return status;
    }

    // Invalid API key
    if (msg.includes('API key not valid') || code === 'auth/invalid-api-key' || msg.includes('API_KEY_INVALID')) {
      status.isConnected = false;
      status.isDatabaseMissing = false;
      status.error = `The provided Firebase API key is not valid for project ${firebaseConfig.projectId}.`;
      console.warn('[SmartPDS Firebase]: API key invalid:', msg);
      return status;
    }

    status.isConnected = false;
    status.isDatabaseMissing = false;
    status.error = `Diagnostic note: ${msg}`;
    console.warn('[SmartPDS Firebase]: Diagnostic note:', msg);
    return status;
  }
}

/**
 * Generates official ActionCodeSettings for SmartPDS email verification.
 * Dynamically resolves the active deployed application origin (window.location.origin)
 * so verification links return directly to the live app terminal instead of the unhosted Firebase default domain.
 */
export function getActionCodeSettings(): ActionCodeSettings {
  let appUrl = '';
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    appUrl = window.location.origin;
  }
  if (!appUrl) {
    appUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_URL) || 'https://smartipds.firebaseapp.com';
  }

  const cleanBase = appUrl.replace(/\/+$/, '');
  return {
    url: `${cleanBase}/?mode=verifyEmail`,
    handleCodeInApp: false,
  };
}

export {
  app,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  applyActionCode,
  checkActionCode,
  reload,
  sendPasswordResetEmail,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  collection,
  query,
  onSnapshot,
  runTransaction,
  getDocs,
  where,
  orderBy,
  limit,
  addDoc,
  deleteDoc,
  serverTimestamp,
};
export type { FirebaseUser, DocumentData, QuerySnapshot, Unsubscribe, ActionCodeSettings };

