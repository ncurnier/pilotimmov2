import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Layers,
  Loader2,
  RefreshCcw,
  ShieldCheck
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import {
  type AccountingReportResult,
  generateAccountingReports
} from '@/services/accountingReports'
import { formatCurrency, formatDate } from '@/services/supabase/utils'
import logger from '@/utils/logger'

const downloadFile = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const toCsv = (rows: (string | number)[][]): string => {
  return rows.map((row) => row.join(';')).join('\n')
}

export function AccountingReportsPage() {
  const { user } = useAuth()
  const currentYear = new Date().getFullYear()
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`)
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`)
  const [report, setReport] = useState<AccountingReportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!user) return

    if (new Date(startDate) > new Date(endDate)) {
      setError('La date de début doit être antérieure à la date de fin')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await generateAccountingReports(user.uid, { startDate, endDate })
      setReport(result)
      logger.info('États comptables générés', { startDate, endDate })
    } catch (err) {
      logger.error('Erreur lors de la génération des états comptables', err)
      setError("Impossible de générer les états comptables. Réessayez plus tard.")
    } finally {
      setLoading(false)
    }
  }

  const exportBalance = (format: 'csv' | 'pdf') => {
    if (!report) return
    const rows = [
      ['Section', 'Libellé', 'Montant'] as (string | number)[],
      ...report.balanceSheet.assets.map((line) => ['Actif', line.label, line.amount]),
      ['Actif', 'Total actif', report.balanceSheet.totalAssets],
      ...report.balanceSheet.liabilities.map((line) => ['Passif', line.label, line.amount]),
      ['Passif', 'Total passif', report.balanceSheet.totalLiabilities]
    ]

    if (format === 'csv') {
      downloadFile(
        `bilan_${report.period.startDate}_${report.period.endDate}.csv`,
        toCsv(rows),
        'text/csv'
      )
    } else {
      const text = rows.map((row) => row.join(' \t ')).join('\n')
      downloadFile(
        `bilan_${report.period.startDate}_${report.period.endDate}.pdf`,
        text,
        'application/pdf'
      )
    }
  }

  const exportIncome = (format: 'csv' | 'pdf') => {
    if (!report) return
    const rows = [
      ['Nature', 'Libellé', 'Montant'] as (string | number)[],
      ...report.incomeStatement.revenues.map((line) => ['Produits', line.label, line.amount]),
      ['Produits', 'Total produits', report.incomeStatement.totalRevenues],
      ...report.incomeStatement.expenses.map((line) => ['Charges', line.label, line.amount]),
      ['Charges', 'Total charges', report.incomeStatement.totalExpenses],
      ['Résultat', 'Résultat net', report.incomeStatement.netResult]
    ]

    if (format === 'csv') {
      downloadFile(
        `compte_resultat_${report.period.startDate}_${report.period.endDate}.csv`,
        toCsv(rows),
        'text/csv'
      )
    } else {
      const text = rows.map((row) => row.join(' \t ')).join('\n')
      downloadFile(
        `compte_resultat_${report.period.startDate}_${report.period.endDate}.pdf`,
        text,
        'application/pdf'
      )
    }
  }

  const exportLedger = (format: 'csv' | 'pdf') => {
    if (!report) return
    const rows: (string | number)[][] = [[
      'Compte',
      'Libellé',
      'Date',
      'Description',
      'Débit',
      'Crédit',
      'Référence'
    ]]

    report.ledger.forEach((account) => {
      account.entries.forEach((entry) => {
        rows.push([
          account.account,
          account.label,
          formatDate(entry.date),
          entry.description,
          entry.debit,
          entry.credit,
          entry.reference
        ])
      })
      rows.push([
        account.account,
        'Total',
        '',
        '',
        account.totalDebit,
        account.totalCredit,
        ''
      ])
    })

    if (format === 'csv') {
      downloadFile(
        `grand_livre_${report.period.startDate}_${report.period.endDate}.csv`,
        toCsv(rows),
        'text/csv'
      )
    } else {
      const text = rows.map((row) => row.join(' \t ')).join('\n')
      downloadFile(
        `grand_livre_${report.period.startDate}_${report.period.endDate}.pdf`,
        text,
        'application/pdf'
      )
    }
  }

  const summaryCards = useMemo(() => {
    if (!report) return []
    return [
      {
        label: 'Total produits',
        value: formatCurrency(report.incomeStatement.totalRevenues),
        icon: <Layers className="h-5 w-5 text-accent-green" />,
        helper: 'Somme des revenus sur la période'
      },
      {
        label: 'Total charges',
        value: formatCurrency(report.incomeStatement.totalExpenses),
        icon: <Layers className="h-5 w-5 text-accent-gold" />,
        helper: 'Charges y compris amortissements'
      },
      {
        label: 'Résultat net',
        value: formatCurrency(report.incomeStatement.netResult),
        icon: <ShieldCheck className="h-5 w-5 text-accent-blue" />,
        helper: 'Doit concorder avec le bilan'
      }
    ]
  }, [report])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-300 uppercase tracking-wider">Reporting comptable</p>
          <h1 className="text-3xl font-bold text-text-secondary font-playfair">États comptables</h1>
          <p className="text-gray-400 mt-2">
            Générer le bilan, le compte de résultat et le grand livre par période.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleGenerate}
            className="inline-flex items-center px-4 py-2 bg-accent-blue text-text-secondary rounded-lg hover:bg-opacity-90 transition-smooth"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4 mr-2" />
            )}
            Générer les états
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-bg-card p-4 rounded-xl border border-gray-700">
        <div className="space-y-2">
          <label className="text-sm text-gray-300">Date de début</label>
          <div className="flex items-center space-x-2 bg-bg-primary px-3 py-2 rounded-lg border border-gray-700">
            <CalendarRange className="h-4 w-4 text-accent-gold" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent flex-1 focus:outline-none text-text-secondary"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-gray-300">Date de fin</label>
          <div className="flex items-center space-x-2 bg-bg-primary px-3 py-2 rounded-lg border border-gray-700">
            <CalendarRange className="h-4 w-4 text-accent-gold" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent flex-1 focus:outline-none text-text-secondary"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-gray-300">Synthèse rapide</label>
          <div className="bg-bg-primary px-3 py-2 rounded-lg border border-gray-700 text-sm text-gray-300">
            <p>Période : {formatDate(startDate)} - {formatDate(endDate)}</p>
            <p className="text-gray-400">Arrondis homogènes à 2 décimales</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50/10 border border-red-200 rounded-lg text-red-200 flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {report && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="bg-bg-card border border-gray-700 p-4 rounded-xl shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="text-gray-300 text-sm">{card.label}</div>
                  <div className="p-2 bg-bg-primary rounded-lg">{card.icon}</div>
                </div>
                <div className="text-2xl font-semibold text-text-secondary mt-2">{card.value}</div>
                <p className="text-xs text-gray-400 mt-1">{card.helper}</p>
              </div>
            ))}
          </div>

          <div className="bg-bg-card border border-gray-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-text-secondary">Bilan</h2>
                <p className="text-gray-400 text-sm">Actif / Passif avec contrôle d'équilibre</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => exportBalance('csv')}
                  className="inline-flex items-center px-3 py-2 bg-bg-primary border border-gray-700 rounded-lg text-sm text-text-secondary"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Export CSV
                </button>
                <button
                  onClick={() => exportBalance('pdf')}
                  className="inline-flex items-center px-3 py-2 bg-bg-primary border border-gray-700 rounded-lg text-sm text-text-secondary"
                >
                  <Download className="h-4 w-4 mr-2" /> Export PDF
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Actif</h3>
                <div className="bg-bg-primary rounded-lg border border-gray-700 divide-y divide-gray-800">
                  {report.balanceSheet.assets.map((line) => (
                    <div key={line.label} className="flex items-center justify-between px-3 py-2 text-gray-200">
                      <span>{line.label}</span>
                      <span>{formatCurrency(line.amount)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2 text-text-secondary font-semibold">
                    <span>Total Actif</span>
                    <span>{formatCurrency(report.balanceSheet.totalAssets)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Passif</h3>
                <div className="bg-bg-primary rounded-lg border border-gray-700 divide-y divide-gray-800">
                  {report.balanceSheet.liabilities.map((line) => (
                    <div key={line.label} className="flex items-center justify-between px-3 py-2 text-gray-200">
                      <span>{line.label}</span>
                      <span>{formatCurrency(line.amount)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2 text-text-secondary font-semibold">
                    <span>Total Passif</span>
                    <span>{formatCurrency(report.balanceSheet.totalLiabilities)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-bg-card border border-gray-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-text-secondary">Compte de résultat</h2>
                <p className="text-gray-400 text-sm">Produits / Charges avec net final arrondi</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => exportIncome('csv')}
                  className="inline-flex items-center px-3 py-2 bg-bg-primary border border-gray-700 rounded-lg text-sm text-text-secondary"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Export CSV
                </button>
                <button
                  onClick={() => exportIncome('pdf')}
                  className="inline-flex items-center px-3 py-2 bg-bg-primary border border-gray-700 rounded-lg text-sm text-text-secondary"
                >
                  <Download className="h-4 w-4 mr-2" /> Export PDF
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Produits</h3>
                <div className="bg-bg-primary rounded-lg border border-gray-700 divide-y divide-gray-800">
                  {report.incomeStatement.revenues.map((line) => (
                    <div key={line.label} className="flex items-center justify-between px-3 py-2 text-gray-200">
                      <span>{line.label}</span>
                      <span>{formatCurrency(line.amount)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2 text-text-secondary font-semibold">
                    <span>Total Produits</span>
                    <span>{formatCurrency(report.incomeStatement.totalRevenues)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Charges</h3>
                <div className="bg-bg-primary rounded-lg border border-gray-700 divide-y divide-gray-800">
                  {report.incomeStatement.expenses.map((line) => (
                    <div key={line.label} className="flex items-center justify-between px-3 py-2 text-gray-200">
                      <span>{line.label}</span>
                      <span>{formatCurrency(line.amount)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2 text-text-secondary font-semibold">
                    <span>Total Charges</span>
                    <span>{formatCurrency(report.incomeStatement.totalExpenses)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between bg-bg-primary border border-gray-700 rounded-lg px-4 py-3">
              <span className="text-sm text-gray-300">Résultat net</span>
              <span className="text-xl font-semibold text-text-secondary">{formatCurrency(report.incomeStatement.netResult)}</span>
            </div>
          </div>

          <div className="bg-bg-card border border-gray-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-text-secondary">Grand livre</h2>
                <p className="text-gray-400 text-sm">Détail par compte avec totaux débit/crédit</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => exportLedger('csv')}
                  className="inline-flex items-center px-3 py-2 bg-bg-primary border border-gray-700 rounded-lg text-sm text-text-secondary"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Export CSV
                </button>
                <button
                  onClick={() => exportLedger('pdf')}
                  className="inline-flex items-center px-3 py-2 bg-bg-primary border border-gray-700 rounded-lg text-sm text-text-secondary"
                >
                  <Download className="h-4 w-4 mr-2" /> Export PDF
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {report.ledger.map((account) => (
                <div key={account.account} className="bg-bg-primary border border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                    <div>
                      <p className="text-sm text-gray-300">{account.account} - {account.label}</p>
                      <p className="text-xs text-gray-400">{account.entries.length} écritures</p>
                    </div>
                    <div className="text-sm text-text-secondary font-semibold">
                      Débit {formatCurrency(account.totalDebit)} / Crédit {formatCurrency(account.totalCredit)}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-800">
                    {account.entries.map((entry) => (
                      <div key={entry.reference} className="grid grid-cols-6 gap-2 px-4 py-2 text-sm text-gray-200">
                        <span>{formatDate(entry.date)}</span>
                        <span className="col-span-2 truncate" title={entry.description}>{entry.description}</span>
                        <span className="text-right">{formatCurrency(entry.debit)}</span>
                        <span className="text-right">{formatCurrency(entry.credit)}</span>
                        <span className="text-right text-gray-400">{entry.reference}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-bg-card border border-gray-700 rounded-xl p-5">
            <div className="flex items-center mb-4 space-x-2">
              <CheckCircle2 className="h-5 w-5 text-accent-green" />
              <h3 className="text-lg font-semibold text-text-secondary">Contrôles de cohérence</h3>
            </div>
            <div className="space-y-3">
              {report.checks.map((check) => (
                <div
                  key={check.message}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                    check.status === 'ok'
                      ? 'border-green-500/40 bg-green-500/10 text-green-100'
                      : 'border-amber-400/40 bg-amber-500/10 text-amber-100'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {check.status === 'ok' ? (
                      <ShieldCheck className="h-5 w-5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5" />
                    )}
                    <span>{check.message}</span>
                  </div>
                  {check.gap !== undefined && Math.abs(check.gap) >= 0.01 && (
                    <span className="text-sm">Écart: {formatCurrency(check.gap)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
