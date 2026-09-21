// frontend/src/api/client.ts
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

/** ExtractedFieldResult のプロパティ定義 */
export interface ExtractedFieldResult {
  field_name: string;
  excel_cell: string | null;
  excel_start_cell: string | null;
  method: string;
  value: any;
}

/** ExtractionResponse のプロパティ定義 */
export interface ExtractionResponse {
  company_id: string;
  company_name: string;
  extracted_data: ExtractedFieldResult[];
}

/** CompanySummary のプロパティ定義 */
export interface CompanySummary {
  company_id: string;
  company_name: string;
}

// 会社一覧の取得
/** fetchCompanies の概要 */
export const fetchCompanies = async (): Promise<CompanySummary[]> => {
  const res = await apiClient.get<CompanySummary[]>("/api/formats");
  return res.data;
};

/** ExtractionRule のプロパティ定義 */
export interface ExtractionRule {
  field_name: string;
  excel_cell?: string | null;
  excel_start_cell?: string | null;
  method: "keyword_after" | "regex" | "table";
  keyword?: string | null;
  pattern?: string | null;
  table_index?: number;
}

/** CompanyFormat のプロパティ定義 */
export interface CompanyFormat {
  company_id: string;
  company_name: string;
  rules: ExtractionRule[];
}

// PDFアップロード＆データ抽出
/** extractPdf の概要 */
export const extractPdf = async (
  companyId: string,
  file: File,
): Promise<ExtractionResponse> => {
  const formData = new FormData();
  formData.append("company_id", companyId);
  formData.append("file", file);

  const res = await apiClient.post<ExtractionResponse>(
    "/api/extract",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return res.data;
};

// Excelの生成＆ダウンロード
/** exportToExcel の概要 */
export const exportToExcel = async (
  extractedData: ExtractedFieldResult[],
  companyId: string,
  templateFile?: File | null,
): Promise<Blob> => {
  const formData = new FormData();
  formData.append("extracted_data", JSON.stringify(extractedData));
  if (companyId) {
    formData.append("company_id", companyId);
  }
  if (templateFile) {
    formData.append("template_file", templateFile);
  }

  const res = await apiClient.post("/api/export-excel", formData, {
    responseType: "blob",
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// 会社フォーマット詳細の取得
/** fetchCompanyFormat の概要 */
export const fetchCompanyFormat = async (
  companyId: string,
): Promise<CompanyFormat> => {
  const res = await apiClient.get<CompanyFormat>(`/api/formats/${companyId}`);
  return res.data;
};

// 会社フォーマットの新規作成・更新
/** saveCompanyFormat の概要 */
export const saveCompanyFormat = async (
  format: CompanyFormat,
): Promise<void> => {
  await apiClient.post("/api/formats", format);
};

// 会社フォーマットの削除
/** deleteCompanyFormat の概要 */
export const deleteCompanyFormat = async (companyId: string): Promise<void> => {
  await apiClient.delete(`/api/formats/${companyId}`);
};
