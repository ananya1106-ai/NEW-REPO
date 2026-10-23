import {
  db,
  checkIsFirebaseConfigured,
  collection,
  getDocs,
  setDoc,
  doc,
  updateDoc,
  onSnapshot,
  handleFirestoreError,
  OperationType,
  Unsubscribe,
  serverTimestamp,
} from '../lib/firebase';
import { ReconciliationRecord } from '../types';

const COLLECTION_NAME = 'reconciliations';

export const reconciliationsRepository = {
  async getAll(): Promise<ReconciliationRecord[]> {
    if (!checkIsFirebaseConfigured()) {
      return [];
    }
    try {
      const snap = await getDocs(collection(db, COLLECTION_NAME));
      if (snap.empty) {
        return [];
      }
      return snap.docs.map((d) => d.data() as ReconciliationRecord);
    } catch (err: any) {
      console.warn('[SmartPDS]: Reconciliations fetch notice:', err?.message || err);
      return [];
    }
  },

  subscribe(
    onData: (reconciliations: ReconciliationRecord[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!checkIsFirebaseConfigured()) {
      return () => {};
    }

    return onSnapshot(
      collection(db, COLLECTION_NAME),
      (snap) => {
        if (snap.empty) {
          onData([]);
          return;
        }
        const items = snap.docs.map((d) => d.data() as ReconciliationRecord);
        onData(items);
      },
      (error) => {
        onError?.(error);
        console.warn('[SmartPDS]: Reconciliations snapshot sync notice:', error?.message || error);
      }
    );
  },

  async addReconciliation(rec: ReconciliationRecord): Promise<void> {
    if (!checkIsFirebaseConfigured()) return;
    try {
      const cleanRec: Record<string, any> = {
        ...rec,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      Object.keys(cleanRec).forEach((k) => {
        if (cleanRec[k] === undefined) delete cleanRec[k];
      });
      await setDoc(doc(db, COLLECTION_NAME, rec.id), cleanRec);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${COLLECTION_NAME}/${rec.id}`);
    }
  },

  async updateReconciliation(
    recId: string,
    updates: Partial<ReconciliationRecord>
  ): Promise<void> {
    if (!checkIsFirebaseConfigured()) return;
    try {
      const cleanUpdates: Record<string, any> = {
        ...updates,
        updatedAt: serverTimestamp(),
      };
      Object.keys(cleanUpdates).forEach((k) => {
        if (cleanUpdates[k] === undefined) delete cleanUpdates[k];
      });
      await updateDoc(doc(db, COLLECTION_NAME, recId), cleanUpdates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${COLLECTION_NAME}/${recId}`);
    }
  },
};
