/**
 * Get a user-friendly error message from an unknown error object.
 * Handles Error instances, strings, and other types.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error'
}