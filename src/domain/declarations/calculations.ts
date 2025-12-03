import type { Expense, Revenue } from '@/services/supabase/types'

export interface DeclarationTotals {
  totalRevenue: number
  totalExpenses: number
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

export const calculateDeclarationTotals = (
  year: number,
  revenues: Revenue[],
  expenses: Expense[]
): DeclarationTotals => {
  const yearRevenues = getRevenuesForYear(year, revenues)
  const yearExpenses = getExpensesForYear(year, expenses)

  const totalRevenue = yearRevenues.reduce((sum, revenue) => sum + ensureNumber(revenue.amount), 0)
  const totalExpenses = yearExpenses.reduce((sum, expense) => sum + ensureNumber(expense.amount), 0)
  const netResult = totalRevenue - totalExpenses

  return { totalRevenue, totalExpenses, netResult }
}
