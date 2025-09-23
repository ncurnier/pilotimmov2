export function ensureNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/\s+/g, '').replace(',', '.')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }

  if (typeof value === 'bigint') {
    return Number(value)
  }

  if (value instanceof Number) {
    return value.valueOf()
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
