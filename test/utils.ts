export async function usingInstance<T extends { close: () => Promise<void> }>(
  create: () => Promise<T>,
  fn: (element: T) => Promise<void>
): Promise<void> {
  const instance = await create()
  try {
    await fn(instance)
  } finally {
    await instance.close()
  }
}
