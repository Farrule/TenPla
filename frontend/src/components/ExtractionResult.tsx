import React, { useRef } from "react";
import {
  CheckCircle2,
  Download,
  RefreshCw,
  FileSpreadsheet,
  FileCheck,
  X,
} from "lucide-react";
import { ExtractionResponse } from "../api/client";

/** ExtractionResultProps のプロパティ定義 */
interface ExtractionResultProps {
  extractResult: ExtractionResponse;
  isExporting: boolean;
  templateFile: File | null;
  onSelectTemplate: (file: File | null) => void;
  onDownloadExcel: () => void;
}

/**
 * ExtractionResultの概要
 *  @param {
 *   extractResult,
 *   isExporting,
 *   templateFile,
 *   onSelectTemplate,
 *   onDownloadExcel,
 * } - 
 *  @returns 
 */
export function ExtractionResult({
  extractResult,
  isExporting,
  templateFile,
  onSelectTemplate,
  onDownloadExcel,
}: ExtractionResultProps) {
  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onSelectTemplate(e.target.files[0]);
    }
    // 同じファイルを再選択できるようにリセット
    e.target.value = "";
  };

  return (
    <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 操作ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">抽出完了</h2>
            <p className="text-sm text-slate-500">
              適用フォーマット: {extractResult.company_name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* 非表示の input[type=file] */}
          <input
            type="file"
            ref={excelInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls"
            className="hidden"
          />

          {/* テンプレートファイル選択バッジ または 選択ボタン */}
          {templateFile ? (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800">
              <FileCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span
                className="font-medium truncate max-w-[140px]"
                title={templateFile.name}
              >
                {templateFile.name}
              </span>
              <button
                type="button"
                onClick={() => onSelectTemplate(null)}
                className="p-0.5 text-emerald-600 hover:text-emerald-900 rounded transition-colors"
                title="テンプレート選択を解除"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => excelInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-slate-50 rounded-md text-xs font-medium text-slate-600 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-400" />
              <span>転記先Excelを指定 (任意)</span>
            </button>
          )}

          {/* ダウンロード実行ボタン */}
          <button
            onClick={onDownloadExcel}
            disabled={isExporting}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors
              ${
                isExporting
                  ? "bg-emerald-100 text-emerald-600 cursor-not-allowed"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              }
            `}
          >
            {isExporting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>
              {isExporting
                ? "生成中..."
                : templateFile
                  ? "Excelへ転記して保存"
                  : "Excel (.xlsx) をダウンロード"}
            </span>
          </button>
        </div>
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
                {item.value !== null && item.value !== undefined ? (
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
        .filter((item) => item.method === "table" && Array.isArray(item.value))
        .map((tableItem, tIdx) => (
          <div key={tIdx} className="space-y-2 mt-6">
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
  );
}
