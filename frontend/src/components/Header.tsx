
import { FileSpreadsheet } from "lucide-react";

export function Header() {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-600">
          <FileSpreadsheet className="w-6 h-6" />
          <h1 className="font-bold text-lg tracking-tight text-slate-800">
            TenPla
          </h1>
        </div>
      </div>
    </header>
  );
}
