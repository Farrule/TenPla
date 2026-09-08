import { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Settings,
  UploadCloud,
  RefreshCw,
} from "lucide-react";
import { apiClient } from "./api/client";

interface CompanyFormat {
  company_id: string;
  company_name: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"convert" | "settings">("convert");
  const [formats, setFormats] = useState<CompanyFormat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初回表示時にバックエンドのAPIを叩く
  const fetchFormats = () => {
    setLoading(true);
    setError(null);
    apiClient
      .get<CompanyFormat[]>("/api/formats")
      .then((res) => {
        setFormats(res.data);
      })
      .catch((err) => {
        console.error("API取得エラー:", err);
        setError("バックエンドとの通信に失敗しました。");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchFormats();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* ナビゲーションバー */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">DocBridge</h1>
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
      <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
        {activeTab === "convert" ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-800">帳票変換</h2>

            {/* 会社選択（APIで取得したデータを表示） */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700">
                  転記元会社（フォーマット）選択:
                </label>
                <button
                  onClick={fetchFormats}
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  再読み込み
                </button>
              </div>

              {loading ? (
                <p className="text-sm text-slate-400">
                  フォーマット一覧を取得中...
                </p>
              ) : error ? (
                <p className="text-sm text-red-500">{error}</p>
              ) : (
                <select className="w-full bg-white border border-slate-300 rounded-md p-2 text-sm text-slate-800">
                  {formats.map((f) => (
                    <option key={f.company_id} value={f.company_id}>
                      {f.company_name} ({f.company_id})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* PDFアップロード領域 */}
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:border-indigo-400 transition-colors cursor-pointer bg-slate-50">
              <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600 font-medium">
                変換するPDFをドラッグ＆ドロップ
              </p>
              <p className="text-xs text-slate-400 mt-1">
                またはファイルを選択
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-2">
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
