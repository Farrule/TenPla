// frontend/src/App.tsx
import React, { useState, useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";
import {
  fetchCompanies,
  extractPdf,
  exportToExcel,
  CompanySummary,
  ExtractionResponse,
  waitForBackend,
} from "./api/client";
import { FormatEditor } from "./components/FormatEditor";
import { Header } from "./components/Header";
import { CompanySelector } from "./components/CompanySelector";
import { FileUploader } from "./components/FileUploader";
import { ExtractionResult } from "./components/ExtractionResult";
import { useNotification } from "./context/NotificationContext";
import { logger } from "./utils/logger";
import { createPdfFileFromPath, getFileNameFromPath } from "./utils/tauriFile";
import { Footer } from "./components/Footer";

/**
 * Appの概要
 *  @returns
 */
export default function App() {
  const { notifySuccess, notifyError } = useNotification();
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [extractResult, setExtractResult] = useState<ExtractionResponse | null>(
    null,
  );
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editorTargetId, setEditorTargetId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const ready = await waitForBackend();
      if (ready) {
        // 起動完了後にフォーマット取得を実行
        loadCompanies();
      } else {
        const msg =
          "バックエンドサーバーの起動確認がタイムアウトしました。サーバーが正常に起動しているかご確認ください。";
        setError(msg);
        notifyError(msg, "接続エラー");
      }
    };
    init();
  }, []);

  // ファイルドロップの二重処理・重複通知防止用の参照
  const lastProcessedFileRef = useRef<{ name: string; timestamp: number }>({
    name: "",
    timestamp: 0,
  });
  const isProcessingFileRef = useRef(false);

  const isDuplicateFileAction = (fileName: string): boolean => {
    const now = Date.now();
    if (
      isProcessingFileRef.current ||
      (lastProcessedFileRef.current.name === fileName &&
        now - lastProcessedFileRef.current.timestamp < 1000)
    ) {
      return true;
    }
    lastProcessedFileRef.current = { name: fileName, timestamp: now };
    return false;
  };

  // ドロップされたファイルパス（Tauriネイティブ）からPDFを読み込む処理
  const handlePdfPathDrop = async (rawPath: string) => {
    if (!rawPath.toLowerCase().endsWith(".pdf")) {
      logger.warn(
        "frontend",
        `サポート対象外のファイルがドロップされました: ${rawPath}`,
      );
      const msg = "PDFファイルのみ対応しています。";
      setError(msg);
      notifyError(msg, "ファイル形式エラー");
      return;
    }

    const fileName = getFileNameFromPath(rawPath);
    if (isDuplicateFileAction(fileName)) {
      return;
    }

    isProcessingFileRef.current = true;
    try {
      const loadedFile = await createPdfFileFromPath(rawPath);
      setFile(loadedFile);
      setExtractResult(null);
      setError(null);
      notifySuccess(
        `PDF「${loadedFile.name}」を読み込みました。`,
        "ファイル読み込み",
      );
    } catch (err: any) {
      logger.error(
        "frontend",
        `Tauriファイルドロップ読み込みエラー: ${err.message}`,
        err,
      );
      const msg = "ファイルの読み込みに失敗しました。";
      setError(msg);
      notifyError(msg, "エラー");
    } finally {
      isProcessingFileRef.current = false;
    }
  };

  // Tauriネイティブのファイルドラッグ＆ドロップイベント監視
  useEffect(() => {
    let isMounted = true;
    const unlisteners: Array<() => void> = [];

    const setupTauriDropListener = async () => {
      const win = window as any;
      let registered = false;

      // 1. getCurrentWebviewWindow の onDragDropEvent (Tauri v2 推奨)
      const getCurrentWindow =
        win.__TAURI__?.webviewWindow?.getCurrentWebviewWindow;
      if (getCurrentWindow) {
        try {
          const appWindow = getCurrentWindow();
          if (appWindow?.onDragDropEvent) {
            const unlistenWindow = await appWindow.onDragDropEvent(
              (event: any) => {
                if (event.payload?.type === "drop") {
                  const paths: string[] = event.payload.paths || [];
                  if (paths.length > 0) {
                    handlePdfPathDrop(paths[0]);
                  }
                }
              },
            );
            if (!isMounted) {
              unlistenWindow();
            } else {
              unlisteners.push(unlistenWindow);
              registered = true;
            }
          }
        } catch (e) {
          console.warn("Tauri onDragDropEvent listener error:", e);
        }
      }

      // 2. onDragDropEvent が利用できない場合のみ listen をフォールバックとして試行
      if (!registered) {
        const listenFn =
          win.__TAURI__?.event?.listen || win.__TAURI_INTERNALS__?.listen;

        if (listenFn) {
          try {
            // Tauri v2 の "tauri://drag-drop"
            const unlisten = await listenFn(
              "tauri://drag-drop",
              (event: any) => {
                const paths: string[] =
                  event.payload?.paths ||
                  (Array.isArray(event.payload) ? event.payload : []);
                if (paths.length > 0) {
                  handlePdfPathDrop(paths[0]);
                }
              },
            );
            if (!isMounted) {
              unlisten();
            } else {
              unlisteners.push(unlisten);
              registered = true;
            }
          } catch (e) {
            console.warn("Tauri tauri://drag-drop listener error:", e);
          }

          if (!registered) {
            try {
              // Tauri v1 の "tauri://file-drop"
              const unlisten = await listenFn(
                "tauri://file-drop",
                (event: any) => {
                  const paths: string[] = Array.isArray(event.payload)
                    ? event.payload
                    : event.payload?.paths || [];
                  if (paths.length > 0) {
                    handlePdfPathDrop(paths[0]);
                  }
                },
              );
              if (!isMounted) {
                unlisten();
              } else {
                unlisteners.push(unlisten);
              }
            } catch (e) {
              // 無視
            }
          }
        }
      }
    };

    setupTauriDropListener();

    return () => {
      isMounted = false;
      unlisteners.forEach((fn) => {
        try {
          fn();
        } catch (e) {
          // ignore
        }
      });
    };
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await fetchCompanies();
      setCompanies(data);
      if (data.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(data[0].company_id);
      }
    } catch (err: any) {
      const msg =
        "会社フォーマット一覧の取得に失敗しました。バックエンドが起動しているか確認してください。";
      setError(msg);
      notifyError(msg, "通信エラー");
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (
        dropped.type === "application/pdf" ||
        dropped.name.toLowerCase().endsWith(".pdf")
      ) {
        if (isDuplicateFileAction(dropped.name)) {
          return;
        }
        setFile(dropped);
        setExtractResult(null);
        setError(null);
        notifySuccess(
          `PDF「${dropped.name}」を読み込みました。`,
          "ファイル読み込み",
        );
      } else {
        logger.warn(
          "frontend",
          `サポート対象外のファイル形式がドロップされました: ${dropped.name}`,
        );
        const msg = "PDFファイルのみ対応しています。";
        setError(msg);
        notifyError(msg, "ファイル形式エラー");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (
        selected.type === "application/pdf" ||
        selected.name.toLowerCase().endsWith(".pdf")
      ) {
        setFile(selected);
        setExtractResult(null);
        setError(null);
        notifySuccess(
          `PDF「${selected.name}」を選択しました。`,
          "ファイル選択",
        );
      } else {
        logger.warn(
          "frontend",
          `サポート対象外のファイル形式が選択されました: ${selected.name}`,
        );
        const msg = "PDFファイルのみ対応しています。";
        setError(msg);
        notifyError(msg, "ファイル形式エラー");
      }
    }
  };

  const handleExtract = async () => {
    if (!file) {
      const msg = "解析するPDFファイルを選択してください。";
      setError(msg);
      notifyError(msg, "入力エラー");
      return;
    }
    if (!selectedCompanyId) {
      const msg = "会社フォーマットを選択してください。";
      setError(msg);
      notifyError(msg, "入力エラー");
      return;
    }

    setIsExtracting(true);
    setError(null);

    try {
      const result = await extractPdf(selectedCompanyId, file);
      setExtractResult(result);
      notifySuccess(
        `PDF「${file.name}」からデータを正常に抽出しました。`,
        "抽出成功",
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.detail || "PDF解析中にエラーが発生しました。";
      setError(msg);
      notifyError(msg, "抽出エラー");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDownloadExcel = async (customFilename?: string) => {
    if (!extractResult) return;
    setIsExporting(true);

    try {
      const pdfName = extractResult.pdf_filename || file?.name || null;
      let downloadFileName = customFilename?.trim();

      if (!downloadFileName) {
        if (pdfName) {
          const stem = pdfName.replace(/\.[^/.]+$/, "");
          downloadFileName = `${stem}.xlsx`;
        } else if (templateFile) {
          downloadFileName = `filled_${templateFile.name}`;
        } else {
          downloadFileName = `${selectedCompanyId}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        }
      }

      if (
        !downloadFileName.toLowerCase().endsWith(".xlsx") &&
        !downloadFileName.toLowerCase().endsWith(".xlsm")
      ) {
        downloadFileName += ".xlsx";
      }

      const blob = await exportToExcel(
        extractResult.extracted_data,
        selectedCompanyId,
        templateFile,
        pdfName,
        downloadFileName,
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", downloadFileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      notifySuccess(
        `Excelファイル「${downloadFileName}」を保存しました。`,
        "保存完了",
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.detail || "Excel出力中にエラーが発生しました。";
      setError(msg);
      notifyError(msg, "出力エラー");
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
    if (savedCompanyId) {
      setSelectedCompanyId(savedCompanyId);
    }
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
            templateFile={templateFile}
            pdfFileName={file?.name}
            onSelectTemplate={setTemplateFile}
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
      <Footer />
    </div>
  );
}
