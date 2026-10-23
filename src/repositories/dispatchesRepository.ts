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
import { DispatchRecord } from '../types';

const COLLECTION_NAME = 'dispatches';

export const dispatchesRepository = {
  async getAll(): Promise<DispatchRecord[]> {
    if (!checkIsFirebaseConfigured()) {
      return [];
    }
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      if (snap.empty) {
        return [];
      }
      return snap.docs.map((d) => d.data() as DispatchRecord);
    } catch (err: any) {
      console.warn('[SmartPDS]: Dispatches fetch notice:', err?.message || err);
      return [];
    }
  },

  subscribe(
    onData: (dispatches: DispatchRecord[]) => void,
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
        const items = snap.docs.map((d) => d.data() as DispatchRecord);
        onData(items);
      },
      (error) => {
        onError?.(error);
        console.warn('[SmartPDS]: Dispatches snapshot sync notice:', error?.message || error);
      }
    );
  },

  async addDispatch(dispatch: DispatchRecord): Promise<void> {
    if (!checkIsFirebaseConfigured()) return;
    try {
      const cleanDispatch: Record<string, any> = {
        ...dispatch,
        createdAt: serverTimestamp(),
      };
      Object.keys(cleanDispatch).forEach((k) => {
        if (cleanDispatch[k] === undefined) delete cleanDispatch[k];
      });
      await setDoc(doc(db, COLLECTION_NAME, dispatch.challanNumber), cleanDispatch);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${COLLECTION_NAME}/${dispatch.challanNumber}`);
    }
  },
};
