// frontend/src/App.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  FileSpreadsheet,
  UploadCloud,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Building2,
  RefreshCw,
} from "lucide-react";
import {
  fetchCompanies,
  extractPdf,
  exportToExcel,
  CompanySummary,
  ExtractionResponse,
  ExtractedFieldResult,
} from "./api/client";

export default function App() {
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [extractResult, setExtractResult] = useState<ExtractionResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初回ロード時に登録会社一覧を取得
  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await fetchCompanies();
      setCompanies(data);
      if (data.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(data[0].company_id);
      }
    } catch (err: any) {
      setError(
        "会社フォーマット一覧の取得に失敗しました。バックエンドが起動しているか確認してください。",
      );
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (dropped.type === "application/pdf" || dropped.name.endsWith(".pdf")) {
        setFile(dropped);
        setExtractResult(null);
        setError(null);
      } else {
        setError("PDFファイルのみ対応しています。");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setExtractResult(null);
      setError(null);
    }
  };

  const handleExtract = async () => {
    if (!file || !selectedCompanyId) return;
    setIsExtracting(true);
    setError(null);

    try {
      const result = await extractPdf(selectedCompanyId, file);
      setExtractResult(result);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "PDF解析中にエラーが発生しました。",
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!extractResult) return;
    setIsExporting(true);

    try {
      const blob = await exportToExcel(
        extractResult.extracted_data,
        selectedCompanyId,
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${selectedCompanyId}_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError("Excelの出力処理に失敗しました。");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* ヘッダー */}
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

        {/* 会社フォーマット選択 */}
        <div className="flex items-center space-x-3">
          <Building2 className="w-5 h-5 text-slate-400" />
          <select
            value={selectedCompanyId}
            onChange={(e) => {
              setSelectedCompanyId(e.target.value);
              setExtractResult(null);
            }}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {companies.map((c) => (
              <option key={c.company_id} value={c.company_id}>
                {c.company_name} ({c.company_id})
              </option>
            ))}
          </select>
          <button
            onClick={loadCompanies}
            title="会社フォーマット再読み込み"
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* エラー表示 */}
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded flex items-center space-x-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* アップロード領域 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center space-x-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>請求書・帳票 PDF のアップロード</span>
          </h2>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition ${
              file
                ? "border-indigo-400 bg-indigo-50/30"
                : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="application/pdf"
              className="hidden"
            />
            <UploadCloud className="w-12 h-12 text-slate-400 mb-3" />
            {file ? (
              <div className="text-center">
                <p className="font-semibold text-indigo-900">{file.name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">
                  PDFファイルをドラッグ＆ドロップ、またはクリックして選択
                </p>
                <p className="text-xs text-slate-400 mt-1">PDF形式のみ対応</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleExtract}
              disabled={!file || isExtracting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium rounded-lg shadow-sm transition flex items-center space-x-2 text-sm"
            >
              {isExtracting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>PDF解析中...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>データ抽出を実行</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 抽出結果プレビュー & Excelエクスポート */}
        {extractResult && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  抽出結果プレビュー
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  フォーマット:{" "}
                  <span className="font-medium text-slate-700">
                    {extractResult.company_name}
                  </span>
                </p>
              </div>
              <button
                onClick={handleDownloadExcel}
                disabled={isExporting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-medium rounded-lg shadow-sm transition flex items-center space-x-2 text-sm"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isExporting ? "生成中..." : "Excel (.xlsx) をダウンロード"}
                </span>
              </button>
            </div>

            {/* 単一項目カードグリッド */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {extractResult.extracted_data
                .filter((item) => item.method !== "table")
                .map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-3.5"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>{item.field_name}</span>
                      <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        Cell: {item.excel_cell || "-"}
                      </span>
                    </div>
                    <div
                      className="text-sm font-semibold text-slate-800 truncate"
                      title={String(item.value)}
                    >
                      {item.value !== null ? (
                        String(item.value)
                      ) : (
                        <span className="text-slate-400">未検出</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* 明細テーブルプレビュー */}
            {extractResult.extracted_data
              .filter(
                (item) => item.method === "table" && Array.isArray(item.value),
              )
              .map((tableItem, tIdx) => (
                <div key={tIdx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      {tableItem.field_name}（展開開始:{" "}
                      {tableItem.excel_start_cell || "自動"}）
                    </h3>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {(tableItem.value as string[][]).map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className={
                              rIdx === 0
                                ? "bg-slate-50 font-medium text-slate-700"
                                : "hover:bg-slate-50/50"
                            }
                          >
                            {row.map((col, cIdx) => (
                              <td
                                key={cIdx}
                                className="px-4 py-2 text-xs text-slate-800 whitespace-nowrap"
                              >
                                {col}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>
    </div>
  );
}
