import type { DeclarationContext } from './context'

export type LiasseFormType = '2031' | '2031bis' | '2033'

export interface FormCaseDefinition {
  form: LiasseFormType
  code: string
  label: string
  description: string
  category: 'recettes' | 'charges' | 'amortissements' | 'resultat' | 'divers'
  compute: (context: DeclarationContext) => number
}

export interface FormCaseValue extends FormCaseDefinition {
  autoValue: number
  value: number
  overridden: boolean
}

export type FormOverrides = Partial<Record<LiasseFormType, Record<string, number>>>

export interface LiasseFormMapping {
  form: LiasseFormType
  title: string
  cases: FormCaseValue[]
}

export interface FormValidationIssue {
  form: LiasseFormType | 'global'
  code: string
  message: string
  severity: 'warning' | 'error'
}

const computeAmortizationCap = (context: DeclarationContext): number => {
  const { totals } = context
  const preAmortizationResult = totals.totalRevenue - totals.totalExpenses
  return Math.min(Math.max(preAmortizationResult, 0), totals.totalAmortizations)
}

const CASE_DEFINITIONS: FormCaseDefinition[] = [
  {
    form: '2031',
    code: '5XC',
    label: "Chiffre d'affaires (HT)",
    description: 'Total des loyers et recettes LMNP déclarés',
    category: 'recettes',
    compute: (context) => context.totals.totalRevenue
  },
  {
    form: '2031',
    code: '5XD',
    label: 'Charges déductibles',
    description: 'Total des charges et dépenses déductibles',
    category: 'charges',
    compute: (context) => context.totals.totalExpenses
  },
  {
    form: '2031',
    code: '5XE',
    label: 'Amortissements déductibles',
    description: "Plafonnés pour ne pas créer ou majorer un déficit (LMNP)",
    category: 'amortissements',
    compute: computeAmortizationCap
  },
  {
    form: '2031',
    code: '5XF',
    label: 'Résultat fiscal LMNP',
    description: 'Résultat après charges et amortissements imputables',
    category: 'resultat',
    compute: (context) => context.totals.netResult
  },
  {
    form: '2031bis',
    code: '5ZG',
    label: 'Biens concernés',
    description: 'Nombre de biens LMNP dans le périmètre de la déclaration',
    category: 'divers',
    compute: (context) => context.properties.length
  },
  {
    form: '2031bis',
    code: '5ZH',
    label: 'Total des recettes',
    description: 'Report du chiffre d’affaires (2031 - 5XC)',
    category: 'recettes',
    compute: (context) => context.totals.totalRevenue
  },
  {
    form: '2031bis',
    code: '5ZK',
    label: 'Résultat imposable',
    description: 'Aligné sur le résultat fiscal de la 2031',
    category: 'resultat',
    compute: (context) => context.totals.netResult
  },
  {
    form: '2033',
    code: '2058A1',
    label: 'Produits d’exploitation',
    description: 'Recettes locatives et produits divers',
    category: 'recettes',
    compute: (context) => context.totals.totalRevenue
  },
  {
    form: '2033',
    code: '2058A2',
    label: "Charges d'exploitation",
    description: 'Dépenses déductibles (entretien, assurances, taxes...)',
    category: 'charges',
    compute: (context) => context.totals.totalExpenses
  },
  {
    form: '2033',
    code: '2058A3',
    label: 'Dotations aux amortissements',
    description: 'Amortissements LMNP imputés sur le résultat',
    category: 'amortissements',
    compute: computeAmortizationCap
  },
  {
    form: '2033',
    code: '2058A4',
    label: 'Résultat fiscal simplifié',
    description: 'Résultat après charges et amortissements (2033-A)',
    category: 'resultat',
    compute: (context) => context.totals.netResult
  }
]

export const buildFormMappings = (
  context: DeclarationContext,
  overrides: FormOverrides = {}
): LiasseFormMapping[] => {
  const grouped = new Map<LiasseFormType, FormCaseValue[]>()

  CASE_DEFINITIONS.forEach((definition) => {
    const autoValue = Number(definition.compute(context).toFixed(2))
    const formOverrides = overrides[definition.form] ?? {}
    const overrideValue = formOverrides[definition.code]
    const value = typeof overrideValue === 'number' && Number.isFinite(overrideValue) ? overrideValue : autoValue

    const caseValue: FormCaseValue = {
      ...definition,
      autoValue,
      value,
      overridden: typeof overrideValue === 'number' && Number.isFinite(overrideValue)
    }

    if (!grouped.has(definition.form)) {
      grouped.set(definition.form, [])
    }
    grouped.get(definition.form)!.push(caseValue)
  })

  return Array.from(grouped.entries()).map(([form, cases]) => ({
    form,
    title: form === '2031' ? 'Formulaire 2031' : form === '2031bis' ? '2031 Bis' : 'Liasse simplifiée 2033',
    cases
  }))
}

export const validateFormMappings = (
  mappings: LiasseFormMapping[],
  context: DeclarationContext
): FormValidationIssue[] => {
  const issues: FormValidationIssue[] = []
  const amortizationCap = computeAmortizationCap(context)
  const revenue = context.totals.totalRevenue
  const expenses = context.totals.totalExpenses
  const expectedResult = Number((revenue - expenses - amortizationCap).toFixed(2))

  mappings.forEach((mapping) => {
    const getValue = (code: string) => mapping.cases.find((item) => item.code === code)?.value ?? 0

    if (mapping.form === '2031') {
      const result = getValue('5XF')
      const ca = getValue('5XC')
      const charges = getValue('5XD')
      const amortissements = getValue('5XE')
      const recomputed = Number((ca - charges - amortissements).toFixed(2))

      if (Math.abs(result - recomputed) > 1) {
        issues.push({
          form: mapping.form,
          code: '5XF',
          message: `Le résultat (5XF) devrait être proche de ${recomputed.toLocaleString('fr-FR', {
            minimumFractionDigits: 2
          })} compte tenu des montants saisis`,
          severity: 'error'
        })
      }
    }

    if (mapping.form === '2033') {
      const result = getValue('2058A4')
      const recomputed = Number((getValue('2058A1') - getValue('2058A2') - getValue('2058A3')).toFixed(2))
      if (Math.abs(result - recomputed) > 1) {
        issues.push({
          form: mapping.form,
          code: '2058A4',
          message: 'Le résultat 2033-A devrait correspondre aux produits moins charges et amortissements.',
          severity: 'warning'
        })
      }
    }

    mapping.cases.forEach((item) => {
      if ((item.category === 'charges' || item.category === 'amortissements') && item.value > revenue * 2) {
        issues.push({
          form: mapping.form,
          code: item.code,
          message: `Le montant de ${item.label} paraît élevé par rapport au chiffre d'affaires déclaré`,
          severity: 'warning'
        })
      }
    })
  })

  if (Math.abs(context.totals.netResult - expectedResult) > 1) {
    issues.push({
      form: 'global',
      code: 'RESULT',
      message: "Le résultat fiscal théorique (recettes - charges - amortissements imputables) ne correspond pas au total déclaré",
      severity: 'warning'
    })
  }

  if (amortizationCap < context.totals.totalAmortizations) {
    issues.push({
      form: 'global',
      code: 'CAP',
      message: "Les amortissements ont été plafonnés pour respecter les règles LMNP (pas de déficit supplémentaire)",
      severity: 'warning'
    })
  }

  return issues
}

export interface LiasseGenerationSnapshot {
  mappings: LiasseFormMapping[]
  issues: FormValidationIssue[]
  generatedAt: string
}

export const buildGenerationSnapshot = (
  context: DeclarationContext,
  overrides: FormOverrides = {}
): LiasseGenerationSnapshot => {
  const mappings = buildFormMappings(context, overrides)
  const issues = validateFormMappings(mappings, context)
  return {
    mappings,
    issues,
    generatedAt: new Date().toISOString()
  }
}
