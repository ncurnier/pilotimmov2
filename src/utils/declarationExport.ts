import type { DeclarationContext } from '@/domain/declarations/context'
import type { LiasseFormMapping, FormValidationIssue } from '@/domain/declarations/formMapping'
import { formatCurrency, formatDate } from '@/services/supabase/utils'

const buildTextSection = (title: string, lines: string[]): string => {
  const header = `\n${title}\n${'-'.repeat(title.length)}`
  return [header, ...lines].join('\n')
}

const escapePdfText = (text: string): string =>
  text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')

const buildPdfDocument = (text: string): Blob => {
  const encoder = new TextEncoder()
  const contentLines = text
    .split('\n')
    .map((line) => `(${escapePdfText(line)}) Tj T*`)
    .join('\n')

  const contentStream = `BT /F1 11 Tf 50 780 Td 14 TL\n${contentLines}\nET`
  const contentLength = encoder.encode(contentStream).length

  const objects: string[] = []
  const xrefEntries = ['0000000000 65535 f \n']
  let offset = encoder.encode('%PDF-1.4\n').length

  const addObject = (body: string) => {
    const objectString = `${body}\n`
    xrefEntries.push(`${String(offset).padStart(10, '0')} 00000 n \n`)
    offset += encoder.encode(objectString).length
    objects.push(objectString)
  }

  addObject('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj')
  addObject('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj')
  addObject(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj'
  )
  addObject(`4 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream\nendobj`)
  addObject('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj')

  const xrefStart = offset
  const xref = `xref\n0 ${objects.length + 1}\n${xrefEntries.join('')}`
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  const pdfString = ['%PDF-1.4', ...objects, xref, trailer].join('\n')

  return new Blob([encoder.encode(pdfString)], { type: 'application/pdf' })
}

export const buildDeclarationSummary = (context: DeclarationContext): string => {
  const { declaration, totals, properties, revenues, expenses, amortizations } = context
  const header = `Déclaration LMNP ${declaration.year + 1} (revenus ${declaration.year})`
  const amortizationCap = Math.min(
    Math.max(totals.totalRevenue - totals.totalExpenses, 0),
    totals.totalAmortizations
  )

  const propertiesSection = buildTextSection(
    'Biens déclarés',
    properties.length > 0
      ? properties.map((property) => `• ${property.address || property.id}`)
      : ['Aucun bien associé.']
  )

  const revenuesSection = buildTextSection(
    'Revenus',
    revenues.length > 0
      ? revenues.map(
          (revenue) =>
            `${formatDate(revenue.date)} - ${formatCurrency(revenue.amount)} (${revenue.description || revenue.type})`
        )
      : ['Aucun revenu enregistré.']
  )

  const expensesSection = buildTextSection(
    'Dépenses',
    expenses.length > 0
      ? expenses.map(
          (expense) =>
            `${formatDate(expense.date)} - ${formatCurrency(expense.amount)} (${expense.description || expense.category})`
        )
      : ['Aucune dépense enregistrée.']
  )

  const amortizationsSection = buildTextSection(
    'Amortissements (LMNP BIC)',
    amortizations.length > 0
      ? amortizations.map(
          (amortization) =>
            `${formatDate(amortization.purchase_date)} - ${formatCurrency(amortization.annual_amortization)} (${amortization.item_name}, ${amortization.useful_life_years} ans)`
        )
      : ["Aucun amortissement actif pour l'année fiscale."]
  )

  const totalsSection = buildTextSection('Totaux LMNP (BIC réel)', [
    `Revenus totaux : ${formatCurrency(totals.totalRevenue)}`,
    `Dépenses totales : ${formatCurrency(totals.totalExpenses)}`,
    `Amortissements imputés : ${formatCurrency(amortizationCap)} (plafonnés pour éviter un déficit)`,
    `Résultat fiscal LMNP après amortissements : ${formatCurrency(totals.netResult)}`
  ])

  const detailsSection = buildTextSection('Détails', [
    `Régime : ${declaration.details?.regime ?? 'régime réel LMNP avec amortissements'}`,
    `Description : ${declaration.details?.description ?? 'non renseignée'}`
  ])

  return [
    header,
    'Régime LMNP BIC : intégration des amortissements selon les règles fiscales en vigueur.',
    propertiesSection,
    revenuesSection,
    expensesSection,
    amortizationsSection,
    totalsSection,
    detailsSection
  ].join('\n')
}

export const downloadDeclarationPdf = (context: DeclarationContext) => {
  const summary = buildDeclarationSummary(context)
  const pdfBlob = buildPdfDocument(summary)
  const url = URL.createObjectURL(pdfBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `declaration-lmnp-${context.declaration.year}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}

const buildLiasseSummary = (
  context: DeclarationContext,
  mappings: LiasseFormMapping[],
  issues: FormValidationIssue[],
  generatedAt: Date
): string => {
  const baseSummary = buildDeclarationSummary(context)
  const mappingLines = mappings
    .map((mapping) => {
      const title = `${mapping.title}`
      const rows = mapping.cases.map((item) => {
        const overrideFlag = item.overridden ? ' (ajusté manuellement)' : ''
        return `${item.code} - ${item.label}: ${formatCurrency(item.value)}${overrideFlag}`
      })
      return [title, ...rows].join('\n')
    })
    .join('\n\n')

  const validationLines =
    issues.length > 0
      ? [
          'Contrôles de cohérence',
          ...issues.map((issue) => `• ${issue.form.toString()} ${issue.code}: ${issue.message}`)
        ].join('\n')
      : 'Contrôles de cohérence: aucune alerte.'

  return [
    `${baseSummary}\n\n---\nGénération de liasse le ${formatDate(generatedAt.toISOString())}`,
    mappingLines,
    validationLines
  ].join('\n\n')
}

export const downloadLiassePdf = (
  context: DeclarationContext,
  mappings: LiasseFormMapping[],
  issues: FormValidationIssue[],
  generatedAt: Date
) => {
  const summary = buildLiasseSummary(context, mappings, issues, generatedAt)
  const pdfBlob = buildPdfDocument(summary)
  const url = URL.createObjectURL(pdfBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `liasse-lmnp-${context.declaration.year}-${generatedAt.toISOString()}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}

export const downloadLiasseEdi = (
  context: DeclarationContext,
  mappings: LiasseFormMapping[],
  issues: FormValidationIssue[],
  generatedAt: Date
) => {
  const payload = {
    declaration_id: context.declaration.id,
    year: context.declaration.year,
    generated_at: generatedAt.toISOString(),
    forms: mappings.map((mapping) => ({
      form: mapping.form,
      cases: mapping.cases.map((item) => ({
        code: item.code,
        label: item.label,
        value: item.value,
        overridden: item.overridden
      }))
    })),
    validations: issues
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `liasse-edi-${context.declaration.year}-${generatedAt.toISOString()}.json`
  link.click()
  URL.revokeObjectURL(url)
}
