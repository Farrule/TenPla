import { useRef, useState } from "react";
import { UploadCloud, FileText, RefreshCw } from "lucide-react";

/** FileUploaderProps のプロパティ定義 */
interface FileUploaderProps {
  file: File | null;
  isExtracting: boolean;
  selectedCompanyId: string;
  onFileDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExtract: () => void;
}

/**
 * FileUploaderの概要
 */
export function FileUploader({
  file,
  isExtracting,
  selectedCompanyId,
  onFileDrop,
  onFileSelect,
  onExtract,
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // 関連ターゲットがドロップ領域内部でない場合のみ解除
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    onFileDrop(e);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          PDFアップロード & 解析
        </h2>

        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
            ${
              isDragging
                ? "border-indigo-500 bg-indigo-100/70 scale-[1.01] shadow-md"
                : file
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
              <UploadCloud
                className={`w-10 h-10 mx-auto transition-colors ${
                  isDragging ? "text-indigo-600 animate-bounce" : "text-slate-400"
                }`}
              />
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {isDragging ? "ここにPDFファイルをドロップ" : "クリックしてファイルを選択"}
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

