import type { DeclarationContext } from '@/domain/declarations/context'
import { formatCurrency, formatDate } from '@/services/supabase/utils'

const buildTextSection = (title: string, lines: string[]): string => {
  const header = `\n${title}\n${'-'.repeat(title.length)}`
  return [header, ...lines].join('\n')
}

export const buildDeclarationSummary = (context: DeclarationContext): string => {
  const { declaration, totals, properties, revenues, expenses } = context
  const header = `Déclaration LMNP ${declaration.year + 1} (revenus ${declaration.year})`

  const propertiesSection = buildTextSection(
    'Biens déclarés',
    properties.length > 0
      ? properties.map((property) => `• ${property.address || property.id}`)
      : ['Aucun bien associé']
  )

  const revenuesSection = buildTextSection(
    'Revenus',
    revenues.length > 0
      ? revenues.map(
          (revenue) =>
            `${formatDate(revenue.date)} - ${formatCurrency(revenue.amount)} (${revenue.description || revenue.type})`
        )
      : ['Aucun revenu enregistré']
  )

  const expensesSection = buildTextSection(
    'Dépenses',
    expenses.length > 0
      ? expenses.map(
          (expense) =>
            `${formatDate(expense.date)} - ${formatCurrency(expense.amount)} (${expense.description || expense.category})`
        )
      : ['Aucune dépense enregistrée']
  )

  const totalsSection = buildTextSection('Totaux', [
    `Revenus totaux : ${formatCurrency(totals.totalRevenue)}`,
    `Dépenses totales : ${formatCurrency(totals.totalExpenses)}`,
    `Résultat net : ${formatCurrency(totals.netResult)}`
  ])

  const detailsSection = buildTextSection('Détails', [
    `Régime : ${declaration.details?.regime ?? 'non renseigné'}`,
    `Description : ${declaration.details?.description ?? 'non renseignée'}`
  ])

  return [header, propertiesSection, revenuesSection, expensesSection, totalsSection, detailsSection].join('\n')
}

export const downloadDeclarationPdf = (context: DeclarationContext) => {
  const summary = buildDeclarationSummary(context)
  const blob = new Blob([summary], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `declaration-lmnp-${context.declaration.year}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
