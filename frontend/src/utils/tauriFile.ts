// frontend/src/utils/tauriFile.ts

/**
 * Windows等のファイルパスからファイル名を取得
 */
export const getFileNameFromPath = (filePath: string): string => {
  const normalized = filePath.replace(/\\/g, "/");
  return normalized.split("/").pop() || "document.pdf";
};

/**
 * Tauri環境でローカルファイルパスからバイナリを読み出し、
 * ブラウザ標準の File オブジェクトを作成する
 */
export const createPdfFileFromPath = async (filePath: string): Promise<File> => {
  const win = window as any;
  const fileName = getFileNameFromPath(filePath);

  let rawBytes: number[] | Uint8Array;

  if (win.__TAURI__?.core?.invoke) {
    rawBytes = await win.__TAURI__.core.invoke("read_file_binary", {
      filePath,
    });
  } else if (win.__TAURI_INTERNALS__?.invoke) {
    rawBytes = await win.__TAURI_INTERNALS__.invoke("read_file_binary", {
      filePath,
    });
  } else {
    throw new Error("Tauri API is not available");
  }

  const uint8Array = new Uint8Array(rawBytes);
  return new File([uint8Array], fileName, { type: "application/pdf" });
};
