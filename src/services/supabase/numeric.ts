export function convertNumericFields<T extends Record<string, unknown>>(
  item: T,
  fields: (keyof T)[]
): T {
  const result = { ...item }

  for (const field of fields) {
    const value = result[field]

    if (value !== null && value !== undefined) {
      result[field] = Number(value) as T[keyof T]
    }
  }

  return result
}

export function convertNullableNumericFields<T extends Record<string, unknown>>(
  item: T | null,
  fields: (keyof T)[]
): T | null {
  if (!item) {
    return item
  }

  return convertNumericFields(item, fields)
}

export function convertArrayNumericFields<T extends Record<string, unknown>>(
  items: T[] | null | undefined,
  fields: (keyof T)[]
): T[] {
  if (!items) {
    return []
  }

  return items.map((item) => convertNumericFields(item, fields))
}
