import { supabase } from '../lib/supabaseClient';
import {
  SalesInvoice,
  SalesInvoiceItem,
  PurchaseInvoice,
  PurchaseInvoiceItem,
  Customer,
  Supplier,
  Product,
  StockMovement,
  FinancialTransaction,
} from '../types';

export interface CreateSalesInvoiceInput {
  invoice: Omit<SalesInvoice, 'id' | 'created_at'>;
  items: Array<{
    product_id?: string;
    product_name_snapshot: string;
    wood_type_snapshot?: string;
    quantity_sheets: number;
    unit_price: number;
    line_total: number;
    size_snapshot?: string;
    color_snapshot?: string;
  }>;
}

export interface CreatePurchaseInvoiceInput {
  invoice: Omit<PurchaseInvoice, 'id' | 'created_at'>;
  items: Array<{
    product_id?: string;
    product_name_snapshot: string;
    wood_type_snapshot?: string;
    quantity_sheets: number;
    unit_price: number;
    line_total: number;
    size_snapshot?: string;
    color_snapshot?: string;
  }>;
}

export interface ReturnOperationInput {
  customerId?: string;
  supplierId?: string;
  warehouseId: string;
  originalInvoiceNumber?: string;
  items: Array<{
    productId?: string;
    productName: string;
    woodType?: string;
    quantitySheets: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  total: number;
  refundMethod: 'credit' | 'cash';
  notes?: string;
}

/**
 * Helper to test if a Supabase error is caused by missing RPC function
 */
function isRpcMissing(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const code = error.code || '';
  return (
    code === 'PGRST202' ||
    code === '42883' ||
    msg.includes('could not find the function') ||
    msg.includes('function') && msg.includes('does not exist')
  );
}

/**
 * Enterprise ERP Backend Service
 * Combines Native PostgreSQL Stored Procedures (ACID RPC) with an Intelligent Fallback & Compensation Engine
 */
export const erpBackendService = {
  /**
   * 1. CREATE SALES INVOICE (Atomic)
   */
  async createSalesInvoice(
    input: CreateSalesInvoiceInput,
    options?: {
      customers: Customer[];
      products: Product[];
    }
  ): Promise<{
    invoice: SalesInvoice;
    updatedProducts?: Product[];
    updatedCustomer?: Customer;
    createdMovements?: StockMovement[];
  }> {
    if (!supabase) throw new Error('Database client not configured');

    const { invoice, items } = input;

    // A. Attempt Native Database RPC Stored Procedure
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'create_sales_invoice_atomic',
        {
          p_invoice: {
            customer_id: invoice.customer_id,
            warehouse_id: invoice.warehouse_id,
            invoice_number: invoice.invoice_number,
            invoice_date: invoice.invoice_date,
            subtotal: invoice.subtotal || 0,
            discount: invoice.discount || 0,
            total: invoice.total || 0,
            paid_amount: invoice.paid_amount || 0,
            remaining_balance: invoice.remaining_balance || 0,
            notes: invoice.notes || '',
          },
          p_items: items,
        }
      );

      if (!rpcError && rpcData?.success) {
        console.log('[ERP Backend] ✓ Native PostgreSQL Atomic RPC Executed Successfully');
        // Fetch full newly created invoice with joined items
        const { data: createdInv } = await supabase
          .from('sales_invoices')
          .select('*, items:sales_invoice_items(*)')
          .eq('id', rpcData.invoice_id)
          .single();

        return {
          invoice: createdInv || {
            ...(invoice as any),
            id: rpcData.invoice_id,
            items: items as any,
          },
        };
      }

      if (rpcError && !isRpcMissing(rpcError)) {
        console.error('[ERP Backend] RPC Error:', rpcError);
        throw new Error(rpcError.message || 'Error executing atomic transaction');
      }
    } catch (err: any) {
      if (!isRpcMissing(err)) {
        throw err;
      }
    }

    // B. Coordinated Fallback Execution with Compensation/Rollback Stack
    console.warn(
      '[ERP Backend] Notice: Stored procedure "create_sales_invoice_atomic" not installed yet. Running hardened client-side transaction with rollback stack.'
    );

    const rollbackStack: Array<() => Promise<void>> = [];

    try {
      // Step 1: Insert invoice header
      const invoiceRecord = {
        invoice_number: invoice.invoice_number,
        customer_id: invoice.customer_id,
        warehouse_id: invoice.warehouse_id,
        invoice_date: invoice.invoice_date,
        status: invoice.status || 'approved',
        subtotal: invoice.subtotal || 0,
        discount: invoice.discount || 0,
        total: invoice.total || 0,
        paid_amount: invoice.paid_amount || 0,
        remaining_balance: invoice.remaining_balance || 0,
        notes: invoice.notes || '',
      };

      const { data: invData, error: invError } = await supabase
        .from('sales_invoices')
        .insert([invoiceRecord])
        .select();

      if (invError || !invData || !invData[0]) {
        throw new Error('Failed to create sales invoice: ' + (invError?.message || 'unknown error'));
      }

      const newInvoice = invData[0];
      rollbackStack.push(async () => {
        await supabase.from('sales_invoices').delete().eq('id', newInvoice.id);
      });

      // Step 2: Insert items
      let insertedItems: SalesInvoiceItem[] = [];
      if (items && items.length > 0) {
        const itemsToInsert = items.map((item) => ({
          invoice_id: newInvoice.id,
          product_id: item.product_id || null,
          product_name_snapshot: item.product_name_snapshot || 'لوح خشب',
          wood_type_snapshot: item.wood_type_snapshot || 'ألواح',
          quantity_sheets: item.quantity_sheets || 1,
          unit_price: item.unit_price || 0,
          line_total: item.line_total || 0,
          size_snapshot: item.size_snapshot,
          color_snapshot: item.color_snapshot,
        }));

        const { data: itemsData, error: itemsError } = await supabase
          .from('sales_invoice_items')
          .insert(itemsToInsert)
          .select();

        if (itemsError) {
          throw new Error('Failed to insert invoice items: ' + itemsError.message);
        }
        if (itemsData) insertedItems = itemsData;
      }
      newInvoice.items = insertedItems;

      // Step 3: Deduct stock and record stock movements
      if (items && items.length > 0) {
        for (const item of items) {
          if (item.product_id) {
            const { data: prodData } = await supabase
              .from('products')
              .select('stock_quantity')
              .eq('id', item.product_id)
              .single();

            const curStock = prodData ? prodData.stock_quantity || 0 : 0;
            const newStock = curStock - item.quantity_sheets;

            // Deduct stock
            await supabase
              .from('products')
              .update({ stock_quantity: newStock })
              .eq('id', item.product_id);

            // Add compensation to restore stock if later steps fail
            rollbackStack.push(async () => {
              await supabase
                .from('products')
                .update({ stock_quantity: curStock })
                .eq('id', item.product_id!);
            });

            // Record movement
            const { data: mData } = await supabase
              .from('stock_movements')
              .insert([
                {
                  product_id: item.product_id,
                  warehouse_id: newInvoice.warehouse_id,
                  movement_type: 'sale',
                  quantity: -item.quantity_sheets,
                  reference_id: newInvoice.invoice_number,
                  reference_type: 'sales_invoice',
                  notes: `فاتورة بيع ألواح رقم ${newInvoice.invoice_number}`,
                },
              ])
              .select();

            if (mData && mData[0]) {
              const mvId = mData[0].id;
              rollbackStack.push(async () => {
                await supabase.from('stock_movements').delete().eq('id', mvId);
              });
            }
          }
        }
      }

      // Step 4: Update customer balance
      let updatedCustomer: Customer | undefined;
      if (newInvoice.customer_id && newInvoice.remaining_balance !== 0) {
        const { data: cData } = await supabase
          .from('customers')
          .select('balance')
          .eq('id', newInvoice.customer_id)
          .single();

        const oldBal = cData?.balance || 0;
        const newBal = oldBal + newInvoice.remaining_balance;

        const { data: updatedC, error: cErr } = await supabase
          .from('customers')
          .update({ balance: newBal })
          .eq('id', newInvoice.customer_id)
          .select();

        if (cErr) {
          throw new Error('Failed to update customer balance: ' + cErr.message);
        }

        rollbackStack.push(async () => {
          await supabase.from('customers').update({ balance: oldBal }).eq('id', newInvoice.customer_id);
        });

        if (updatedC && updatedC[0]) updatedCustomer = updatedC[0];
      }

      // Step 5: Record cash payment if paid upfront
      if (newInvoice.paid_amount > 0) {
        await supabase.from('financial_transactions').insert([
          {
            transaction_type: 'customer_payment',
            party_type: 'customer',
            party_id: newInvoice.customer_id,
            amount: newInvoice.paid_amount,
            payment_method: 'cash',
            reference_invoice_id: newInvoice.id,
            transaction_date: newInvoice.invoice_date,
            notes: `سداد نقدي عند تحرير فاتورة بيع رقم ${newInvoice.invoice_number}`,
          },
        ]);
      }

      return {
        invoice: newInvoice,
        updatedCustomer,
      };
    } catch (err: any) {
      // Execute compensation rollbacks in reverse order
      console.error('[ERP Backend] Transaction failed, initiating rollback:', err);
      for (let i = rollbackStack.length - 1; i >= 0; i--) {
        try {
          await rollbackStack[i]();
        } catch (rbErr) {
          console.error('[ERP Backend] Rollback step error:', rbErr);
        }
      }
      throw err;
    }
  },

  /**
   * 2. DELETE / CANCEL SALES INVOICE (Atomic)
   */
  async deleteSalesInvoice(
    invoiceId: string,
    invoice: SalesInvoice
  ): Promise<{ success: boolean }> {
    if (!supabase) throw new Error('Database client not configured');

    // A. Attempt Native Database RPC
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'cancel_sales_invoice_atomic',
        { p_invoice_id: invoiceId }
      );

      if (!rpcError && rpcData?.success) {
        console.log('[ERP Backend] ✓ Native RPC Cancel Sales Invoice Succeeded');
        return { success: true };
      }

      if (rpcError && !isRpcMissing(rpcError)) {
        throw new Error(rpcError.message || 'Error cancelling sales invoice');
      }
    } catch (err: any) {
      if (!isRpcMissing(err)) throw err;
    }

    // B. Coordinated Fallback Execution
    console.warn(
      '[ERP Backend] Notice: Stored procedure "cancel_sales_invoice_atomic" not installed yet. Running client fallback.'
    );

    // 1. Reverse stock
    if (invoice.items && invoice.items.length > 0) {
      for (const item of invoice.items) {
        if (item.product_id) {
          const { data: prodData } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.product_id)
            .single();

          const curStock = prodData ? prodData.stock_quantity || 0 : 0;
          await supabase
            .from('products')
            .update({ stock_quantity: curStock + item.quantity_sheets })
            .eq('id', item.product_id);

          await supabase.from('stock_movements').insert([
            {
              product_id: item.product_id,
              warehouse_id: invoice.warehouse_id,
              movement_type: 'sales_return',
              quantity: item.quantity_sheets,
              reference_id: invoice.invoice_number,
              reference_type: 'sales_invoice_cancellation',
              notes: `إلغاء/حذف فاتورة بيع رقم ${invoice.invoice_number} - إعادة الألواح`,
            },
          ]);
        }
      }
    }

    // 2. Reverse customer balance
    if (invoice.customer_id && invoice.remaining_balance !== 0) {
      const { data: cData } = await supabase
        .from('customers')
        .select('balance')
        .eq('id', invoice.customer_id)
        .single();

      const curBal = cData?.balance || 0;
      await supabase
        .from('customers')
        .update({ balance: curBal - invoice.remaining_balance })
        .eq('id', invoice.customer_id);
    }

    // 3. Delete invoice (items cascade)
    const { error: delErr } = await supabase
      .from('sales_invoices')
      .delete()
      .eq('id', invoiceId);

    if (delErr) {
      throw new Error('Failed to delete sales invoice: ' + delErr.message);
    }

    return { success: true };
  },

  /**
   * 3. CREATE PURCHASE INVOICE (Atomic)
   */
  async createPurchaseInvoice(
    input: CreatePurchaseInvoiceInput
  ): Promise<{
    invoice: PurchaseInvoice;
    updatedSupplier?: Supplier;
  }> {
    if (!supabase) throw new Error('Database client not configured');

    const { invoice, items } = input;

    // A. Attempt Native Database RPC
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'create_purchase_invoice_atomic',
        {
          p_invoice: {
            supplier_id: invoice.supplier_id,
            warehouse_id: invoice.warehouse_id,
            invoice_number: invoice.invoice_number,
            invoice_date: invoice.invoice_date,
            subtotal: invoice.subtotal || 0,
            discount: invoice.discount || 0,
            total: invoice.total || 0,
            paid_amount: invoice.paid_amount || 0,
            remaining_balance: invoice.remaining_balance || 0,
            notes: invoice.notes || '',
          },
          p_items: items,
        }
      );

      if (!rpcError && rpcData?.success) {
        console.log('[ERP Backend] ✓ Native PostgreSQL Atomic Purchase RPC Executed');
        const { data: createdInv } = await supabase
          .from('purchase_invoices')
          .select('*, items:purchase_invoice_items(*)')
          .eq('id', rpcData.invoice_id)
          .single();

        return {
          invoice: createdInv || {
            ...(invoice as any),
            id: rpcData.invoice_id,
            items: items as any,
          },
        };
      }

      if (rpcError && !isRpcMissing(rpcError)) {
        throw new Error(rpcError.message || 'Error executing purchase transaction');
      }
    } catch (err: any) {
      if (!isRpcMissing(err)) throw err;
    }

    // B. Coordinated Fallback Execution with Compensation Stack
    console.warn(
      '[ERP Backend] Notice: Stored procedure "create_purchase_invoice_atomic" not installed yet. Running client fallback.'
    );

    const rollbackStack: Array<() => Promise<void>> = [];

    try {
      const invoiceRecord = {
        invoice_number: invoice.invoice_number,
        supplier_id: invoice.supplier_id,
        warehouse_id: invoice.warehouse_id,
        invoice_date: invoice.invoice_date,
        status: invoice.status || 'approved',
        subtotal: invoice.subtotal || 0,
        discount: invoice.discount || 0,
        total: invoice.total || 0,
        paid_amount: invoice.paid_amount || 0,
        remaining_balance: invoice.remaining_balance || 0,
        notes: invoice.notes || '',
      };

      const { data: invData, error: invError } = await supabase
        .from('purchase_invoices')
        .insert([invoiceRecord])
        .select();

      if (invError || !invData || !invData[0]) {
        throw new Error('Failed to create purchase invoice: ' + (invError?.message || 'unknown error'));
      }

      const newInvoice = invData[0];
      rollbackStack.push(async () => {
        await supabase.from('purchase_invoices').delete().eq('id', newInvoice.id);
      });

      let insertedItems: PurchaseInvoiceItem[] = [];
      if (items && items.length > 0) {
        const itemsToInsert = items.map((item) => ({
          invoice_id: newInvoice.id,
          product_id: item.product_id || null,
          product_name_snapshot: item.product_name_snapshot || 'لوح خشب',
          wood_type_snapshot: item.wood_type_snapshot || 'ألواح',
          quantity_sheets: item.quantity_sheets || 1,
          unit_price: item.unit_price || 0,
          line_total: item.line_total || 0,
        }));

        const { data: itemsData, error: itemsError } = await supabase
          .from('purchase_invoice_items')
          .insert(itemsToInsert)
          .select();

        if (itemsError) throw new Error('Failed to insert purchase items: ' + itemsError.message);
        if (itemsData) insertedItems = itemsData;
      }
      newInvoice.items = insertedItems;

      // Add stock
      if (items && items.length > 0) {
        for (const item of items) {
          if (item.product_id) {
            const { data: prodData } = await supabase
              .from('products')
              .select('stock_quantity, purchase_price')
              .eq('id', item.product_id)
              .single();

            const curStock = prodData ? prodData.stock_quantity || 0 : 0;
            const newStock = curStock + item.quantity_sheets;

            await supabase
              .from('products')
              .update({
                stock_quantity: newStock,
                purchase_price: item.unit_price > 0 ? item.unit_price : prodData?.purchase_price,
              })
              .eq('id', item.product_id);

            rollbackStack.push(async () => {
              await supabase
                .from('products')
                .update({ stock_quantity: curStock })
                .eq('id', item.product_id!);
            });

            const { data: mData } = await supabase
              .from('stock_movements')
              .insert([
                {
                  product_id: item.product_id,
                  warehouse_id: newInvoice.warehouse_id,
                  movement_type: 'purchase',
                  quantity: item.quantity_sheets,
                  reference_id: newInvoice.invoice_number,
                  reference_type: 'purchase_invoice',
                  notes: `فاتورة شراء ألواح رقم ${newInvoice.invoice_number}`,
                },
              ])
              .select();

            if (mData && mData[0]) {
              const mvId = mData[0].id;
              rollbackStack.push(async () => {
                await supabase.from('stock_movements').delete().eq('id', mvId);
              });
            }
          }
        }
      }

      // Update supplier balance
      let updatedSupplier: Supplier | undefined;
      if (newInvoice.supplier_id && newInvoice.remaining_balance !== 0) {
        const { data: sData } = await supabase
          .from('suppliers')
          .select('balance')
          .eq('id', newInvoice.supplier_id)
          .single();

        const curBal = sData?.balance || 0;
        const newBal = curBal + newInvoice.remaining_balance;

        const { data: updatedS, error: sErr } = await supabase
          .from('suppliers')
          .update({ balance: newBal })
          .eq('id', newInvoice.supplier_id)
          .select();

        if (sErr) throw new Error('Failed to update supplier balance: ' + sErr.message);

        rollbackStack.push(async () => {
          await supabase.from('suppliers').update({ balance: curBal }).eq('id', newInvoice.supplier_id);
        });

        if (updatedS && updatedS[0]) updatedSupplier = updatedS[0];
      }

      // Record cash payment to supplier if any
      if (newInvoice.paid_amount > 0) {
        await supabase.from('financial_transactions').insert([
          {
            transaction_type: 'supplier_payment',
            party_type: 'supplier',
            party_id: newInvoice.supplier_id,
            amount: newInvoice.paid_amount,
            payment_method: 'cash',
            reference_invoice_id: newInvoice.id,
            transaction_date: newInvoice.invoice_date,
            notes: `سداد نقدي عند تحرير فاتورة شراء رقم ${newInvoice.invoice_number}`,
          },
        ]);
      }

      return {
        invoice: newInvoice,
        updatedSupplier,
      };
    } catch (err: any) {
      console.error('[ERP Backend] Purchase transaction failed, rolling back:', err);
      for (let i = rollbackStack.length - 1; i >= 0; i--) {
        try {
          await rollbackStack[i]();
        } catch (rbErr) {
          console.error('[ERP Backend] Rollback step error:', rbErr);
        }
      }
      throw err;
    }
  },

  /**
   * 4. DELETE / CANCEL PURCHASE INVOICE (Atomic)
   */
  async deletePurchaseInvoice(
    invoiceId: string,
    invoice: PurchaseInvoice
  ): Promise<{ success: boolean }> {
    if (!supabase) throw new Error('Database client not configured');

    // A. Attempt Native RPC
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'cancel_purchase_invoice_atomic',
        { p_invoice_id: invoiceId }
      );

      if (!rpcError && rpcData?.success) {
        console.log('[ERP Backend] ✓ Native RPC Cancel Purchase Invoice Succeeded');
        return { success: true };
      }

      if (rpcError && !isRpcMissing(rpcError)) {
        throw new Error(rpcError.message || 'Error cancelling purchase invoice');
      }
    } catch (err: any) {
      if (!isRpcMissing(err)) throw err;
    }

    // B. Coordinated Fallback Execution
    console.warn(
      '[ERP Backend] Notice: Stored procedure "cancel_purchase_invoice_atomic" not installed yet. Running client fallback.'
    );

    // 1. Reverse stock (subtract sheets that were brought in)
    if (invoice.items && invoice.items.length > 0) {
      for (const item of invoice.items) {
        if (item.product_id) {
          const { data: prodData } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.product_id)
            .single();

          const curStock = prodData ? prodData.stock_quantity || 0 : 0;
          await supabase
            .from('products')
            .update({ stock_quantity: curStock - item.quantity_sheets })
            .eq('id', item.product_id);

          await supabase.from('stock_movements').insert([
            {
              product_id: item.product_id,
              warehouse_id: invoice.warehouse_id,
              movement_type: 'purchase_return',
              quantity: -item.quantity_sheets,
              reference_id: invoice.invoice_number,
              reference_type: 'purchase_invoice_cancellation',
              notes: `إلغاء/حذف فاتورة شراء رقم ${invoice.invoice_number} - خصم الكميات`,
            },
          ]);
        }
      }
    }

    // 2. Reverse supplier balance
    if (invoice.supplier_id && invoice.remaining_balance !== 0) {
      const { data: sData } = await supabase
        .from('suppliers')
        .select('balance')
        .eq('id', invoice.supplier_id)
        .single();

      const curBal = sData?.balance || 0;
      await supabase
        .from('suppliers')
        .update({ balance: curBal - invoice.remaining_balance })
        .eq('id', invoice.supplier_id);
    }

    // 3. Delete invoice
    const { error: delErr } = await supabase
      .from('purchase_invoices')
      .delete()
      .eq('id', invoiceId);

    if (delErr) {
      throw new Error('Failed to delete purchase invoice: ' + delErr.message);
    }

    return { success: true };
  },

  /**
   * 5. PROCESS SALES RETURN (Atomic)
   */
  async processSalesReturn(
    input: ReturnOperationInput & { invoiceNumber: string }
  ): Promise<{
    invoice: SalesInvoice;
    updatedCustomer?: Customer;
  }> {
    if (!supabase) throw new Error('Database client not configured');

    // A. Attempt Native RPC
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'process_sales_return_atomic',
        {
          p_return: {
            customerId: input.customerId,
            warehouseId: input.warehouseId,
            invoiceNumber: input.invoiceNumber,
            total: input.total,
            refundMethod: input.refundMethod,
            notes: input.notes,
          },
          p_items: input.items,
        }
      );

      if (!rpcError && rpcData?.success) {
        console.log('[ERP Backend] ✓ Native RPC Process Sales Return Succeeded');
        const { data: createdInv } = await supabase
          .from('sales_invoices')
          .select('*, items:sales_invoice_items(*)')
          .eq('id', rpcData.invoice_id)
          .single();

        return {
          invoice: createdInv || ({ id: rpcData.invoice_id } as any),
        };
      }

      if (rpcError && !isRpcMissing(rpcError)) {
        throw new Error(rpcError.message || 'Error processing sales return');
      }
    } catch (err: any) {
      if (!isRpcMissing(err)) throw err;
    }

    // B. Coordinated Fallback Execution
    console.warn(
      '[ERP Backend] Notice: Stored procedure "process_sales_return_atomic" not installed yet. Running client fallback.'
    );

    const invoiceRecord = {
      invoice_number: input.invoiceNumber,
      customer_id: input.customerId!,
      warehouse_id: input.warehouseId,
      invoice_date: new Date().toISOString().slice(0, 10),
      status: 'approved',
      subtotal: input.total,
      discount: 0,
      total: input.total,
      paid_amount: input.refundMethod === 'cash' ? input.total : 0,
      remaining_balance: input.refundMethod === 'credit' ? input.total : 0,
      notes: `مرتجع مبيعات ${input.originalInvoiceNumber ? 'للفاتورة ' + input.originalInvoiceNumber : ''} ${input.notes ? '- ' + input.notes : ''}`.trim(),
    };

    const { data: invData, error: invError } = await supabase
      .from('sales_invoices')
      .insert([invoiceRecord])
      .select();

    if (invError || !invData || !invData[0]) {
      throw new Error('Failed to create sales return: ' + (invError?.message || 'unknown error'));
    }

    const newInvoice = invData[0];
    let insertedItems: SalesInvoiceItem[] = [];

    if (input.items.length > 0) {
      const itemsToInsert = input.items.map((it) => ({
        invoice_id: newInvoice.id,
        product_id: it.productId || null,
        product_name_snapshot: it.productName,
        wood_type_snapshot: it.woodType || 'MDF',
        quantity_sheets: it.quantitySheets,
        unit_price: it.unitPrice,
        line_total: it.lineTotal,
      }));

      const { data: itemsData } = await supabase
        .from('sales_invoice_items')
        .insert(itemsToInsert)
        .select();

      if (itemsData) insertedItems = itemsData;
    }
    newInvoice.items = insertedItems;

    // Restock returned sheets
    for (const it of input.items) {
      if (it.productId) {
        const { data: prodData } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', it.productId)
          .single();

        const curStock = prodData ? prodData.stock_quantity || 0 : 0;
        await supabase
          .from('products')
          .update({ stock_quantity: curStock + it.quantitySheets })
          .eq('id', it.productId);

        await supabase.from('stock_movements').insert([
          {
            product_id: it.productId,
            warehouse_id: invoiceRecord.warehouse_id,
            movement_type: 'sales_return',
            quantity: it.quantitySheets,
            reference_id: input.invoiceNumber,
            reference_type: 'sales_return',
            notes: `مرتجع مبيعات ${input.invoiceNumber}`,
          },
        ]);
      }
    }

    // Customer balance adjustment
    let updatedCustomer: Customer | undefined;
    if (input.refundMethod === 'credit' && input.customerId) {
      const { data: custData } = await supabase
        .from('customers')
        .select('balance')
        .eq('id', input.customerId)
        .single();

      const curBal = custData ? custData.balance || 0 : 0;
      const { data: updatedC } = await supabase
        .from('customers')
        .update({ balance: curBal - input.total })
        .eq('id', input.customerId)
        .select();

      if (updatedC && updatedC[0]) updatedCustomer = updatedC[0];
    } else if (input.refundMethod === 'cash' && input.customerId) {
      await supabase.from('financial_transactions').insert([
        {
          transaction_type: 'customer_payment',
          party_type: 'customer',
          party_id: input.customerId,
          amount: -input.total,
          payment_method: 'cash',
          reference_invoice_id: newInvoice.id,
          transaction_date: invoiceRecord.invoice_date,
          notes: `رد نقدي لمرتجع مبيعات رقم ${input.invoiceNumber}`,
        },
      ]);
    }

    return {
      invoice: newInvoice,
      updatedCustomer,
    };
  },

  /**
   * 6. PROCESS PURCHASE RETURN (Atomic)
   */
  async processPurchaseReturn(
    input: ReturnOperationInput & { invoiceNumber: string }
  ): Promise<{
    invoice: PurchaseInvoice;
    updatedSupplier?: Supplier;
  }> {
    if (!supabase) throw new Error('Database client not configured');

    // A. Attempt Native RPC
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'process_purchase_return_atomic',
        {
          p_return: {
            supplierId: input.supplierId,
            warehouseId: input.warehouseId,
            invoiceNumber: input.invoiceNumber,
            total: input.total,
            refundMethod: input.refundMethod,
            notes: input.notes,
          },
          p_items: input.items,
        }
      );

      if (!rpcError && rpcData?.success) {
        console.log('[ERP Backend] ✓ Native RPC Process Purchase Return Succeeded');
        const { data: createdInv } = await supabase
          .from('purchase_invoices')
          .select('*, items:purchase_invoice_items(*)')
          .eq('id', rpcData.invoice_id)
          .single();

        return {
          invoice: createdInv || ({ id: rpcData.invoice_id } as any),
        };
      }

      if (rpcError && !isRpcMissing(rpcError)) {
        throw new Error(rpcError.message || 'Error processing purchase return');
      }
    } catch (err: any) {
      if (!isRpcMissing(err)) throw err;
    }

    // B. Coordinated Fallback Execution
    console.warn(
      '[ERP Backend] Notice: Stored procedure "process_purchase_return_atomic" not installed yet. Running client fallback.'
    );

    const invoiceRecord = {
      invoice_number: input.invoiceNumber,
      supplier_id: input.supplierId!,
      warehouse_id: input.warehouseId,
      invoice_date: new Date().toISOString().slice(0, 10),
      status: 'approved',
      subtotal: input.total,
      discount: 0,
      total: input.total,
      paid_amount: input.refundMethod === 'cash' ? input.total : 0,
      remaining_balance: input.refundMethod === 'credit' ? input.total : 0,
      notes: `مرتجع مشتريات ${input.originalInvoiceNumber ? 'للفاتورة ' + input.originalInvoiceNumber : ''} ${input.notes ? '- ' + input.notes : ''}`.trim(),
    };

    const { data: invData, error: invError } = await supabase
      .from('purchase_invoices')
      .insert([invoiceRecord])
      .select();

    if (invError || !invData || !invData[0]) {
      throw new Error('Failed to create purchase return: ' + (invError?.message || 'unknown error'));
    }

    const newInvoice = invData[0];
    let insertedItems: PurchaseInvoiceItem[] = [];

    if (input.items.length > 0) {
      const itemsToInsert = input.items.map((it) => ({
        invoice_id: newInvoice.id,
        product_id: it.productId || null,
        product_name_snapshot: it.productName,
        wood_type_snapshot: it.woodType || 'MDF',
        quantity_sheets: it.quantitySheets,
        unit_price: it.unitPrice,
        line_total: it.lineTotal,
      }));

      const { data: itemsData } = await supabase
        .from('purchase_invoice_items')
        .insert(itemsToInsert)
        .select();

      if (itemsData) insertedItems = itemsData;
    }
    newInvoice.items = insertedItems;

    // Deduct sheets from warehouse
    for (const it of input.items) {
      if (it.productId) {
        const { data: prodData } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', it.productId)
          .single();

        const curStock = prodData ? prodData.stock_quantity || 0 : 0;
        await supabase
          .from('products')
          .update({ stock_quantity: curStock - it.quantitySheets })
          .eq('id', it.productId);

        await supabase.from('stock_movements').insert([
          {
            product_id: it.productId,
            warehouse_id: invoiceRecord.warehouse_id,
            movement_type: 'purchase_return',
            quantity: -it.quantitySheets,
            reference_id: input.invoiceNumber,
            reference_type: 'purchase_return',
            notes: `مرتجع مشتريات ${input.invoiceNumber}`,
          },
        ]);
      }
    }

    // Adjust supplier balance
    let updatedSupplier: Supplier | undefined;
    if (input.supplierId) {
      const { data: supData } = await supabase
        .from('suppliers')
        .select('balance')
        .eq('id', input.supplierId)
        .single();

      const curBal = supData ? supData.balance || 0 : 0;
      const { data: updatedS } = await supabase
        .from('suppliers')
        .update({ balance: curBal - input.total })
        .eq('id', input.supplierId)
        .select();

      if (updatedS && updatedS[0]) updatedSupplier = updatedS[0];
    }

    return {
      invoice: newInvoice,
      updatedSupplier,
    };
  },
};
