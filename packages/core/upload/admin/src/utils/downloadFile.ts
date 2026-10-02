/**
 * Fetch a file at `url` and trigger a browser download with the given filename.
 * Goes via a blob + temporary anchor so we honour the `download` attribute
 * even when the file is served same-origin without `Content-Disposition`.
 */
export const downloadFile = async (url: string, fileName: string) => {
  const response = await fetch(url);
  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.setAttribute('download', fileName);
  anchor.click();
  window.URL.revokeObjectURL(objectUrl);
};
