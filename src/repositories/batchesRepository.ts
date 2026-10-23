import {
  db,
  checkIsFirebaseConfigured,
  collection,
  getDocs,
  getDoc,
  setDoc,
  doc,
  updateDoc,
  onSnapshot,
  handleFirestoreError,
  OperationType,
  Unsubscribe,
  serverTimestamp,
  deleteDoc,
} from '../lib/firebase';
import { Batch, BatchStatus } from '../types';
import { calculateAgeDays } from '../data/mockData';

const COLLECTION_NAME = 'batches';

export const batchesRepository = {
  async getAll(): Promise<Batch[]> {
    if (!checkIsFirebaseConfigured()) {
      return [];
    }
    try {
      const snap = await getDocs(collection(db, COLLECTION_NAME));
      if (snap.empty) {
        return [];
      }
      return snap.docs.map((d) => {
        const data = d.data() as Batch;
        return {
          ...data,
          stockAgeDays: calculateAgeDays(data.receivedDate),
        };
      });
    } catch (err: any) {
      console.warn('[SmartPDS]: Batches fetch notice:', err?.message || err);
      return [];
    }
  },

  subscribe(
    onData: (batches: Batch[]) => void,
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
        const items = snap.docs.map((d) => {
          const data = d.data() as Batch;
          return {
            ...data,
            stockAgeDays: calculateAgeDays(data.receivedDate),
            isPersisted: true,
          };
        });
        onData(items);
      },
      (error) => {
        onError?.(error);
        console.warn('[SmartPDS]: Batches snapshot sync notice:', error?.message || error);
      }
    );
  },

  async getBatch(batchId: string): Promise<Batch | null> {
    if (!checkIsFirebaseConfigured()) return null;
    try {
      const snap = await getDoc(doc(db, COLLECTION_NAME, batchId));
      if (!snap.exists()) return null;
      const data = snap.data() as Batch;
      return {
        ...data,
        stockAgeDays: calculateAgeDays(data.receivedDate),
        isPersisted: true,
      };
    } catch {
      return null;
    }
  },

  async addBatch(batch: Batch): Promise<void> {
    if (!checkIsFirebaseConfigured()) return;
    try {
      const cleanBatch: Record<string, any> = {
        ...batch,
        isPersisted: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      Object.keys(cleanBatch).forEach((k) => {
        if (cleanBatch[k] === undefined) delete cleanBatch[k];
      });
      await setDoc(doc(db, COLLECTION_NAME, batch.id), cleanBatch);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${COLLECTION_NAME}/${batch.id}`);
    }
  },

  async updateBatchStatus(
    batchId: string,
    newStatus: BatchStatus,
    reason: string,
    user: string
  ): Promise<void> {
    if (!checkIsFirebaseConfigured()) return;
    try {
      const batchRef = doc(db, COLLECTION_NAME, batchId);
      const newMovement = {
        id: `MOV-ST-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        action: 'STATUS_CHANGE' as const,
        referenceId: `STAT-CHG-${batchId}`,
        user,
        notes: `Status changed to ${newStatus}. Reason: ${reason}`,
      };

      await updateDoc(batchRef, {
        status: newStatus,
        statusReason: reason,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${COLLECTION_NAME}/${batchId}`);
    }
  },

  async updateBatchMetadata(
    batchId: string,
    updates: { depotLocation?: string; notes?: string; moisturePercentage?: number }
  ): Promise<void> {
    if (!checkIsFirebaseConfigured()) return;
    try {
      await updateDoc(doc(db, COLLECTION_NAME, batchId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${COLLECTION_NAME}/${batchId}`);
    }
  },

  async deleteBatch(batchId: string): Promise<void> {
    if (!checkIsFirebaseConfigured()) return;
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, batchId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${COLLECTION_NAME}/${batchId}`);
    }
  },
};
