"use client";

const ROSTER_CACHE_TTL_MS = 30_000;
const SHIFTS_CACHE_TTL_MS = 60_000;

type CacheBox<T> = { ts: number; data: T };

function readCache<T>(key: string, ttlMs: number): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const box = JSON.parse(raw) as CacheBox<T>;
    if (!box?.ts || Date.now() - box.ts > ttlMs) return null;
    return box.data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    const box: CacheBox<T> = { ts: Date.now(), data };
    sessionStorage.setItem(key, JSON.stringify(box));
  } catch {
    // تجاهل امتلاء التخزين
  }
}

export function readCachedRoster<T>(photoOnly: boolean): T | null {
  return readCache<T>(
    photoOnly ? "kiosk:roster:photo" : "kiosk:roster:all",
    ROSTER_CACHE_TTL_MS
  );
}

export function writeCachedRoster<T>(photoOnly: boolean, data: T) {
  writeCache(photoOnly ? "kiosk:roster:photo" : "kiosk:roster:all", data);
}

export function readCachedShifts<T>(): T | null {
  return readCache<T>("kiosk:shifts", SHIFTS_CACHE_TTL_MS);
}

export function writeCachedShifts<T>(data: T) {
  writeCache("kiosk:shifts", data);
}
