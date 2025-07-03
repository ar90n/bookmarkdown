export * from './uuid.js';

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}