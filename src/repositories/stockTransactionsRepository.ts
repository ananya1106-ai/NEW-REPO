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
} from '../lib/firebase';
import { CommodityType } from '../types';

export interface StockTransactionRecord {
  id: string; // e.g. TX-2026-10293
  timestamp: string;
  date: string;
  action: 'RECEIPT' | 'DISPATCH' | 'STATUS_CHANGE' | 'ADJUSTMENT';
  batchId: string;
  commodity: CommodityType;
  variety: string;
  quantityBags: number;
  quantityQtl: number;
  referenceId: string; // e.g. Challan #, Inward Gate Pass #, or Adj #
  user: string;
  role?: string;
  notes?: string;
  depotLocation?: string;
}

const COLLECTION_NAME = 'stock_transactions';

export const stockTransactionsRepository = {
  async getAll(): Promise<StockTransactionRecord[]> {
    if (!checkIsFirebaseConfigured()) {
      return [];
    }
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as StockTransactionRecord);
    } catch (err: any) {
      console.warn('[SmartPDS]: Stock transactions fetch notice:', err?.message || err);
      return [];
    }
  },

  subscribe(
    onData: (txs: StockTransactionRecord[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!checkIsFirebaseConfigured()) {
      onData([]);
      return () => {};
    }

    const q = query(collection(db, COLLECTION_NAME), orderBy('timestamp', 'desc'));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => d.data() as StockTransactionRecord);
        onData(items);
      },
      (error) => {
        onError?.(error);
        console.warn('[SmartPDS]: Stock transactions snapshot sync notice:', error?.message || error);
      }
    );
  },

  async recordTransaction(tx: StockTransactionRecord): Promise<void> {
    if (!checkIsFirebaseConfigured()) return;
    try {
      const cleanTx: Record<string, any> = {
        ...tx,
        createdAt: new Date().toISOString(),
      };
      Object.keys(cleanTx).forEach((k) => {
        if (cleanTx[k] === undefined) delete cleanTx[k];
      });
      await setDoc(doc(db, COLLECTION_NAME, tx.id), cleanTx);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${COLLECTION_NAME}/${tx.id}`);
    }
  },
};
