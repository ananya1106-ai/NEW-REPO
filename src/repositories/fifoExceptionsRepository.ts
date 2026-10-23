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
import { FifoException } from '../types';

const COLLECTION_NAME = 'fifo_exceptions';

export const fifoExceptionsRepository = {
  async getAll(): Promise<FifoException[]> {
    if (!checkIsFirebaseConfigured()) {
      return [];
    }
    try {
      const snap = await getDocs(collection(db, COLLECTION_NAME));
      if (snap.empty) {
        return [];
      }
      return snap.docs.map((d) => d.data() as FifoException);
    } catch (err: any) {
      console.warn('[SmartPDS]: FIFO Exceptions fetch notice:', err?.message || err);
      return [];
    }
  },

  subscribe(
    onData: (exceptions: FifoException[]) => void,
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
        const items = snap.docs.map((d) => d.data() as FifoException);
        onData(items);
      },
      (error) => {
        onError?.(error);
        console.warn('[SmartPDS]: FIFO Exceptions snapshot sync notice:', error?.message || error);
      }
    );
  },

  async addException(exc: FifoException): Promise<void> {
    if (!checkIsFirebaseConfigured()) return;
    try {
      const cleanExc: Record<string, any> = {
        ...exc,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      Object.keys(cleanExc).forEach((k) => {
        if (cleanExc[k] === undefined) delete cleanExc[k];
      });
      await setDoc(doc(db, COLLECTION_NAME, exc.id), cleanExc);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${COLLECTION_NAME}/${exc.id}`);
    }
  },

  async updateException(
    excId: string,
    updates: Partial<FifoException>
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
      await updateDoc(doc(db, COLLECTION_NAME, excId), cleanUpdates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${COLLECTION_NAME}/${excId}`);
    }
  },
};
