import type { Amortization, Expense, Revenue } from '@/services/supabase/types'

export interface DeclarationTotals {
  totalRevenue: number
  totalExpenses: number
  totalAmortizations: number
  netResult: number
}

const ensureNumber = (value: unknown): number => {
  const numericValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}

export const getRevenuesForYear = (year: number, revenues: Revenue[]): Revenue[] =>
  revenues.filter((revenue) => new Date(revenue.date).getFullYear() === year)

export const getExpensesForYear = (
  year: number,
  expenses: Expense[],
  { deductibleOnly = true }: { deductibleOnly?: boolean } = { deductibleOnly: true }
): Expense[] =>
  expenses.filter((expense) => {
    const isSameYear = new Date(expense.date).getFullYear() === year
    return deductibleOnly ? isSameYear && expense.deductible : isSameYear
  })

export const getAmortizationsForYear = (
  year: number,
  amortizations: Amortization[],
  propertyIds?: string[]
): Amortization[] => {
  const hasPropertyFilter = Array.isArray(propertyIds) && propertyIds.length > 0

  return amortizations.filter((amortization) => {
    const purchaseYear = new Date(amortization.purchase_date).getFullYear()
    const isEligibleYear = purchaseYear <= year && amortization.status === 'active'
    const matchesProperty = hasPropertyFilter ? propertyIds!.includes(amortization.property_id) : true
    return isEligibleYear && matchesProperty && ensureNumber(amortization.annual_amortization) > 0
  })
}

export const calculateDeclarationTotals = (
  year: number,
  revenues: Revenue[],
  expenses: Expense[],
  amortizations: Amortization[] = [],
  propertyIds?: string[]
): DeclarationTotals => {
  const yearRevenues = getRevenuesForYear(year, revenues)
  const yearExpenses = getExpensesForYear(year, expenses)
  const yearAmortizations = getAmortizationsForYear(year, amortizations, propertyIds)

  const totalRevenue = yearRevenues.reduce((sum, revenue) => sum + ensureNumber(revenue.amount), 0)
  const totalExpenses = yearExpenses.reduce((sum, expense) => sum + ensureNumber(expense.amount), 0)
  const totalAmortizations = yearAmortizations.reduce(
    (sum, amortization) => sum + ensureNumber(amortization.annual_amortization),
    0
  )

  const preAmortizationResult = totalRevenue - totalExpenses
  // Régime LMNP BIC : les amortissements ne doivent pas créer ou amplifier un déficit.
  const deductibleAmortizations = Math.min(Math.max(preAmortizationResult, 0), totalAmortizations)
  const netResult = preAmortizationResult - deductibleAmortizations

  return { totalRevenue, totalExpenses, totalAmortizations, netResult }
}
