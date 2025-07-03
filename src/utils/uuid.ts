import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

export function isValidId(id: string): boolean {
  return uuidValidate(id);
}

export function generateBookmarkId(): string {
  return generateId();
}