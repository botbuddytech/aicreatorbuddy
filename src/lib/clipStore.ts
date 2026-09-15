"use client";

import { newId } from "@/lib/videoProject";

/**
 * Uploaded clips live in IndexedDB, never in the localStorage draft: a single
 * video would blow the ~5MB origin quota and silently kill every later autosave.
 */
const DB_NAME = "yb_clips";
const DB_VERSION = 1;
const STORE = "clips";

export type ClipRecord = {
  id: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
};

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return openDb().then((db) => {
    if (!db) return null;
    return new Promise<T | null>((resolve) => {
      let request: IDBRequest<T>;
      try {
        request = action(db.transaction(STORE, mode).objectStore(STORE));
      } catch {
        db.close();
        resolve(null);
        return;
      }
      request.onsuccess = () => {
        resolve(request.result);
        db.close();
      };
      request.onerror = () => {
        resolve(null);
        db.close();
      };
    });
  });
}

/** Returns the new clip id, or null when storage is unavailable or full. */
export async function putClip(file: File): Promise<string | null> {
  const id = newId();
  const record: ClipRecord = {
    id,
    name: file.name,
    type: file.type,
    size: file.size,
    blob: file,
  };
  const result = await runTransaction("readwrite", (store) => store.put(record));
  return result === null ? null : id;
}

export async function getClip(id: string): Promise<ClipRecord | null> {
  const record = await runTransaction<ClipRecord | undefined>("readonly", (store) =>
    store.get(id),
  );
  return record ?? null;
}

export async function deleteClip(id: string): Promise<void> {
  await runTransaction("readwrite", (store) => store.delete(id));
}

/** Drops clips no draft references anymore, e.g. after a scene or project delete. */
export async function pruneClips(keepIds: Set<string>): Promise<void> {
  const ids = await runTransaction<IDBValidKey[]>("readonly", (store) => store.getAllKeys());
  if (!ids) return;
  for (const key of ids) {
    if (typeof key === "string" && !keepIds.has(key)) {
      await deleteClip(key);
    }
  }
}
