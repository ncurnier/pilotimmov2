import type { Declaration, Expense, Property, Revenue } from '@/services/supabase/types'
import { calculateDeclarationTotals, getExpensesForYear, getRevenuesForYear, type DeclarationTotals } from './calculations'

export interface DeclarationContext {
  declaration: Declaration
  totals: DeclarationTotals
  revenues: Revenue[]
  expenses: Expense[]
  properties: Property[]
}

export const buildDeclarationContext = (
  declaration: Declaration,
  allRevenues: Revenue[],
  allExpenses: Expense[],
  allProperties: Property[]
): DeclarationContext => {
  const revenues = getRevenuesForYear(declaration.year, allRevenues)
  const expenses = getExpensesForYear(declaration.year, allExpenses)
  const properties = allProperties.filter((property) => declaration.properties?.includes(property.id))
  const totals = calculateDeclarationTotals(declaration.year, allRevenues, allExpenses)

  return {
    declaration,
    totals,
    revenues,
    expenses,
    properties
  }
}
