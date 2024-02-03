export function formatInt(n: number, minDigits: number): string {
  let result = n.toString()
  while (result.length < minDigits) {
    result = '0' + result
  }
  return result
}

export function formatSize(n: number): string {
  if (n < 1e3) {
    return `${n} B`
  }
  if (n < 1e6) {
    return `${Math.floor(n * 1e-3)} KB`
  }
  if (n < 1e9) {
    return `${Math.floor(n * 1e-6)} MB`
  }
  return `${Math.floor(n * 1e-9)} GB`
}
