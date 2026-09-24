import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Save,
  X,
  Settings2,
  Download,
  Upload,
} from "lucide-react";
import {
  CompanyFormat,
  ExtractionRule,
  fetchCompanyFormat,
  saveCompanyFormat,
  deleteCompanyFormat,
} from "../api/client";
import { useNotification } from "../context/NotificationContext";
import { logger } from "../utils/logger";

/** FormatEditorProps のプロパティ定義 */
interface FormatEditorProps {
  companyId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (savedId: string) => void;
}

const DEFAULT_RULE: ExtractionRule = {
  field_name: "",
  excel_cell: "",
  excel_start_cell: "",
  method: "keyword_after",
  keyword: "",
  pattern: "",
  table_index: 0,
};

/** FormatEditor の概要 */
export const FormatEditor: React.FC<FormatEditorProps> = ({
  companyId,
  isOpen,
  onClose,
  onSaved,
}) => {
  const { notifySuccess, notifyError } = useNotification();
  const [formData, setFormData] = useState<CompanyFormat>({
    company_id: "",
    company_name: "",
    rules: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (companyId) {
        loadFormat(companyId);
      } else {
        // 新規作成時
        setFormData({
          company_id: "",
          company_name: "",
          rules: [
            {
              ...DEFAULT_RULE,
              field_name: "請求日",
              excel_cell: "B2",
              keyword: "請求日:",
            },
          ],
        });
      }
      setError(null);
    }
  }, [isOpen, companyId]);

  const loadFormat = async (id: string) => {
    try {
      const data = await fetchCompanyFormat(id);
      setFormData(data);
    } catch (err: any) {
      const msg = "設定の読み込みに失敗しました。";
      setError(msg);
      notifyError(msg, "読み込みエラー");
    }
  };

  const handleRuleChange = (
    index: number,
    field: keyof ExtractionRule,
    value: any,
  ) => {
    const nextRules = [...formData.rules];
    nextRules[index] = { ...nextRules[index], [field]: value };
    setFormData({ ...formData, rules: nextRules });
  };

  const handleAddRule = () => {
    setFormData({
      ...formData,
      rules: [
        ...formData.rules,
        { ...DEFAULT_RULE, field_name: `項目${formData.rules.length + 1}` },
      ],
    });
  };

  const handleRemoveRule = (index: number) => {
    setFormData({
      ...formData,
      rules: formData.rules.filter((_, i) => i !== index),
    });
  };

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(formData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileName = `${formData.company_id || "new"}_format.json`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notifySuccess(
        `設定ファイル「${fileName}」を出力しました。`,
        "エクスポート完了",
      );
    } catch (err) {
      const msg = "エクスポートに失敗しました。";
      setError(msg);
      notifyError(msg, "エクスポートエラー");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        // 簡単なバリデーション
        if (typeof parsed !== "object" || !Array.isArray(parsed.rules)) {
          throw new Error(
            "フォーマット形式が正しくありません (rules配列が見つかりません)",
          );
        }
        setFormData(parsed);
        // inputをリセット
        e.target.value = "";
        setError(null);
        notifySuccess(
          `設定ファイル「${file.name}」をインポートしました。`,
          "インポート完了",
        );
      } catch (err: any) {
        logger.warn(
          "frontend",
          `フォーマットJSONのインポートに失敗しました: ${err.message}`,
        );
        const msg = "ファイルの読み込みに失敗しました: " + err.message;
        setError(msg);
        notifyError(msg, "インポートエラー");
      }
    };
    reader.readAsText(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const safeCompanyId = formData.company_id.trim();
    if (!safeCompanyId) {
      const msg = "会社ID（英数字）を入力してください。";
      setError(msg);
      notifyError(msg, "入力エラー");
      return;
    }
    // 会社IDに使用可能な文字チェック
    if (!/^[a-zA-Z0-9_-]+$/.test(safeCompanyId)) {
      const msg =
        "会社IDには半角英数字、ハイフン(-)、アンダースコア(_)のみ使用できます。";
      setError(msg);
      notifyError(msg, "入力エラー");
      return;
    }
    if (!formData.company_name.trim()) {
      const msg = "会社名を入力してください。";
      setError(msg);
      notifyError(msg, "入力エラー");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await saveCompanyFormat({ ...formData, company_id: safeCompanyId });
      notifySuccess(
        `会社フォーマット「${formData.company_name}」を保存しました。`,
        "保存完了",
      );
      onSaved(safeCompanyId);
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.detail || "保存中にエラーが発生しました。";
      setError(msg);
      notifyError(msg, "保存エラー");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!companyId) return;
    if (
      !confirm(
        `会社フォーマット「${formData.company_name}」を削除してもよろしいですか？`,
      )
    )
      return;

    try {
      await deleteCompanyFormat(companyId);
      notifySuccess(
        `会社フォーマット「${formData.company_name}」を削除しました。`,
        "削除完了",
      );
      onSaved("");
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "削除に失敗しました。";
      setError(msg);
      notifyError(msg, "削除エラー");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* モーダルヘッダー */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Settings2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">
              {companyId ? "フォーマット設定の編集" : "新規フォーマット登録"}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {companyId ? (
              <button
                onClick={handleExport}
                title="フォーマットをエクスポート"
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
              >
                <Upload className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() =>
                  document.getElementById("import-format-input")?.click()
                }
                title="フォーマットをインポート"
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            <input
              type="file"
              id="import-format-input"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* フォーム入力エリア */}
        <form
          onSubmit={handleSave}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {error && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-xs">
              {error}
            </div>
          )}

          {/* 基本情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                会社ID (半角英数・ファイル名)
              </label>
              <input
                type="text"
                required
                disabled={!!companyId}
                placeholder="sample_company"
                value={formData.company_id}
                onChange={(e) =>
                  setFormData({ ...formData, company_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                会社名 (表示用)
              </label>
              <input
                type="text"
                required
                placeholder="株式会社サンプル商事"
                value={formData.company_name}
                onChange={(e) =>
                  setFormData({ ...formData, company_name: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* ルール一覧 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                <span>抽出ルール設定</span>
                <span className="text-xs font-normal text-slate-500">
                  ({formData.rules.length}件)
                </span>
              </h3>
              <button
                type="button"
                onClick={handleAddRule}
                className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium rounded-lg transition flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ルールを追加</span>
              </button>
            </div>

            <div className="space-y-3">
              {formData.rules.map((rule, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded">
                      ルール #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(idx)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded transition"
                      title="このルールを削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        項目名
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="例: 合計金額"
                        value={rule.field_name}
                        onChange={(e) =>
                          handleRuleChange(idx, "field_name", e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        抽出方式
                      </label>
                      <select
                        value={rule.method}
                        onChange={(e) =>
                          handleRuleChange(
                            idx,
                            "method",
                            e.target.value as ExtractionRule["method"],
                          )
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="keyword_after">
                          キーワード直後 (keyword_after)
                        </option>
                        <option value="regex">正規表現 (regex)</option>
                        <option value="table">表抽出 (table)</option>
                      </select>
                    </div>

                    {/* 転記先セル */}
                    <div>
                      {rule.method === "table" ? (
                        <>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Excel展開開始セル
                          </label>
                          <input
                            type="text"
                            placeholder="例: A10"
                            value={rule.excel_start_cell || ""}
                            onChange={(e) =>
                              handleRuleChange(
                                idx,
                                "excel_start_cell",
                                e.target.value,
                              )
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </>
                      ) : (
                        <>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Excel転記セル
                          </label>
                          <input
                            type="text"
                            placeholder="例: B2"
                            value={rule.excel_cell || ""}
                            onChange={(e) =>
                              handleRuleChange(
                                idx,
                                "excel_cell",
                                e.target.value,
                              )
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* 方式別の条件指定 */}
                  <div className="pt-1">
                    {rule.method === "keyword_after" && (
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          検索キーワード
                        </label>
                        <input
                          type="text"
                          placeholder="例: 請求日: または ご請求金額"
                          value={rule.keyword || ""}
                          onChange={(e) =>
                            handleRuleChange(idx, "keyword", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {rule.method === "regex" && (
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          正規表現パターン
                        </label>
                        <input
                          type="text"
                          placeholder="例: INV-\d{4}-\d{3}"
                          value={rule.pattern || ""}
                          onChange={(e) =>
                            handleRuleChange(idx, "pattern", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {rule.method === "table" && (
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          PDF内のテーブル番号 (0から始まる連番)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={rule.table_index ?? 0}
                          onChange={(e) =>
                            handleRuleChange(
                              idx,
                              "table_index",
                              parseInt(e.target.value, 10) || 0,
                            )
                          }
                          className="w-32 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* モーダルフッター */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            {companyId && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                このフォーマットを削除
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-medium rounded-lg shadow-sm transition flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "保存中..." : "設定を保存"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
