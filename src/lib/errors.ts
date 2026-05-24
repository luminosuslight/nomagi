export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function reportError(context: string, err: unknown): void {
  console.error(`[${context}]`, err)
  if (err instanceof Error && err.stack) {
    console.error(err.stack)
  }
}
