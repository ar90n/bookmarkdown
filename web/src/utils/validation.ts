export const ValidationMessages = {
  REQUIRED: 'This field is required',
  MIN_LENGTH: (min: number) => `Must be at least ${min} characters`,
  MAX_LENGTH: (max: number) => `Must be no more than ${max} characters`,
  INVALID_URL: 'Please enter a valid URL',
  INVALID_FORMAT: 'Invalid format',
} as const;

export interface ValidationOptions {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customMessage?: string;
}

export function validateField(
  value: string,
  options: ValidationOptions
): string | null {
  const trimmedValue = value.trim();

  if (options.required && !trimmedValue) {
    return options.customMessage || ValidationMessages.REQUIRED;
  }

  if (options.minLength && trimmedValue.length < options.minLength) {
    return options.customMessage || ValidationMessages.MIN_LENGTH(options.minLength);
  }

  if (options.maxLength && trimmedValue.length > options.maxLength) {
    return options.customMessage || ValidationMessages.MAX_LENGTH(options.maxLength);
  }

  if (options.pattern && !options.pattern.test(trimmedValue)) {
    return options.customMessage || ValidationMessages.INVALID_FORMAT;
  }

  return null;
}

export function validateUrl(url: string): string | null {
  if (!url.trim()) {
    return ValidationMessages.REQUIRED;
  }

  try {
    new URL(url);
    return null;
  } catch {
    return ValidationMessages.INVALID_URL;
  }
}

export function validateName(
  name: string,
  options: { minLength?: number; maxLength?: number } = {}
): string | null {
  const { minLength = 2, maxLength = 50 } = options;
  
  return validateField(name, {
    required: true,
    minLength,
    maxLength,
  });
}

export function trimFields<T extends Record<string, any>>(data: T): T {
  const trimmed = {} as T;
  
  for (const key in data) {
    const value = data[key];
    if (typeof value === 'string') {
      trimmed[key] = value.trim() as T[typeof key];
    } else {
      trimmed[key] = value;
    }
  }
  
  return trimmed;
}