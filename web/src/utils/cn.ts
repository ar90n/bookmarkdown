import { type ClassValue, clsx } from 'clsx';

// Utility function to conditionally join classNames
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}