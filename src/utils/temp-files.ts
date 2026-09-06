const tempUrls: Map<string, string> = new Map();

export function createTempUrl(blob: Blob, id: string): string {
  if (tempUrls.has(id)) {
    URL.revokeObjectURL(tempUrls.get(id)!);
  }
  const url = URL.createObjectURL(blob);
  tempUrls.set(id, url);
  return url;
}

export function revokeTempUrl(id: string): void {
  const url = tempUrls.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    tempUrls.delete(id);
  }
}

export function revokeAllTempUrls(): void {
  tempUrls.forEach(url => URL.revokeObjectURL(url));
  tempUrls.clear();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function formatTime(ms: number): string {
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(1) + 's';
}
