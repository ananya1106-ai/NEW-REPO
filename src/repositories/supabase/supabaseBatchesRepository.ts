import { supabase } from '../../lib/supabase';
import { Batch, BatchStatus, QualityGrade, CommodityType } from '../../types';
import { calculateAgeDays } from '../../data/mockData';

// Helper to map snake_case SQL row to camelCase TypeScript model
function mapBatchRowToModel(row: any): Batch {
  return {
    id: row.id,
    commodity: row.commodity as CommodityType,
    variety: row.variety,
    receivedDate: row.received_date,
    expiryDate: row.expiry_date || undefined,
    initialBags: Number(row.initial_bags),
    availableBags: Number(row.available_bags),
    bagWeightKg: Number(row.bag_weight_kg),
    totalReceivedQtl: Number(row.total_received_qtl),
    availableQtl: Number(row.available_qtl),
    depotLocation: row.depot_location,
    warehouseName: row.warehouse_name,
    moisturePercentage: Number(row.moisture_percentage),
    qualityInspectionGrade: row.quality_inspection_grade as QualityGrade,
    status: row.status as BatchStatus,
    statusReason: row.status_reason || undefined,
    supplierSource: row.supplier_source,
    stockAgeDays: calculateAgeDays(row.received_date),
    notes: row.notes || undefined,
    movements: Array.isArray(row.movements) ? row.movements : [],
    isDemo: Boolean(row.is_demo),
    isPersisted: true,
  };
}

// Helper to map camelCase TypeScript model to snake_case SQL insert/update row
function mapBatchModelToRow(b: Batch): any {
  return {
    id: b.id,
    commodity: b.commodity,
    variety: b.variety,
    received_date: b.receivedDate,
    expiry_date: b.expiryDate || null,
    initial_bags: b.initialBags,
    available_bags: b.availableBags,
    bag_weight_kg: b.bagWeightKg,
    total_received_qtl: b.totalReceivedQtl,
    available_qtl: b.availableQtl,
    depot_location: b.depotLocation,
    warehouse_name: b.warehouseName,
    moisture_percentage: b.moisturePercentage,
    quality_inspection_grade: b.qualityInspectionGrade,
    status: b.status,
    status_reason: b.statusReason || null,
    supplier_source: b.supplierSource,
    stock_age_days: b.stockAgeDays || calculateAgeDays(b.receivedDate),
    notes: b.notes || null,
    movements: b.movements || [],
    is_demo: Boolean(b.isDemo),
  };
}

export const supabaseBatchesRepository = {
  async getAll(): Promise<Batch[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .order('received_date', { ascending: true });

      if (error) {
        console.warn('[SmartPDS Supabase]: Batches fetch notice:', error.message);
        return [];
      }
      return (data || []).map(mapBatchRowToModel);
    } catch (err: any) {
      console.warn('[SmartPDS Supabase]: Batches query error:', err?.message || err);
      return [];
    }
  },

  async getById(id: string): Promise<Batch | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return null;
      return mapBatchRowToModel(data);
    } catch {
      return null;
    }
  },

  async create(batch: Batch): Promise<Batch> {
    if (!supabase) throw new Error('Supabase is not configured.');
    const row = mapBatchModelToRow(batch);
    const { data, error } = await supabase
      .from('batches')
      .insert(row)
      .select()
      .single();

    if (error) throw new Error(`Supabase Batch Insert Error: ${error.message}`);
    return mapBatchRowToModel(data);
  },

  async update(id: string, updates: Partial<Batch>): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured.');
    const patch: Record<string, any> = {};
    if (updates.availableBags !== undefined) patch.available_bags = updates.availableBags;
    if (updates.availableQtl !== undefined) patch.available_qtl = updates.availableQtl;
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.statusReason !== undefined) patch.status_reason = updates.statusReason;
    if (updates.depotLocation !== undefined) patch.depot_location = updates.depotLocation;
    if (updates.moisturePercentage !== undefined) patch.moisture_percentage = updates.moisturePercentage;
    if (updates.qualityInspectionGrade !== undefined) patch.quality_inspection_grade = updates.qualityInspectionGrade;
    if (updates.notes !== undefined) patch.notes = updates.notes;
    if (updates.movements !== undefined) patch.movements = updates.movements;

    const { error } = await supabase
      .from('batches')
      .update(patch as never)
      .eq('id', id);

    if (error) throw new Error(`Supabase Batch Update Error: ${error.message}`);
  },

  async updateStatus(id: string, status: BatchStatus, reason?: string): Promise<void> {
    return this.update(id, { status, statusReason: reason });
  },

  subscribe(
    onData: (batches: Batch[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const client = supabase;
    if (!client) {
      return () => {};
    }

    const channel = client
      .channel('public:batches')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'batches' },
        async () => {
          try {
            const fresh = await supabaseBatchesRepository.getAll();
            onData(fresh);
          } catch (err: any) {
            onError?.(err);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          onError?.(new Error('Supabase batches subscription channel error'));
        }
      });

    return () => {
      client.removeChannel(channel);
    };
  },
};
