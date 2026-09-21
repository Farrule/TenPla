import { FileSpreadsheet } from "lucide-react";

/**
 * Headerの概要
 *  @returns 
 */
export function Header() {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-indigo-600 rounded-lg text-white shadow">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            TenPla
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            PDF to Excel 自動転記システム
          </p>
        </div>
      </div>
    </header>
  );
}
