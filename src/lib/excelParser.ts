import * as XLSX from 'xlsx';
import { Customer, Product, Supplier, ImportPreviewRow } from '../types';

export class ExcelParser {
  private static productHeaderMap: Record<string, string> = {
    'اسم المنتج': 'name',
    'اسم الصنف': 'name',
    'اسم اللوح': 'name',
    'الصنف': 'name',
    'المنتج': 'name',
    'product name': 'name',

    'كود المنتج': 'code',
    'كود اللوح': 'code',
    'الكود': 'code',
    'sku': 'code',

    'نوع الخشب': 'wood_type',
    'نوع اللوح': 'wood_type',
    'النوع': 'wood_type',
    'wood type': 'wood_type',

    'التصنيف': 'category',
    'الفئة': 'category',

    'سعر الشراء': 'purchase_price',
    'سعر التكلفة': 'purchase_price',

    'سعر البيع': 'selling_price',
    'السعر': 'selling_price',
    'سعر البيع للوح': 'selling_price',

    'رصيد الألواح': 'stock_quantity',
    'عدد الألواح': 'stock_quantity',
    'الكمية': 'stock_quantity',
    'المخزون': 'stock_quantity',

    'الحد الأدنى': 'min_stock_level',

    'المورد': 'supplier_name',
    'ملاحظات': 'notes',
  };

  private static customerHeaderMap: Record<string, string> = {
    'الاسم': 'name',
    'اسم العميل': 'name',
    'العميل': 'name',

    'كود العميل': 'code',
    'الكود': 'code',

    'رقم التلفون': 'mobile',
    'رقم الهاتف': 'mobile',
    'الموبايل': 'mobile',
    'التليفون': 'mobile',
    'الهاتف': 'mobile',

    'العنوان': 'address',
    'المحافظة': 'address',
    'ملاحظات': 'notes',
  };

  // Removes a leading UTF-8 BOM (common in CSV files saved from Excel/Windows) and trims whitespace.
  private static cleanCell(value: any): string {
    return String(value ?? '').replace(/^\uFEFF/, '').trim();
  }

  public static async parseFile(file: File): Promise<Record<string, any>[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Read the sheet as a raw 2D array first (no header assumption yet). This lets us
          // find the *real* header row even if the file starts with a title, a legend/notes
          // row, merged cells, or blank rows above the actual table — instead of always
          // blindly trusting row 1, which is what caused "Product name required" / "selling
          // price required" on every row when the first row wasn't the header row.
          const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, {
            header: 1,
            defval: '',
            blankrows: false,
          });

          const knownHeaders = new Set([
            ...Object.keys(this.productHeaderMap),
            ...Object.keys(this.customerHeaderMap),
          ]);

          // Score each of the first few rows by how many cells match a known header name,
          // and pick the row with the best score as the real header row.
          let headerRowIdx = 0;
          let bestScore = -1;
          const scanLimit = Math.min(rows.length, 10);
          for (let i = 0; i < scanLimit; i++) {
            const row = rows[i] || [];
            const score = row.reduce((acc: number, cell) => {
              const clean = this.cleanCell(cell).toLowerCase();
              return acc + (clean && knownHeaders.has(clean) ? 1 : 0);
            }, 0);
            if (score > bestScore) {
              bestScore = score;
              headerRowIdx = i;
            }
          }

          // Nothing matched a known header at all: fall back to the first non-empty row
          // (old behavior), rather than guessing further.
          if (bestScore <= 0) {
            const firstNonEmpty = rows.findIndex((r) => (r || []).some((cell) => this.cleanCell(cell) !== ''));
            headerRowIdx = firstNonEmpty >= 0 ? firstNonEmpty : 0;
          }

          const headerRow = (rows[headerRowIdx] || []).map((h) => this.cleanCell(h));
          const dataRows = rows.slice(headerRowIdx + 1);

          const json: Record<string, any>[] = dataRows
            .filter((r) => (r || []).some((cell) => this.cleanCell(cell) !== '')) // skip blank rows
            .map((r) => {
              const obj: Record<string, any> = {};
              headerRow.forEach((h, colIdx) => {
                if (h) obj[h] = r[colIdx] ?? '';
              });
              return obj;
            });

          resolve(json);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }

  public static normalizeMobile(mobileRaw: any): string {
    if (!mobileRaw) return '';
    const str = String(mobileRaw).trim();
    let clean = str.replace(/[\s\-\(\)]/g, '');
    if (clean.startsWith('+20')) clean = '0' + clean.slice(3);
    else if (clean.startsWith('20') && clean.length > 10) clean = '0' + clean.slice(2);
    return clean;
  }

  public static previewProducts(
    rawRows: Record<string, any>[],
    existingProducts: Product[]
  ): ImportPreviewRow<Product>[] {
    const existingCodeMap = new Map<string, Product>();
    const existingNameTypeMap = new Map<string, Product>();

    existingProducts.forEach((p) => {
      if (p.code) existingCodeMap.set(p.code.trim().toLowerCase(), p);
      const compositeKey = `${p.name.trim().toLowerCase()}_${(p.wood_type || '').trim().toLowerCase()}`;
      existingNameTypeMap.set(compositeKey, p);
    });

    return rawRows.map((row, idx) => {
      const parsed: Partial<Product> = {
        code: `WOOD-${String(idx + 1).padStart(4, '0')}`,
        name: '',
        wood_type: 'MDF',
        category: 'ألواح أخشاب',
        purchase_price: 0,
        selling_price: 0,
        stock_quantity: 0,
        min_stock_level: 10,
        notes: '',
      };

      Object.keys(row).forEach((header) => {
        const cleanHeader = header.trim().toLowerCase();
        const fieldKey = this.productHeaderMap[cleanHeader];
        if (fieldKey) {
          const rawVal = row[header];
          if (fieldKey === 'purchase_price' || fieldKey === 'selling_price' || fieldKey === 'stock_quantity' || fieldKey === 'min_stock_level') {
            const num = parseFloat(String(rawVal).replace(/[^0-9.]/g, ''));
            (parsed as any)[fieldKey] = isNaN(num) ? 0 : num;
          } else {
            (parsed as any)[fieldKey] = String(rawVal).trim();
          }
        }
      });

      const validationErrors: string[] = [];
      if (!parsed.name) validationErrors.push('اسم اللوح/المنتج مطلوب (Product name required)');
      if (parsed.selling_price === undefined || parsed.selling_price <= 0) {
        validationErrors.push('سعر البيع يجب أن يكون أكبر من 0 (Valid selling price > 0 required)');
      }

      if (validationErrors.length > 0) {
        return {
          rowIndex: idx + 2,
          raw: row,
          parsed,
          status: 'invalid',
          validationErrors,
        };
      }

      // Check existing by code or name+wood_type
      let matched: Product | undefined;
      if (parsed.code) {
        matched = existingCodeMap.get(parsed.code.trim().toLowerCase());
      }
      if (!matched) {
        const compositeKey = `${parsed.name!.trim().toLowerCase()}_${(parsed.wood_type || '').trim().toLowerCase()}`;
        matched = existingNameTypeMap.get(compositeKey);
      }

      if (matched) {
        const changes: Record<string, { old: any; new: any }> = {};
        let isDifferent = false;

        if (parsed.selling_price !== matched.selling_price) {
          changes.selling_price = { old: matched.selling_price, new: parsed.selling_price };
          isDifferent = true;
        }
        if (parsed.purchase_price && parsed.purchase_price !== matched.purchase_price) {
          changes.purchase_price = { old: matched.purchase_price, new: parsed.purchase_price };
          isDifferent = true;
        }
        if (parsed.stock_quantity && parsed.stock_quantity !== matched.stock_quantity) {
          changes.stock_quantity = { old: matched.stock_quantity, new: parsed.stock_quantity };
          isDifferent = true;
        }

        return {
          rowIndex: idx + 2,
          raw: row,
          parsed,
          status: isDifferent ? 'update' : 'skip',
          existingRecord: matched,
          changes: isDifferent ? changes : undefined,
        };
      }

      return {
        rowIndex: idx + 2,
        raw: row,
        parsed,
        status: 'new',
      };
    });
  }

  public static previewCustomers(
    rawRows: Record<string, any>[],
    existingCustomers: Customer[]
  ): ImportPreviewRow<Customer>[] {
    const existingMobileMap = new Map<string, Customer>();
    existingCustomers.forEach((c) => {
      const normMob = this.normalizeMobile(c.mobile);
      if (normMob) existingMobileMap.set(normMob, c);
    });

    return rawRows.map((row, idx) => {
      const parsed: Partial<Customer> = {
        code: `CUST-${String(idx + 1).padStart(3, '0')}`,
        name: '',
        mobile: '',
        address: '',
        notes: '',
        balance: 0,
      };

      Object.keys(row).forEach((header) => {
        const cleanHeader = header.trim().toLowerCase();
        const fieldKey = this.customerHeaderMap[cleanHeader];
        if (fieldKey) {
          const val = String(row[header]).trim();
          if (fieldKey === 'mobile') {
            parsed.mobile = this.normalizeMobile(val);
          } else {
            (parsed as any)[fieldKey] = val;
          }
        }
      });

      const validationErrors: string[] = [];
      if (!parsed.name) validationErrors.push('اسم العميل مطلوب');
      if (!parsed.mobile) validationErrors.push('رقم الهاتف مطلوب');

      if (validationErrors.length > 0) {
        return {
          rowIndex: idx + 2,
          raw: row,
          parsed,
          status: 'invalid',
          validationErrors,
        };
      }

      const matched = existingMobileMap.get(parsed.mobile!);
      if (matched) {
        const changes: Record<string, { old: any; new: any }> = {};
        let isDifferent = false;
        if (parsed.name && parsed.name !== matched.name) {
          changes.name = { old: matched.name, new: parsed.name };
          isDifferent = true;
        }
        if (parsed.address && parsed.address !== matched.address) {
          changes.address = { old: matched.address || '', new: parsed.address };
          isDifferent = true;
        }

        return {
          rowIndex: idx + 2,
          raw: row,
          parsed,
          status: isDifferent ? 'update' : 'skip',
          existingRecord: matched,
          changes: isDifferent ? changes : undefined,
        };
      }

      return {
        rowIndex: idx + 2,
        raw: row,
        parsed,
        status: 'new',
      };
    });
  }

  // Download Excel Sample Templates
  public static downloadWoodProductTemplate() {
    const templateData = [
      {
        'كود المنتج': 'WOOD-0001',
        'اسم المنتج': 'لوح MDF أبيض إسباني 18 مم',
        'نوع الخشب': 'MDF',
        'التصنيف': 'ألواح MDF',
        'سعر الشراء': 450,
        'سعر البيع': 520,
        'رصيد الألواح': 250,
        'الحد الأدنى': 20,
        'ملاحظات': 'عالي الجودة متين',
      },
      {
        'كود المنتج': 'WOOD-0002',
        'اسم المنتج': 'لوح كونتر حبيبي 16 مم',
        'نوع الخشب': 'كونتر',
        'التصنيف': 'ألواح كونتر',
        'سعر الشراء': 320,
        'سعر البيع': 380,
        'رصيد الألواح': 180,
        'الحد الأدنى': 15,
        'ملاحظات': 'درجة أولى',
      },
      {
        'كود المنتج': 'WOOD-0003',
        'اسم المنتج': 'لوح أبلكاش كوريا 4 مم',
        'نوع الخشب': 'أبلكاش',
        'التصنيف': 'أبلكاش',
        'سعر الشراء': 140,
        'سعر البيع': 175,
        'رصيد الألواح': 300,
        'الحد الأدنى': 30,
        'ملاحظات': 'مقاوم للرطوبة',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'نموذج أخشاب الدالي');
    XLSX.writeFile(workbook, 'نموذج_استيراد_منتجات_الأخشاب_شركة_الدالي.xlsx');
  }

  public static downloadCustomerTemplate() {
    const templateData = [
      {
        'كود العميل': 'CUST-001',
        'اسم العميل': 'حسام الجيار',
        'رقم التلفون': '01119970044',
        'العنوان': 'البدرشين',
      },
      {
        'كود العميل': 'CUST-002',
        'اسم العميل': 'اسلام الريس',
        'رقم التلفون': '01115838530',
        'العنوان': 'البدرشين',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'نموذج عملاء الدالي');
    XLSX.writeFile(workbook, 'نموذج_استيراد_العملاء_شركة_الدالي.xlsx');
  }
}
