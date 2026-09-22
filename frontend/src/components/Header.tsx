import { TenPlaIcon } from "./TenPlaIcon";

/**
 * Headerの概要
 *  @returns
 */
export function Header() {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="bg-slate-90 rounded-lg text-white shadow">
          <TenPlaIcon
            size={43}
            className="hover:scale-105 transition-transform"
          />
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
