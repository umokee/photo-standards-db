export function getChangedFields<T extends Record<string, unknown>>(
  current: T,
  initial: T
): Partial<T> | null {
  const changed: Partial<T> = {};
  let hasChanges = false;

  for (const key in current) {
    if (current[key] !== initial[key]) {
      changed[key] = current[key];
      hasChanges = true;
    }
  }

  return hasChanges ? changed : null;
}

export function cleanEmpty<T extends Record<string, unknown>>(data: T): Partial<T> {
  const cleaned: Partial<T> = {};
  for (const key of Object.keys(data) as (keyof T)[]) {
    if (data[key] !== "" && data[key] != null) {
      cleaned[key] = data[key];
    }
  }
  return cleaned;
}

export const getApiError = (error: unknown): string | undefined =>
  (error as any)?.ApiError?.message;

export const getFieldError = (error: unknown, field: string): string | undefined =>
  (
    (error as any)?.ApiError?.details?.errors as { field: string; message: string }[] | undefined
  )?.find((e) => e.field === field)?.message;
