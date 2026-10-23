import {
  db,
  checkIsFirebaseConfigured,
  setDoc,
  doc,
  getDoc,
  handleFirestoreError,
  OperationType,
  serverTimestamp,
} from '../lib/firebase';
import { DepotSettings } from '../types';
import { DEFAULT_DEPOT_SETTINGS } from '../data/mockData';

const COLLECTION_NAME = 'depot_settings';
const DOC_ID = 'current';

export const depotSettingsRepository = {
  async getSettings(): Promise<DepotSettings> {
    if (!checkIsFirebaseConfigured()) {
      return DEFAULT_DEPOT_SETTINGS;
    }
    try {
      const snap = await getDoc(doc(db, COLLECTION_NAME, DOC_ID));
      if (!snap.exists()) {
        return DEFAULT_DEPOT_SETTINGS;
      }
      return snap.data() as DepotSettings;
    } catch (err: any) {
      console.warn('[SmartPDS]: Depot settings fetch notice (using defaults):', err?.message || err);
      return DEFAULT_DEPOT_SETTINGS;
    }
  },

  async saveSettings(settings: Partial<DepotSettings>): Promise<void> {
    if (!checkIsFirebaseConfigured()) return;
    try {
      const cleanSettings: Record<string, any> = {
        ...settings,
        updatedAt: serverTimestamp(),
      };
      Object.keys(cleanSettings).forEach((k) => {
        if (cleanSettings[k] === undefined) delete cleanSettings[k];
      });
      await setDoc(doc(db, COLLECTION_NAME, DOC_ID), cleanSettings, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${COLLECTION_NAME}/${DOC_ID}`);
    }
  },
};
