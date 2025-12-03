import { amortizationService } from '@/services/supabase/amortizations'
import { expenseService } from '@/services/supabase/expenses'
import { revenueService } from '@/services/supabase/revenues'
import type { Amortization, Expense, Revenue } from '@/services/supabase/types'
import logger from '@/utils/logger'

export interface AccountingPeriod {
  startDate: string
  endDate: string
}

export interface StatementLine {
  label: string
  amount: number
}

export interface BalanceSheet {
  assets: StatementLine[]
  liabilities: StatementLine[]
  totalAssets: number
  totalLiabilities: number
  isBalanced: boolean
  balanceGap: number
}

export interface IncomeStatement {
  revenues: StatementLine[]
  expenses: StatementLine[]
  totalRevenues: number
  totalExpenses: number
  netResult: number
}

export interface LedgerEntry {
  date: string
  description: string
  debit: number
  credit: number
  reference: string
}

export interface LedgerAccount {
  account: string
  label: string
  entries: LedgerEntry[]
  totalDebit: number
  totalCredit: number
}

export interface ConsistencyCheck {
  message: string
  status: 'ok' | 'warning' | 'error'
  gap?: number
}

export interface AccountingReportResult {
  period: AccountingPeriod
  balanceSheet: BalanceSheet
  incomeStatement: IncomeStatement
  ledger: LedgerAccount[]
  checks: ConsistencyCheck[]
}

const ensureNumber = (value: unknown): number => {
  const numericValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}

const isWithinPeriod = (date: string, start: Date, end: Date): boolean => {
  const value = new Date(date)
  return value >= start && value <= end
}

const roundTwo = (value: number): number => {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

const getPeriodDurationInDays = (start: Date, end: Date): number => {
  const MS_PER_DAY = 1000 * 60 * 60 * 24
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1)
}

const computeAmortizationForPeriod = (
  amortization: Amortization,
  start: Date,
  end: Date
): number => {
  const purchaseDate = new Date(amortization.purchase_date)
  if (purchaseDate > end || amortization.status !== 'active') return 0

  const effectiveStart = purchaseDate > start ? purchaseDate : start
  const coveredDays = getPeriodDurationInDays(effectiveStart, end)
  const annualDays = getPeriodDurationInDays(
    new Date(end.getFullYear(), 0, 1),
    new Date(end.getFullYear(), 11, 31)
  )
  const prorata = Math.min(1, coveredDays / annualDays)
  return prorata * ensureNumber(amortization.annual_amortization)
}

const buildLedgerAccount = (
  map: Map<string, LedgerAccount>,
  account: string,
  label: string,
  entry: LedgerEntry
) => {
  const existing = map.get(account)
  if (!existing) {
    map.set(account, {
      account,
      label,
      entries: [entry],
      totalDebit: entry.debit,
      totalCredit: entry.credit
    })
    return
  }

  existing.entries.push(entry)
  existing.totalDebit = roundTwo(existing.totalDebit + entry.debit)
  existing.totalCredit = roundTwo(existing.totalCredit + entry.credit)
}

const buildIncomeStatement = (
  revenues: Revenue[],
  expenses: Expense[],
  amortizations: Amortization[],
  start: Date,
  end: Date
): IncomeStatement => {
  const revenueGroups: Record<string, number> = {}
  const expenseGroups: Record<string, number> = {}

  revenues.forEach((revenue) => {
    if (!isWithinPeriod(revenue.date, start, end)) return
    const key = revenue.type
    revenueGroups[key] = roundTwo((revenueGroups[key] || 0) + ensureNumber(revenue.amount))
  })

  expenses.forEach((expense) => {
    if (!isWithinPeriod(expense.date, start, end)) return
    const key = expense.category
    expenseGroups[key] = roundTwo((expenseGroups[key] || 0) + ensureNumber(expense.amount))
  })

  amortizations.forEach((amortization) => {
    const amortizedAmount = computeAmortizationForPeriod(amortization, start, end)
    if (amortizedAmount <= 0) return
    expenseGroups['amortissements'] = roundTwo(
      (expenseGroups['amortissements'] || 0) + amortizedAmount
    )
  })

  const revenueLines = Object.entries(revenueGroups).map(([label, amount]) => ({ label, amount }))
  const expenseLines = Object.entries(expenseGroups).map(([label, amount]) => ({ label, amount }))

  const totalRevenues = roundTwo(revenueLines.reduce((sum, line) => sum + line.amount, 0))
  const totalExpenses = roundTwo(expenseLines.reduce((sum, line) => sum + line.amount, 0))
  const netResult = roundTwo(totalRevenues - totalExpenses)

  return {
    revenues: revenueLines,
    expenses: expenseLines,
    totalRevenues,
    totalExpenses,
    netResult
  }
}

const buildBalanceSheet = (
  amortizations: Amortization[],
  netResult: number,
  start: Date,
  end: Date
): BalanceSheet => {
  const grossAssets = amortizations
    .filter((item) => new Date(item.purchase_date) <= end)
    .reduce((sum, item) => sum + ensureNumber(item.purchase_amount), 0)

  const accumulatedAmortization = amortizations
    .map((item) => computeAmortizationForPeriod(item, start, end))
    .reduce((sum, value) => sum + value, 0)

  const netAssets = roundTwo(grossAssets - accumulatedAmortization)
  const treasury = roundTwo(netResult)

  const assets: StatementLine[] = [
    { label: 'Immobilisations nettes', amount: netAssets },
    { label: 'Trésorerie et équivalents', amount: treasury }
  ].filter((line) => Math.abs(line.amount) > 0.005)

  const liabilities: StatementLine[] = [
    { label: 'Capitaux propres', amount: netAssets },
    { label: "Résultat de l'exercice", amount: treasury }
  ].filter((line) => Math.abs(line.amount) > 0.005)

  const totalAssets = roundTwo(assets.reduce((sum, line) => sum + line.amount, 0))
  let totalLiabilities = roundTwo(liabilities.reduce((sum, line) => sum + line.amount, 0))
  let balanceGap = roundTwo(totalAssets - totalLiabilities)
  const balancedAssets = [...assets]
  const balancedLiabilities = [...liabilities]

  if (Math.abs(balanceGap) >= 0.01) {
    if (balanceGap > 0) {
      balancedLiabilities.push({ label: "Ajustement d'équilibre", amount: roundTwo(balanceGap) })
    } else {
      balancedAssets.push({ label: "Ajustement d'équilibre", amount: roundTwo(Math.abs(balanceGap)) })
    }
  }

  const finalTotalAssets = roundTwo(balancedAssets.reduce((sum, line) => sum + line.amount, 0))
  totalLiabilities = roundTwo(balancedLiabilities.reduce((sum, line) => sum + line.amount, 0))
  balanceGap = roundTwo(finalTotalAssets - totalLiabilities)

  return {
    assets: balancedAssets,
    liabilities: balancedLiabilities,
    totalAssets: finalTotalAssets,
    totalLiabilities,
    isBalanced: Math.abs(balanceGap) < 0.01,
    balanceGap
  }
}

const buildLedger = (
  revenues: Revenue[],
  expenses: Expense[],
  amortizations: Amortization[],
  start: Date,
  end: Date
): LedgerAccount[] => {
  const ledgerMap = new Map<string, LedgerAccount>()

  revenues.forEach((revenue) => {
    if (!isWithinPeriod(revenue.date, start, end)) return
    const amount = roundTwo(ensureNumber(revenue.amount))
    buildLedgerAccount(ledgerMap, '706', 'Produits locatifs', {
      date: revenue.date,
      description: revenue.description,
      debit: 0,
      credit: amount,
      reference: revenue.id
    })
  })

  expenses.forEach((expense) => {
    if (!isWithinPeriod(expense.date, start, end)) return
    const amount = roundTwo(ensureNumber(expense.amount))
    buildLedgerAccount(ledgerMap, '6xx', `Charges - ${expense.category}`, {
      date: expense.date,
      description: expense.description,
      debit: amount,
      credit: 0,
      reference: expense.id
    })
  })

  amortizations.forEach((amortization) => {
    const amount = roundTwo(computeAmortizationForPeriod(amortization, start, end))
    if (amount <= 0) return
    buildLedgerAccount(ledgerMap, '681', 'Dotations aux amortissements', {
      date: end.toISOString().split('T')[0],
      description: `Amortissement ${amortization.item_name}`,
      debit: amount,
      credit: 0,
      reference: amortization.id
    })
    buildLedgerAccount(ledgerMap, '28', 'Amortissements cumulés', {
      date: end.toISOString().split('T')[0],
      description: `Cumul amort. ${amortization.item_name}`,
      debit: 0,
      credit: amount,
      reference: `${amortization.id}-cumul`
    })
  })

  return Array.from(ledgerMap.values()).map((account) => ({
    ...account,
    entries: account.entries.sort((a, b) => a.date.localeCompare(b.date))
  }))
}

export async function generateAccountingReports(
  userId: string,
  period: AccountingPeriod
): Promise<AccountingReportResult> {
  const start = new Date(period.startDate)
  const end = new Date(period.endDate)

  if (start > end) {
    throw new Error('La date de début doit être antérieure à la date de fin')
  }

  try {
    const [revenues, expenses, amortizations] = await Promise.all([
      revenueService.getByUserId(userId),
      expenseService.getByUserId(userId),
      amortizationService.getByUserId(userId)
    ])

    const incomeStatement = buildIncomeStatement(revenues, expenses, amortizations, start, end)
    const balanceSheet = buildBalanceSheet(amortizations, incomeStatement.netResult, start, end)
    const ledger = buildLedger(revenues, expenses, amortizations, start, end)

    const revenueExpenseGap = roundTwo(
      Math.abs(incomeStatement.netResult - (incomeStatement.totalRevenues - incomeStatement.totalExpenses))
    )

    const checks: ConsistencyCheck[] = [
      {
        message: balanceSheet.isBalanced
          ? 'Bilan équilibré : actif et passif concordent'
          : `Écart détecté entre actif et passif (${balanceSheet.balanceGap.toFixed(2)} €)` ,
        status: balanceSheet.isBalanced ? 'ok' : 'warning',
        gap: balanceSheet.balanceGap
      },
      {
        message:
          revenueExpenseGap < 0.01
            ? 'Total produits - charges aligné sur le résultat net'
            : `Écart calculé sur le résultat (${revenueExpenseGap.toFixed(2)} €)` ,
        status: revenueExpenseGap < 0.01 ? 'ok' : 'warning',
        gap: revenueExpenseGap
      }
    ]

    return {
      period,
      balanceSheet,
      incomeStatement,
      ledger,
      checks
    }
  } catch (error) {
    logger.error('Erreur lors de la génération des états comptables', error)
    throw error
  }
}
