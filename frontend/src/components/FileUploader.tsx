import { useRef } from "react";
import { UploadCloud, FileText, RefreshCw } from "lucide-react";

interface FileUploaderProps {
  file: File | null;
  isExtracting: boolean;
  selectedCompanyId: string;
  onFileDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExtract: () => void;
}

export function FileUploader({
  file,
  isExtracting,
  selectedCompanyId,
  onFileDrop,
  onFileSelect,
  onExtract,
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          PDFアップロード & 解析
        </h2>

        <div
          onDragOver={handleDragOver}
          onDrop={onFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${
              file
                ? "border-indigo-300 bg-indigo-50/50"
                : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
            }
          `}
        >
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            ref={fileInputRef}
            onChange={onFileSelect}
          />
          {file ? (
            <div className="space-y-2">
              <FileText className="w-10 h-10 text-indigo-500 mx-auto" />
              <p className="text-sm font-medium text-indigo-900">
                {file.name}
              </p>
              <p className="text-xs text-indigo-600/70">
                クリックまたはドラッグで別のファイルを選択
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <UploadCloud className="w-10 h-10 text-slate-400 mx-auto" />
              <div>
                <p className="text-sm font-medium text-slate-700">
                  クリックしてファイルを選択
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  またはここにPDFをドラッグ＆ドロップ
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onExtract}
            disabled={!file || !selectedCompanyId || isExtracting}
            className={`
              px-6 py-2.5 rounded-md text-sm font-medium text-white shadow-sm transition-all flex items-center gap-2
              ${
                !file || !selectedCompanyId || isExtracting
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 hover:shadow"
              }
            `}
          >
            {isExtracting && (
              <RefreshCw className="w-4 h-4 animate-spin" />
            )}
            {isExtracting ? "解析中..." : "データを抽出する"}
          </button>
        </div>
      </div>
    </div>
  );
}
