import {
  HistoryItem,
  saveHistoryItem as saveToLocalIDB,
  getHistoryItems as getFromLocalIDB,
  deleteHistoryItem as deleteFromLocalIDB,
  clearAllHistory as clearLocalIDB
} from './local-store';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '') + '/api';

/**
 * Check if the PostgreSQL backend server is online & reachable
 */
export async function checkBackendHealth(): Promise<{ online: boolean; dbConnected: boolean; database?: string }> {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET', signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      return { online: true, dbConnected: data.database === 'connected', database: data.currentDb };
    }
    return { online: true, dbConnected: false };
  } catch {
    return { online: false, dbConnected: false };
  }
}

/**
 * Convert Blob to Base64 String
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert Base64 data URL to Blob
 */
function base64ToBlob(base64: string): Blob {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1] || 'image/png';
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Save History Item to PostgreSQL database (with automatic IndexedDB mirror)
 */
export async function saveHistory(item: Omit<HistoryItem, 'id' | 'timestamp'> & { id?: string }): Promise<string> {
  const id = item.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // Always mirror to IndexedDB locally
  await saveToLocalIDB({ ...item, id });

  // Sync with PostgreSQL backend API if available
  try {
    const resultBase64 = await blobToBase64(item.resultBlob);
    const token = (await import('../core/auth-state')).authState.getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    await fetch(`${API_BASE}/history`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id,
        name: item.name,
        tool: item.tool,
        originalSize: item.originalSize,
        resultSize: item.resultSize,
        width: item.width,
        height: item.height,
        thumbnail: item.thumbnail,
        resultBase64,
      }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (e) {
    console.log('[ClearBG] Saved to IndexedDB (Backend sync optional/offline)');
  }

  return id;
}

/**
 * Fetch history from PostgreSQL database (falls back to IndexedDB)
 */
export async function fetchHistory(): Promise<{ items: HistoryItem[]; source: 'postgres' | 'indexeddb' }> {
  try {
    const token = (await import('../core/auth-state')).authState.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/history`, { method: 'GET', headers, signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        const items: HistoryItem[] = data.data.map((row: any) => ({
          id: row.id,
          name: row.name,
          tool: row.tool,
          originalSize: row.originalSize,
          resultSize: row.resultSize,
          width: row.width,
          height: row.height,
          thumbnail: row.thumbnail,
          timestamp: row.timestamp,
          resultBlob: base64ToBlob(row.resultBase64),
        }));
        return { items, source: 'postgres' };
      }
    }
  } catch {
    // Backend offline
  }

  const localItems = await getFromLocalIDB();
  return { items: localItems, source: 'indexeddb' };
}

/**
 * Delete History Item across PostgreSQL and IndexedDB
 */
export async function deleteHistory(id: string): Promise<void> {
  await deleteFromLocalIDB(id);
  try {
    await fetch(`${API_BASE}/history/${id}`, { method: 'DELETE', signal: AbortSignal.timeout(2000) });
  } catch {}
}

/**
 * Clear All History across PostgreSQL and IndexedDB
 */
export async function clearAllHistoryRecords(): Promise<void> {
  await clearLocalIDB();
  try {
    await fetch(`${API_BASE}/history`, { method: 'DELETE', signal: AbortSignal.timeout(2000) });
  } catch {}
}
