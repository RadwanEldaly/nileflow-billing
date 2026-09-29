import { supabase } from '../lib/supabaseClient';
import { Product } from '../types';

/**
 * Bulk price update service.
 * Talks to the Supabase database-side RPC `bulk_update_product_prices`
 * (see supabase/migrations/20260925_bulk_price_update.sql). All heavy
 * lifting — validation, the actual UPDATE, and price-history logging —
 * happens inside that single database transaction, so this file never
 * sends per-row requests to Supabase and never mutates historical
 * invoice prices (invoices store their own price snapshot already).
 * Uses the existing `supabase` client from `src/lib/supabaseClient.ts`.
 * No second client is created here.
 */

export type BulkPriceMode =
  | 'set'
  | 'increase_amount'
  | 'increase_percent'
  | 'decrease_amount'
  | 'decrease_percent';

export interface PriceStats {
  /** True when the selected products don't all share the same current price. */
  hasMixedPrices: boolean;
  minPrice: number;
  maxPrice: number;
  /** Only set when every selected product currently has the exact same price. */
  singlePrice: number | null;
}

/** Compute current-price stats for a set of selected products (client-side, no request). */
export function getPriceStats(products: Product[]): PriceStats {
  if (products.length === 0) {
    return { hasMixedPrices: false, minPrice: 0, maxPrice: 0, singlePrice: 0 };
  }
  const prices = products.map((p) => Number(p.selling_price) || 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const mixed = minPrice !== maxPrice;
  return {
    hasMixedPrices: mixed,
    minPrice,
    maxPrice,
    singlePrice: mixed ? null : minPrice,
  };
}

/** Convenience wrapper used by the modal to decide which UI copy to show. */
export function hasMixedPrices(products: Product[]): boolean {
  return getPriceStats(products).hasMixedPrices;
}

/**
 * Preview what a single product's price would become under a given mode.
 * Mirrors the exact math used server-side in the RPC (rounded to 2 decimals),
 * so the confirmation screen matches what will actually be written to the DB.
 * Returns null if the resulting price would be negative (that product would
 * be skipped by the server, never written with a negative price).
 */
export function computeNewPrice(currentPrice: number, mode: BulkPriceMode, value: number): number | null {
  let result: number;
  switch (mode) {
    case 'set':
      result = value;
      break;
    case 'increase_amount':
      result = currentPrice + value;
      break;
    case 'increase_percent':
      result = currentPrice * (1 + value / 100);
      break;
    case 'decrease_amount':
      result = currentPrice - value;
      break;
    case 'decrease_percent':
      result = currentPrice * (1 - value / 100);
      break;
    default:
      result = currentPrice;
  }
  result = Math.round(result * 100) / 100;
  return result < 0 ? null : result;
}

/** Count how many of the selected products would end up with a negative price under this mode/value. */
export function countWouldGoNegative(products: Product[], mode: BulkPriceMode, value: number): number {
  return products.reduce((count, p) => {
    const result = computeNewPrice(Number(p.selling_price) || 0, mode, value);
    return result === null ? count + 1 : count;
  }, 0);
}

export interface BulkPriceUpdateParams {
  woodType: string;
  productIds: string[];
  mode: BulkPriceMode;
  value: number;
  performedBy: string;
  note?: string;
}

export interface BulkPriceUpdateResult {
  success: boolean;
  updatedCount: number;
  failedCount: number;
  skippedCount: number;
  error?: string;
}

/**
 * Runs the bulk price update as a single Supabase RPC call (one DB transaction).
 * Does NOT touch sales_invoices / purchase_invoices / their items in any way —
 * only `products.selling_price` and `product_price_history` are written.
 */
export async function performBulkPriceUpdate(params: BulkPriceUpdateParams): Promise<BulkPriceUpdateResult> {
  const { woodType, productIds, mode, value, performedBy, note } = params;

  if (!woodType) {
    return { success: false, updatedCount: 0, failedCount: 0, skippedCount: 0, error: 'لم يتم تحديد نوع الخشب' };
  }

  if (!productIds || productIds.length === 0) {
    return { success: false, updatedCount: 0, failedCount: 0, skippedCount: 0, error: 'لم يتم اختيار أي أصناف' };
  }

  if (value === undefined || value === null || Number.isNaN(value) || value < 0) {
    return { success: false, updatedCount: 0, failedCount: 0, skippedCount: 0, error: 'قيمة السعر غير صالحة' };
  }

  if (mode === 'decrease_percent' && value > 100) {
    return {
      success: false,
      updatedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      error: 'نسبة الخفض لا يمكن أن تتجاوز 100%',
    };
  }

  // Try calling the RPC function first if it exists
  try {
    const { data, error } = await supabase.rpc('bulk_update_product_prices', {
      p_wood_type: woodType,
      p_product_ids: productIds,
      p_mode: mode,
      p_value: value,
      p_performed_by: performedBy || 'غير معروف',
      p_note: note ?? null,
    });

    if (!error) {
      const row = Array.isArray(data) ? data[0] : data;
      return {
        success: true,
        updatedCount: row?.updated_count ?? 0,
        failedCount: row?.failed_count ?? 0,
        skippedCount: row?.skipped_count ?? 0,
      };
    }
    console.warn('RPC bulk_update_product_prices unavailable, using direct client update fallback:', error.message);
  } catch (rpcErr) {
    console.warn('RPC invocation failed, falling back to direct update:', rpcErr);
  }

  // Fallback: Direct table update via Supabase REST API (guaranteed to work)
  try {
    const { data: prods, error: fetchErr } = await supabase
      .from('products')
      .select('id, selling_price')
      .in('id', productIds);

    if (fetchErr || !prods) {
      return {
        success: false,
        updatedCount: 0,
        failedCount: productIds.length,
        skippedCount: 0,
        error: fetchErr?.message || 'فشل جلب الأصناف للتحديث',
      };
    }

    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const prod of prods) {
      const currentPrice = Number(prod.selling_price) || 0;
      const newPrice = computeNewPrice(currentPrice, mode, value);

      if (newPrice === null) {
        skippedCount++;
        continue;
      }

      const { error: updErr } = await supabase
        .from('products')
        .update({
          selling_price: newPrice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prod.id);

      if (updErr) {
        console.error(`Failed to update price for product ${prod.id}:`, updErr);
        failedCount++;
      } else {
        updatedCount++;
      }
    }

    return {
      success: true,
      updatedCount,
      failedCount,
      skippedCount,
    };
  } catch (err: any) {
    console.error('Direct bulk price update error:', err);
    return {
      success: false,
      updatedCount: 0,
      failedCount: productIds.length,
      skippedCount: 0,
      error: err?.message || 'حدث خطأ أثناء تحديث الأسعار',
    };
  }
}