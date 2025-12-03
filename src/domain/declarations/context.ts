import type { Amortization, Declaration, Expense, Property, Revenue } from '@/services/supabase/types'
import {
  calculateDeclarationTotals,
  getAmortizationsForYear,
  getExpensesForYear,
  getRevenuesForYear,
  type DeclarationTotals
} from './calculations'

export interface DeclarationContext {
  declaration: Declaration
  totals: DeclarationTotals
  revenues: Revenue[]
  expenses: Expense[]
  amortizations: Amortization[]
  properties: Property[]
}

export const buildDeclarationContext = (
  declaration: Declaration,
  allRevenues: Revenue[],
  allExpenses: Expense[],
  allProperties: Property[],
  allAmortizations: Amortization[]
): DeclarationContext => {
  const revenues = getRevenuesForYear(declaration.year, allRevenues, declaration.properties)
  const expenses = getExpensesForYear(declaration.year, allExpenses, declaration.properties)
  const properties = allProperties.filter((property) => declaration.properties?.includes(property.id))
  const amortizations = getAmortizationsForYear(declaration.year, allAmortizations, declaration.properties)
  const totals = calculateDeclarationTotals(
    declaration.year,
    allRevenues,
    allExpenses,
    allAmortizations,
    declaration.properties
  )

  return {
    declaration,
    totals,
    revenues,
    expenses,
    amortizations,
    properties
  }
}
