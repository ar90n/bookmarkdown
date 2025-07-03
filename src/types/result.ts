export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export const success = <T, E = Error>(data: T): Result<T, E> => ({ success: true, data });

export const failure = <T = never, E = Error>(error: E): Result<T, E> => ({ success: false, error });

export const isSuccess = <T, E>(result: Result<T, E>): result is { success: true; data: T } =>
  result.success;

export const isFailure = <T, E>(result: Result<T, E>): result is { success: false; error: E } =>
  !result.success;

export const mapResult = <T, U, E>(
  result: Result<T, E>,
  mapper: (data: T) => U
): Result<U, E> =>
  isSuccess(result) ? success(mapper(result.data)) : { success: false, error: result.error };

export const flatMapResult = <T, U, E>(
  result: Result<T, E>,
  mapper: (data: T) => Result<U, E>
): Result<U, E> =>
  isSuccess(result) ? mapper(result.data) : { success: false, error: result.error };