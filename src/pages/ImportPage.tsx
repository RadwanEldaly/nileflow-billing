import React, { useState } from 'react';
import { Customer, Product, ImportPreviewRow } from '../types';
import { ExcelParser } from '../lib/excelParser';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  Download,
  RefreshCw,
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
      alert(language === 'ar' ? `تم استيراد (${newItems.length}) أصناف أخشاب جديدة وتحديث (${updateItems.length}) أصناف بنجاح!` : 'Products imported successfully!');
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
      alert(language === 'ar' ? `تم استيراد وتحديث (${newItems.length + updateItems.length}) سجل عميل بنجاح!` : 'Customers imported successfully!');
    }
  };

  const activePreviews = importType === 'products' ? productPreviews : customerPreviews;
  const newCount = activePreviews?.filter((r) => r.status === 'new').length || 0;
  const updateCount = activePreviews?.filter((r) => r.status === 'update').length || 0;
  const skipCount = activePreviews?.filter((r) => r.status === 'skip').length || 0;
  const invalidCount = activePreviews?.filter((r) => r.status === 'invalid').length || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            <span>{language === 'ar' ? 'استيراد الأخشاب والعملاء من Excel' : 'Excel Batch Import Engine'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar'
              ? 'رفع شيتات الأخشاب والعملاء الضخمة، المعاينة الذكية والتأكد قبل الاعتماد لمنع التكرار'
              : 'Bulk import wooden sheets and customer data with smart diff preview.'}
          </p>
        </div>

        {/* Download Sample Templates Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => ExcelParser.downloadWoodProductTemplate()}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 shadow-sm transition"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>نموذج شيت أخشاب جاهز</span>
          </button>
          <button
            onClick={() => ExcelParser.downloadCustomerTemplate()}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 shadow-sm transition"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>نموذج عملاء جاهز</span>
          </button>
        </div>
      </div>

      {/* Upload Wizard Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            اختر نوع البيانات المراد استيرادها:
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setImportType('products');
                setProductPreviews(null);
                setCustomerPreviews(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                importType === 'products'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
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
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                importType === 'customers'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              سجل العملاء (Customers)
            </button>
          </div>
        </div>

        {/* Dropzone */}
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-amber-500 transition bg-slate-50/50 dark:bg-slate-900/30">
          <UploadCloud className="w-12 h-12 mx-auto text-amber-600 mb-3" />
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            اسحب وأسقط ملف الإكسيل هنا أو اضغط للاختيار من جهازك
          </p>
          <p className="text-xs text-slate-400 mt-1">يدعم صيغ .xlsx و .xls و .csv</p>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="mt-4 block mx-auto text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
          />
        </div>

        {/* Selected File & Progress Bar */}
        {selectedFile && (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-200 dark:border-amber-900">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-amber-600" />
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{selectedFile.name}</div>
                  <div className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>

              <button
                onClick={handleProcessFile}
                disabled={isLoading}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري تحليل البيانات...</span>
                  </>
                ) : (
                  <span>فحص ومعاينة البيانات</span>
                )}
              </button>
            </div>

            {isLoading && (
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-600 h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Staged Data Preview */}
      {activePreviews && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                نتائج المعاينة والفحص - شركة الدالي
              </h3>
              <p className="text-xs text-slate-500">
                مراجعة السجلات والتغييرات قبل الاعتماد النهائي بقاعدة البيانات
              </p>
            </div>

            <button
              onClick={handleConfirmCommit}
              disabled={newCount === 0 && updateCount === 0}
              className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>تأكيد واعتماد الحفظ ({newCount + updateCount} سجل)</span>
            </button>
          </div>

          {/* Breakdown Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200">
              <div className="text-[11px] font-bold text-emerald-700 uppercase">سجلات جديدة (+)</div>
              <div className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-300 mt-1">{newCount}</div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200">
              <div className="text-[11px] font-bold text-amber-700 uppercase">تعديل سجلات قائمة</div>
              <div className="text-2xl font-extrabold text-amber-800 dark:text-amber-300 mt-1">{updateCount}</div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase">سجلات متطابقة (تخطي)</div>
              <div className="text-2xl font-extrabold text-slate-700 dark:text-slate-300 mt-1">{skipCount}</div>
            </div>

            <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200">
              <div className="text-[11px] font-bold text-red-700 uppercase">سجلات غير صالحة</div>
              <div className="text-2xl font-extrabold text-red-800 dark:text-red-300 mt-1">{invalidCount}</div>
            </div>
          </div>

          {/* Table Preview */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto max-h-96">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 font-bold">
                <tr>
                  <th className="p-3 border-b"># الصف</th>
                  <th className="p-3 border-b">الحالة</th>
                  <th className="p-3 border-b">البيانات المستخرجة</th>
                  <th className="p-3 border-b">التغييرات / الأخطاء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {activePreviews.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="p-3 font-mono font-bold text-slate-500">{row.rowIndex}</td>
                    <td className="p-3">
                      {row.status === 'new' && <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold">جديد</span>}
                      {row.status === 'update' && <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 font-bold">تحديث</span>}
                      {row.status === 'skip' && <span className="px-2 py-1 rounded bg-slate-100 text-slate-600">تخطي</span>}
                      {row.status === 'invalid' && <span className="px-2 py-1 rounded bg-red-100 text-red-800 font-bold">خطأ</span>}
                    </td>
                    <td className="p-3 font-medium">
                      {importType === 'products' ? (
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{row.parsed.name || '-'}</div>
                          <div className="text-slate-500">{row.parsed.wood_type} • رصيد: {row.parsed.stock_quantity} لوح • سعر: {row.parsed.selling_price} EGP</div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{row.parsed.name || '-'}</div>
                          <div className="text-slate-500 font-mono">{row.parsed.mobile} • {row.parsed.address}</div>
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      {row.changes && (
                        <div className="text-[11px] text-amber-700">
                          {Object.keys(row.changes).map((k) => (
                            <div key={k}>
                              <span className="font-bold">{k}:</span> {row.changes![k].old} $\rightarrow$ <span className="font-bold">{row.changes![k].new}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {row.validationErrors && (
                        <div className="text-[11px] text-red-600 font-bold">
                          {row.validationErrors.join(' | ')}
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
