// frontend/src/App.tsx
import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import {
  fetchCompanies,
  extractPdf,
  exportToExcel,
  CompanySummary,
  ExtractionResponse,
} from "./api/client";
import { FormatEditor } from "./components/FormatEditor";
import { Header } from "./components/Header";
import { CompanySelector } from "./components/CompanySelector";
import { FileUploader } from "./components/FileUploader";
import { ExtractionResult } from "./components/ExtractionResult";

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
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editorTargetId, setEditorTargetId] = useState<string | null>(null);

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
      setError("Excel出力中にエラーが発生しました。");
    } finally {
      setIsExporting(false);
    }
  };

  const openEditor = (companyId: string | null = null) => {
    setEditorTargetId(companyId);
    setIsEditorOpen(true);
  };

  const handleEditorSaved = (savedCompanyId: string) => {
    loadCompanies();
    setSelectedCompanyId(savedCompanyId);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <CompanySelector
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          onCompanyChange={setSelectedCompanyId}
          onLoadCompanies={loadCompanies}
          onOpenEditor={openEditor}
        />

        <FileUploader
          file={file}
          isExtracting={isExtracting}
          selectedCompanyId={selectedCompanyId}
          onFileDrop={handleFileDrop}
          onFileSelect={handleFileSelect}
          onExtract={handleExtract}
        />

        {extractResult && (
          <ExtractionResult
            extractResult={extractResult}
            isExporting={isExporting}
            onDownloadExcel={handleDownloadExcel}
          />
        )}
      </main>

      <FormatEditor
        companyId={editorTargetId}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSaved={handleEditorSaved}
      />
    </div>
  );
}
