export interface HistoryItem {
  id: string;
  name: string;
  tool: string;
  timestamp: number;
  originalSize: number;
  resultSize: number;
  width: number;
  height: number;
  thumbnail: string;
  resultBlob: Blob;
}

const DB_NAME = 'ClearBG_Storage';
const DB_VERSION = 1;
const STORE_NAME = 'history';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('tool', 'tool', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveHistoryItem(item: Omit<HistoryItem, 'id' | 'timestamp'> & { id?: string }): Promise<string> {
  const id = item.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const fullItem: HistoryItem = {
    ...item,
    id,
    timestamp: Date.now(),
  };

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(fullItem);
      tx.oncomplete = () => resolve(id);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('Failed to save to IndexedDB:', e);
    return id;
  }
}

export async function getHistoryItems(): Promise<HistoryItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result as HistoryItem[];
        items.sort((a, b) => b.timestamp - a.timestamp);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Failed to fetch from IndexedDB:', e);
    return [];
  }
}

export async function deleteHistoryItem(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('Failed to delete history item:', e);
  }
}

export async function clearAllHistory(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('Failed to clear history:', e);
  }
}
