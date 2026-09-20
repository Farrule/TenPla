
import { Building2, Plus, RefreshCw } from "lucide-react";
import { CompanySummary } from "../api/client";

interface CompanySelectorProps {
  companies: CompanySummary[];
  selectedCompanyId: string;
  onCompanyChange: (id: string) => void;
  onLoadCompanies: () => void;
  onOpenEditor: (id: string | null) => void;
}

export function CompanySelector({
  companies,
  selectedCompanyId,
  onCompanyChange,
  onLoadCompanies,
  onOpenEditor,
}: CompanySelectorProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex-1">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            取引先（フォーマット）選択
          </label>
          <div className="flex gap-2">
            <select
              value={selectedCompanyId}
              onChange={(e) => onCompanyChange(e.target.value)}
              className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="" disabled>
                -- 選択してください --
              </option>
              {companies.map((c) => (
                <option key={c.company_id} value={c.company_id}>
                  {c.company_name}
                </option>
              ))}
            </select>
            <button
              onClick={onLoadCompanies}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
              title="フォーマット一覧を再読込"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          {selectedCompanyId && (
            <button
              onClick={() => onOpenEditor(selectedCompanyId)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              設定を編集
            </button>
          )}
          <button
            onClick={() => onOpenEditor(null)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            新規登録
          </button>
        </div>
      </div>
    </div>
  );
}
