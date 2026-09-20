// frontend/src/api/client.ts
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

export interface ExtractedFieldResult {
  field_name: string;
  excel_cell: string | null;
  excel_start_cell: string | null;
  method: string;
  value: any;
}

export interface ExtractionResponse {
  company_id: string;
  company_name: string;
  extracted_data: ExtractedFieldResult[];
}

export interface CompanySummary {
  company_id: string;
  company_name: string;
}

// 会社一覧の取得
export const fetchCompanies = async (): Promise<CompanySummary[]> => {
  const res = await apiClient.get<CompanySummary[]>("/api/formats");
  return res.data;
};

export interface ExtractionRule {
  field_name: string;
  excel_cell?: string | null;
  excel_start_cell?: string | null;
  method: "keyword_after" | "regex" | "table";
  keyword?: string | null;
  pattern?: string | null;
  table_index?: number;
}

export interface CompanyFormat {
  company_id: string;
  company_name: string;
  rules: ExtractionRule[];
}

// PDFアップロード＆データ抽出
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
export const fetchCompanyFormat = async (
  companyId: string,
): Promise<CompanyFormat> => {
  const res = await apiClient.get<CompanyFormat>(`/api/formats/${companyId}`);
  return res.data;
};

// 会社フォーマットの新規作成・更新
export const saveCompanyFormat = async (
  format: CompanyFormat,
): Promise<void> => {
  await apiClient.post("/api/formats", format);
};

// 会社フォーマットの削除
export const deleteCompanyFormat = async (companyId: string): Promise<void> => {
  await apiClient.delete(`/api/formats/${companyId}`);
};
