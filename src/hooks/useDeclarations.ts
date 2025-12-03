import { useCallback, useEffect, useMemo, useState } from 'react'
import { declarationService } from '@/services/supabase/declarations'
import { propertyService } from '@/services/supabase/properties'
import { revenueService } from '@/services/supabase/revenues'
import { expenseService } from '@/services/supabase/expenses'
import { amortizationService } from '@/services/supabase/amortizations'
import type { Declaration, DeclarationDetails, Property, Revenue, Expense, Amortization } from '@/services/supabase/types'
import { buildDeclarationContext, type DeclarationContext } from '@/domain/declarations/context'
import { calculateDeclarationTotals } from '@/domain/declarations/calculations'
import logger from '@/utils/logger'

interface UseDeclarationsResult {
  declarations: Declaration[]
  properties: Property[]
  revenues: Revenue[]
  expenses: Expense[]
  amortizations: Amortization[]
  loading: boolean
  error: string | null
  currentDeclaration: Declaration | null
  setError: (message: string | null) => void
  refresh: () => Promise<void>
  selectDeclaration: (declaration: Declaration | null) => void
  createDeclaration: (year: number) => Promise<Declaration | null>
  updateDeclarationStatus: (id: string, status: Declaration['status']) => Promise<void>
  updateDeclarationDetails: (
    id: string,
    updates: Partial<Pick<Declaration, 'properties' | 'documents'>> & { details?: DeclarationDetails }
  ) => Promise<Declaration | null>
  deleteDeclaration: (id: string) => Promise<void>
  getDeclarationContext: (declaration: Declaration) => DeclarationContext
}

export const useDeclarations = (userId?: string | null): UseDeclarationsResult => {
  const [declarations, setDeclarations] = useState<Declaration[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [revenues, setRevenues] = useState<Revenue[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [amortizations, setAmortizations] = useState<Amortization[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentDeclaration, setCurrentDeclaration] = useState<Declaration | null>(null)

  const refresh = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)

      const [declarationsData, propertiesData, revenuesData, expensesData, amortizationsData] = await Promise.all([
        declarationService.getByUserId(userId),
        propertyService.getByUserId(userId),
        revenueService.getByUserId(userId),
        expenseService.getByUserId(userId),
        amortizationService.getByUserId(userId)
      ])

      setDeclarations(declarationsData)
      setProperties(propertiesData)
      setRevenues(revenuesData)
      setExpenses(expensesData)
      setAmortizations(amortizationsData)

      const inProgress = declarationsData.find((declaration) =>
        declaration.status === 'in_progress' || declaration.status === 'draft'
      )

      setCurrentDeclaration(inProgress || declarationsData[0] || null)

      logger.info('Declarations data refreshed', {
        declarations: declarationsData.length,
        properties: propertiesData.length,
        revenues: revenuesData.length,
        expenses: expensesData.length,
        amortizations: amortizationsData.length
      })
    } catch (refreshError) {
      logger.error('Error while refreshing declarations data', refreshError)
      setError('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const calculateTotals = useCallback(
    (year: number, propertyIds?: string[]) =>
      calculateDeclarationTotals(year, revenues, expenses, amortizations, propertyIds),
    [amortizations, expenses, revenues]
  )

  const selectDeclaration = useCallback((declaration: Declaration | null) => {
    setCurrentDeclaration(declaration)
  }, [])

  const createDeclaration = useCallback(
    async (year: number): Promise<Declaration | null> => {
      if (!userId) return null
      setError(null)

      const existingDeclaration = declarations.find((declaration) => declaration.year === year)
      if (existingDeclaration) {
        setError(`Une déclaration existe déjà pour l'année ${year}`)
        return null
      }

      const propertyIds = properties.map((property) => property.id)
      const { totalRevenue, totalExpenses, netResult } = calculateTotals(year, propertyIds)

      const newDeclaration = await declarationService.create({
        user_id: userId,
        year,
        status: 'draft',
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_result: netResult,
        properties: propertyIds,
        documents: [],
        details: {
          created_automatically: true,
          description: `Déclaration ${year + 1} des revenus ${year}`,
          regime: 'real',
          first_declaration: declarations.length === 0
        }
      })

      await refresh()
      logger.info('Declaration created', { id: newDeclaration.id, year })
      return newDeclaration
    },
    [calculateTotals, declarations, properties, refresh, userId]
  )

  const updateDeclarationStatus = useCallback(
    async (id: string, status: Declaration['status']) => {
      const declaration = declarations.find((item) => item.id === id)
      if (!declaration) return

      const { totalRevenue, totalExpenses, netResult } = calculateTotals(
        declaration.year,
        declaration.properties
      )

      await declarationService.update(id, {
        status,
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_result: netResult
      })

      await refresh()
      logger.info('Declaration status updated', { id, status })
    },
    [calculateTotals, declarations, refresh]
  )

  const updateDeclarationDetails = useCallback(
    async (
      id: string,
      updates: Partial<Pick<Declaration, 'properties' | 'documents'>> & { details?: DeclarationDetails }
    ): Promise<Declaration | null> => {
      const declaration = declarations.find((item) => item.id === id)
      if (!declaration) return null

      const mergedDetails: DeclarationDetails = {
        ...declaration.details,
        ...updates.details
      }

      await declarationService.update(id, {
        ...updates,
        details: mergedDetails
      })

      await refresh()
      logger.info('Declaration details updated', { id })

      return declarations.find((item) => item.id === id) || null
    },
    [declarations, refresh]
  )

  const deleteDeclaration = useCallback(
    async (id: string) => {
      await declarationService.delete(id)
      await refresh()
      logger.info('Declaration deleted', { id })
    },
    [refresh]
  )

  const getDeclarationContext = useCallback(
    (declaration: Declaration): DeclarationContext =>
      buildDeclarationContext(declaration, revenues, expenses, properties, amortizations),
    [amortizations, expenses, properties, revenues]
  )

  const memoizedResult = useMemo(
    () => ({
      declarations,
      properties,
      revenues,
      expenses,
      amortizations,
      loading,
      error,
      currentDeclaration,
      setError,
      refresh,
      selectDeclaration,
      createDeclaration,
      updateDeclarationStatus,
      updateDeclarationDetails,
      deleteDeclaration,
      getDeclarationContext
    }),
    [
      declarations,
      properties,
      revenues,
      expenses,
      amortizations,
      loading,
      error,
      currentDeclaration,
      refresh,
      selectDeclaration,
      createDeclaration,
      updateDeclarationStatus,
      updateDeclarationDetails,
      deleteDeclaration,
      getDeclarationContext
    ]
  )

  return memoizedResult
}
