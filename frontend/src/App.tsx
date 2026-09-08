import { useState } from "react";
import { FileSpreadsheet, Settings, UploadCloud } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"convert" | "settings">("convert");

  return (
    <div className="min-h-screen flex flex-col">
      {/* ナビゲーションバー */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">TenPla</h1>
            <p className="text-xs text-slate-500">
              PDF to Excel 自動転記システム
            </p>
          </div>
        </div>

        <nav className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("convert")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              activeTab === "convert"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            変換実行
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              activeTab === "settings"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Settings className="w-4 h-4" />
            フォーマット設定
          </button>
        </nav>
      </header>

      {/* メインコンテンツ領域 */}
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
        {activeTab === "convert" ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4">帳票変換</h2>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-indigo-400 transition-colors cursor-pointer bg-slate-50">
              <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">
                変換するPDFをドラッグ＆ドロップ
              </p>
              <p className="text-xs text-slate-400 mt-1">
                またはファイルを選択
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              フォーマットエディタ
            </h2>
            <p className="text-sm text-slate-500">
              取引先ごとの抽出マッピングルールを編集します。
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
