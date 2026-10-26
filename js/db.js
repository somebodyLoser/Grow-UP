/* IndexedDB 极简封装
 * 库名带 selflog 前缀：GitHub Pages 上所有仓库共用同一个 origin，
 * 不加前缀可能和其他项目的数据串在一起。
 */

const NAME = 'selflog-db';
const VERSION = 1;

let opening = null;

function open() {
  if (opening) return opening;
  opening = new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('entries')) {
        const s = db.createObjectStore('entries', { keyPath: 'id' });
        s.createIndex('date', 'date');
        s.createIndex('categoryId', 'categoryId');
      }
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('states')) {
        db.createObjectStore('states', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return opening;
}

function run(storeName, mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    let tx;
    try {
      tx = db.transaction(storeName, mode);
    } catch (err) {
      reject(err);
      return;
    }
    const os = tx.objectStore(storeName);
    let out;
    const req = fn(os);
    if (req && 'onsuccess' in req) req.onsuccess = () => { out = req.result; };
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export const idbAll = (store) => run(store, 'readonly', (os) => os.getAll());
export const idbGet = (store, key) => run(store, 'readonly', (os) => os.get(key));
export const idbPut = (store, val) => run(store, 'readwrite', (os) => os.put(val));
export const idbDel = (store, key) => run(store, 'readwrite', (os) => os.delete(key));
export const idbClear = (store) => run(store, 'readwrite', (os) => os.clear());

/** 批量写入（导入用） */
export function idbPutAll(store, list) {
  return open().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    for (const item of list) os.put(item);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  }));
}