import React, { useState } from 'react';
import { Customer, Product, ImportPreviewRow } from '../types';
import { ExcelParser } from '../lib/excelParser';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  Download,
  RefreshCw,
  FileCheck,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

interface ImportPageProps {
  existingCustomers: Customer[];
  existingProducts: Product[];
  language: 'ar' | 'en';
  onCommitCustomersImport: (
    newCusts: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'balance'>[],
    updates: { id: string; changes: Partial<Customer> }[]
  ) => void;
  onCommitProductsImport: (
    newProds: Omit<Product, 'id' | 'created_at' | 'updated_at'>[],
    updates: { id: string; changes: Partial<Product> }[]
  ) => void;
}

export const ImportPage: React.FC<ImportPageProps> = ({
  existingCustomers,
  existingProducts,
  language,
  onCommitCustomersImport,
  onCommitProductsImport,
}) => {
  const [importType, setImportType] = useState<'products' | 'customers'>('products');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  // Staged rows
  const [customerPreviews, setCustomerPreviews] = useState<ImportPreviewRow<Customer>[] | null>(null);
  const [productPreviews, setProductPreviews] = useState<ImportPreviewRow<Product>[] | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setCustomerPreviews(null);
      setProductPreviews(null);
      setProgressPercent(0);
    }
  };

  const handleProcessFile = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setProgressPercent(20);
    try {
      const rawJson = await ExcelParser.parseFile(selectedFile);
      setProgressPercent(60);

      if (importType === 'products') {
        const previews = ExcelParser.previewProducts(rawJson, existingProducts);
        setProductPreviews(previews);
      } else {
        const previews = ExcelParser.previewCustomers(rawJson, existingCustomers);
        setCustomerPreviews(previews);
      }
      setProgressPercent(100);
    } catch (err) {
      alert(language === 'ar' ? 'حدث خطأ في استخراج بيانات ملف الإكسيل' : 'Failed to parse Excel file');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCommit = () => {
    if (importType === 'products' && productPreviews) {
      const newItems: Omit<Product, 'id' | 'created_at' | 'updated_at'>[] = [];
      const updateItems: { id: string; changes: Partial<Product> }[] = [];

      productPreviews.forEach((row) => {
        if (row.status === 'new') {
          newItems.push({
            code: row.parsed.code || `WOOD-${String(newItems.length + 1).padStart(4, '0')}`,
            name: row.parsed.name || '',
            wood_type: row.parsed.wood_type || 'MDF',
            category: row.parsed.category || 'ألواح أخشاب',
            purchase_price: row.parsed.purchase_price || 0,
            selling_price: row.parsed.selling_price || 0,
            stock_quantity: row.parsed.stock_quantity || 0,
            min_stock_level: row.parsed.min_stock_level || 10,
            notes: row.parsed.notes || '',
            is_active: true,
          });
        } else if (row.status === 'update' && row.existingRecord && row.changes) {
          const changeObj: Partial<Product> = {};
          Object.keys(row.changes).forEach((k) => {
            (changeObj as any)[k] = row.changes![k].new;
          });
          updateItems.push({ id: row.existingRecord.id, changes: changeObj });
        }
      });

      onCommitProductsImport(newItems, updateItems);
      setProductPreviews(null);
      setSelectedFile(null);
      alert(
        language === 'ar'
          ? `تم استيراد (${newItems.length}) أصناف أخشاب جديدة وتحديث (${updateItems.length}) أصناف بنجاح!`
          : 'Products imported successfully!'
      );
    } else if (importType === 'customers' && customerPreviews) {
      const newItems: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'balance'>[] = [];
      const updateItems: { id: string; changes: Partial<Customer> }[] = [];

      customerPreviews.forEach((row) => {
        if (row.status === 'new') {
          newItems.push({
            code: row.parsed.code || `CUST-${String(newItems.length + 1).padStart(3, '0')}`,
            name: row.parsed.name || '',
            mobile: row.parsed.mobile || '',
            address: row.parsed.address || '',
            notes: row.parsed.notes || '',
          });
        } else if (row.status === 'update' && row.existingRecord && row.changes) {
          const changeObj: Partial<Customer> = {};
          Object.keys(row.changes).forEach((k) => {
            (changeObj as any)[k] = row.changes![k].new;
          });
          updateItems.push({ id: row.existingRecord.id, changes: changeObj });
        }
      });

      onCommitCustomersImport(newItems, updateItems);
      setCustomerPreviews(null);
      setSelectedFile(null);
      alert(
        language === 'ar'
          ? `تم استيراد وتحديث (${newItems.length + updateItems.length}) سجل عميل بنجاح!`
          : 'Customers imported successfully!'
      );
    }
  };

  const activePreviews = importType === 'products' ? productPreviews : customerPreviews;
  const newCount = activePreviews?.filter((r) => r.status === 'new').length || 0;
  const updateCount = activePreviews?.filter((r) => r.status === 'update').length || 0;
  const skipCount = activePreviews?.filter((r) => r.status === 'skip').length || 0;
  const invalidCount = activePreviews?.filter((r) => r.status === 'invalid').length || 0;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            <span>{language === 'ar' ? 'محرك استيراد ملفات Excel' : 'Excel Batch Import Engine'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'رفع وتحديث شيتات الألواح وقوائم العملاء مع الفحص الآلي واكتشاف التعديلات'
              : 'Bulk import wooden sheets and customer data with smart diff preview.'}
          </p>
        </div>

        {/* Download Sample Templates Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => ExcelParser.downloadWoodProductTemplate()}
            className="flex items-center gap-1.5 bg-[#0e1424] hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-semibold text-xs px-3 py-1.5 rounded-md shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>نموذج إكسيل أصناف أخشاب</span>
          </button>
          <button
            onClick={() => ExcelParser.downloadCustomerTemplate()}
            className="flex items-center gap-1.5 bg-[#0e1424] hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-semibold text-xs px-3 py-1.5 rounded-md shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>نموذج إكسيل عملاء</span>
          </button>
        </div>
      </div>

      {/* Upload Wizard Card */}
      <div className="bg-[#0e1424] rounded-lg p-5 border border-slate-800/80 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-300">
            نوع البيانات المراد استيرادها:
          </span>
          <div className="flex items-center gap-1.5 bg-[#0b0f19] p-1 rounded-md border border-slate-800">
            <button
              onClick={() => {
                setImportType('products');
                setProductPreviews(null);
                setCustomerPreviews(null);
              }}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                importType === 'products'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ألواح الأخشاب (Wood Sheets)
            </button>
            <button
              onClick={() => {
                setImportType('customers');
                setProductPreviews(null);
                setCustomerPreviews(null);
              }}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                importType === 'customers'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              سجل العملاء (Customers)
            </button>
          </div>
        </div>

        {/* Dropzone */}
        <div className="border border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-amber-500/70 transition bg-[#0b0f19]">
          <UploadCloud className="w-8 h-8 mx-auto text-amber-400 mb-2 stroke-[1.5]" />
          <p className="text-xs font-bold text-slate-200">
            اسحب وأفلت ملف Excel هنا أو اضغط لتحديد الملف من جهازك
          </p>
          <p className="text-[11px] text-slate-500 mt-1">يدعم امتدادات .xlsx و .xls و .csv</p>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="mt-3 block mx-auto text-xs text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
          />
        </div>

        {/* Selected File & Progress Bar */}
        {selectedFile && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between bg-[#0b0f19] p-3 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-xs font-bold text-slate-200">{selectedFile.name}</div>
                  <div className="text-[11px] font-mono text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>

              <button
                onClick={handleProcessFile}
                disabled={isLoading}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-semibold px-4 py-1.5 rounded-md shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري فحص الملف...</span>
                  </>
                ) : (
                  <span>فحص ومعاينة السجلات</span>
                )}
              </button>
            </div>

            {isLoading && (
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-amber-500 h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Staged Data Preview */}
      {activePreviews && (
        <div className="bg-[#0e1424] rounded-lg p-5 border border-slate-800/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                نتائج فحص ومعاينة البيانات المرفوعة
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                راجع الفروقات والسجلات الجديدة قبل اعتماد الحفظ النهائي في قاعدة البيانات
              </p>
            </div>

            <button
              onClick={handleConfirmCommit}
              disabled={newCount === 0 && updateCount === 0}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs px-4 py-2 rounded-md shadow-xs transition flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تأكيد واعتماد الحفظ ({newCount + updateCount} سجل)</span>
            </button>
          </div>

          {/* Breakdown Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-[#0b0f19] rounded-lg border border-slate-800">
              <div className="text-[10px] font-semibold text-emerald-400 uppercase">سجلات جديدة (+)</div>
              <div className="text-xl font-black font-mono tabular-nums text-emerald-400 mt-0.5">{newCount}</div>
            </div>

            <div className="p-3 bg-[#0b0f19] rounded-lg border border-slate-800">
              <div className="text-[10px] font-semibold text-amber-400 uppercase">تعديل سجلات قائمة</div>
              <div className="text-xl font-black font-mono tabular-nums text-amber-400 mt-0.5">{updateCount}</div>
            </div>

            <div className="p-3 bg-[#0b0f19] rounded-lg border border-slate-800">
              <div className="text-[10px] font-semibold text-slate-400 uppercase">متطابقة (تخطي)</div>
              <div className="text-xl font-black font-mono tabular-nums text-slate-400 mt-0.5">{skipCount}</div>
            </div>

            <div className="p-3 bg-[#0b0f19] rounded-lg border border-slate-800">
              <div className="text-[10px] font-semibold text-rose-400 uppercase">سجلات بها أخطاء</div>
              <div className="text-xl font-black font-mono tabular-nums text-rose-400 mt-0.5">{invalidCount}</div>
            </div>
          </div>

          {/* Table Preview */}
          <div className="border border-slate-800 rounded-lg overflow-x-auto max-h-96">
            <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-900/95 sticky top-0 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5"># الصف</th>
                  <th className="px-4 py-2.5">الحالة</th>
                  <th className="px-4 py-2.5">البيانات المستخرجة</th>
                  <th className="px-4 py-2.5">التغييرات / الملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {activePreviews.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-500 text-[11px]">{row.rowIndex}</td>
                    <td className="px-4 py-3">
                      {row.status === 'new' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          صنف جديد
                        </span>
                      )}
                      {row.status === 'update' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          تحديث سعر/بيانات
                        </span>
                      )}
                      {row.status === 'skip' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700/80">
                          تخطي
                        </span>
                      )}
                      {row.status === 'invalid' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          بيانات ناقصة
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {importType === 'products' ? (
                        <div>
                          <div className="font-semibold text-slate-100">{row.parsed.name || '—'}</div>
                          <div className="text-slate-400 text-[11px] mt-0.5">
                            {row.parsed.wood_type} • رصيد: <span className="font-mono text-slate-300">{row.parsed.stock_quantity}</span> لوح • سعر بيع: <span className="font-mono text-amber-400">{row.parsed.selling_price}</span> ج.م
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold text-slate-100">{row.parsed.name || '—'}</div>
                          <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                            {row.parsed.mobile} • {row.parsed.address || '—'}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.changes && (
                        <div className="text-[11px] text-amber-400 space-y-0.5">
                          {Object.keys(row.changes).map((k) => (
                            <div key={k} className="flex items-center gap-1 font-mono">
                              <span className="text-slate-400">{k}:</span>
                              <span className="line-through text-slate-500">{row.changes![k].old}</span>
                              <ArrowRight className="w-3 h-3 text-amber-400" />
                              <span className="font-bold text-amber-300">{row.changes![k].new}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {row.validationErrors && (
                        <div className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          <span>{row.validationErrors.join(' | ')}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
