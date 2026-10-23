import {
  db,
  checkIsFirebaseConfigured,
  collection,
  getDocs,
  setDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  handleFirestoreError,
  OperationType,
  Unsubscribe,
  serverTimestamp,
} from '../lib/firebase';
import { AuditLog } from '../types';

const COLLECTION_NAME = 'audit_logs';

export const auditLogsRepository = {
  async getAll(): Promise<AuditLog[]> {
    if (!checkIsFirebaseConfigured()) {
      return [];
    }
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      if (snap.empty) {
        return [];
      }
      return snap.docs.map((d) => d.data() as AuditLog);
    } catch (err: any) {
      console.warn('[SmartPDS]: Audit logs fetch notice:', err?.message || err);
      return [];
    }
  },

  subscribe(
    onData: (logs: AuditLog[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!checkIsFirebaseConfigured()) {
      return () => {};
    }

    const q = query(collection(db, COLLECTION_NAME), orderBy('timestamp', 'desc'));
    return onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          onData([]);
          return;
        }
        const items = snap.docs.map((d) => d.data() as AuditLog);
        onData(items);
      },
      (error) => {
        onError?.(error);
        console.warn('[SmartPDS]: Audit logs snapshot sync notice:', error?.message || error);
      }
    );
  },

  async addLog(log: AuditLog): Promise<void> {
    if (!checkIsFirebaseConfigured()) return;
    try {
      const cleanLog: Record<string, any> = {
        ...log,
        createdAt: serverTimestamp(),
      };
      Object.keys(cleanLog).forEach((k) => {
        if (cleanLog[k] === undefined) delete cleanLog[k];
      });
      await setDoc(doc(db, COLLECTION_NAME, log.id), cleanLog);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${COLLECTION_NAME}/${log.id}`);
    }
  },
};
