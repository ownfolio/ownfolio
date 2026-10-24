import { z } from 'zod'

export const categorySchema = z
  .object({
    id: z.string().describe('ID of the category'),
    categorizationId: z.string().describe('ID of the categorization the category belongs to'),
    parentCategoryId: z
      .string()
      .nullable()
      .default(null)
      .describe('ID of the parent category in the same categorization, or null for a top level category'),
    name: z.string().trim().min(1).max(128).describe('Display name, e.g. "EU" or "Germany"'),
    createdAt: z.string().datetime().describe('Creation timestamp (ISO 8601), set by the server'),
  })
  .describe('A category inside a categorization. Categories can be nested, e.g. "Germany" below "EU"')

export type Category = z.infer<typeof categorySchema>

export function createEmptyCategory(categorizationId: string): Category {
  return {
    id: '',
    categorizationId,
    parentCategoryId: null,
    name: '',
    createdAt: '',
  }
}

export interface CategoryTreeNode {
  category: Category
  depth: number
}

// flattens the categories depth first, every category directly followed by its subcategories
export function flattenCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const result: CategoryTreeNode[] = []
  const visit = (parentCategoryId: string | null, depth: number) => {
    categories
      .filter(c => c.parentCategoryId === parentCategoryId)
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
      .forEach(category => {
        result.push({ category, depth })
        visit(category.id, depth + 1)
      })
  }
  visit(null, 0)
  return result
}

export function categoryPath(categories: Category[], categoryId: string): Category[] {
  const result: Category[] = []
  let current = categories.find(c => c.id === categoryId)
  while (current && !result.includes(current)) {
    result.unshift(current)
    current = categories.find(c => c.id === current!.parentCategoryId)
  }
  return result
}
