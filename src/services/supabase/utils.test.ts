import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

import type { Amortization, Declaration, Expense, Revenue } from './types'

process.env.VITE_SUPABASE_URL ??= 'https://example.supabase.co'
process.env.VITE_SUPABASE_ANON_KEY ??= 'test-key'

const { getUserDashboardData } = await import('./utils.ts')
const { revenueService } = await import('./revenues.ts')
const { expenseService } = await import('./expenses.ts')
const { declarationService } = await import('./declarations.ts')
const { amortizationService } = await import('./amortizations.ts')
const { propertyService } = await import('./properties.ts')
const { notificationService } = await import('./notifications.ts')
const { userService } = await import('./users.ts')
const { supabase } = await import('../../config/supabase.ts')

interface SupabaseResponse<T> {
  data: T
  error: null
}

test('getUserDashboardData calcule les totaux avec des montants en chaînes', async () => {
  const properties = [
    { id: 'property-1' }
  ]

  const revenues: Revenue[] = [
    {
      id: 'rev-1',
      user_id: 'user-1',
      property_id: 'property-1',
      amount: '1000.50',
      date: '2023-01-15',
      description: 'Loyer',
      type: 'rent',
      created_at: '2023-01-15',
      updated_at: '2023-01-15'
    } as unknown as Revenue,
    {
      id: 'rev-2',
      user_id: 'user-1',
      property_id: 'property-1',
      amount: '500.25',
      date: '2023-02-15',
      description: 'Charges',
      type: 'charges',
      created_at: '2023-02-15',
      updated_at: '2023-02-15'
    } as unknown as Revenue
  ]

  const expenses: Expense[] = [
    {
      id: 'exp-1',
      user_id: 'user-1',
      property_id: 'property-1',
      amount: '200.25',
      date: '2023-01-20',
      description: 'Entretien',
      category: 'maintenance',
      deductible: true,
      created_at: '2023-01-20',
      updated_at: '2023-01-20'
    } as unknown as Expense,
    {
      id: 'exp-2',
      user_id: 'user-1',
      property_id: 'property-1',
      amount: '100',
      date: '2023-02-20',
      description: 'Assurance',
      category: 'insurance',
      deductible: true,
      created_at: '2023-02-20',
      updated_at: '2023-02-20'
    } as unknown as Expense
  ]

  const declarations: Declaration[] = []
  const notifications = []

  const propertyMock = mock.method(propertyService, 'getByUserId', async () => properties as any)
  const declarationMock = mock.method(declarationService, 'getByUserId', async () => declarations)
  const revenueMock = mock.method(revenueService, 'getByUserId', async () => revenues)
  const expenseMock = mock.method(expenseService, 'getByUserId', async () => expenses)
  const notificationMock = mock.method(notificationService, 'getByUserId', async () => notifications as any)
  const updateStatsMock = mock.method(userService, 'updateStats', async () => {})

  try {
    const dashboard = await getUserDashboardData('user-1')

    assert.equal(dashboard.stats.totalRevenue, 1500.75)
    assert.equal(dashboard.stats.totalExpenses, 300.25)
    assert.equal(dashboard.stats.netProfit, 1200.5)
  } finally {
    propertyMock.mock.restore()
    declarationMock.mock.restore()
    revenueMock.mock.restore()
    expenseMock.mock.restore()
    notificationMock.mock.restore()
    updateStatsMock.mock.restore()
  }
})

function createQuery<T>(response: SupabaseResponse<T>) {
  return {
    select() {
      return this
    },
    eq() {
      return this
    },
    order() {
      return Promise.resolve(response)
    },
    single() {
      return Promise.resolve(response)
    },
    then(onFulfilled: (value: SupabaseResponse<T>) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve(response).then(onFulfilled, onRejected)
    }
  }
}

test('revenueService.getByPropertyId convertit les montants en nombres', async () => {
  const queryResponse: SupabaseResponse<Revenue[]> = {
    data: [
      {
        id: 'rev-1',
        user_id: 'user-1',
        property_id: 'property-1',
        amount: '1200.40',
        date: '2023-03-01',
        description: 'Loyer',
        type: 'rent',
        created_at: '2023-03-01',
        updated_at: '2023-03-01'
      } as unknown as Revenue,
      {
        id: 'rev-2',
        user_id: 'user-1',
        property_id: 'property-1',
        amount: '99.6',
        date: '2023-04-01',
        description: 'Autre',
        type: 'other',
        created_at: '2023-04-01',
        updated_at: '2023-04-01'
      } as unknown as Revenue
    ],
    error: null
  }

  const fromMock = mock.method(supabase, 'from', (table: string) => {
    assert.equal(table, 'revenues')
    return createQuery(queryResponse)
  })

  try {
    const result = await revenueService.getByPropertyId('property-1')
    assert.deepEqual(result.map(revenue => revenue.amount), [1200.4, 99.6])
  } finally {
    fromMock.mock.restore()
  }
})

test('expenseService.getByPropertyId convertit les montants en nombres', async () => {
  const queryResponse: SupabaseResponse<Expense[]> = {
    data: [
      {
        id: 'exp-1',
        user_id: 'user-1',
        property_id: 'property-1',
        amount: '45.5',
        date: '2023-03-10',
        description: 'Entretien',
        category: 'maintenance',
        deductible: true,
        created_at: '2023-03-10',
        updated_at: '2023-03-10'
      } as unknown as Expense
    ],
    error: null
  }

  const fromMock = mock.method(supabase, 'from', (table: string) => {
    assert.equal(table, 'expenses')
    return createQuery(queryResponse)
  })

  try {
    const result = await expenseService.getByPropertyId('property-1')
    assert.deepEqual(result.map(expense => expense.amount), [45.5])
  } finally {
    fromMock.mock.restore()
  }
})

test('declarationService.getByUserId normalise les totaux numériques', async () => {
  const queryResponse: SupabaseResponse<Declaration[]> = {
    data: [
      {
        id: 'dec-1',
        user_id: 'user-1',
        year: 2023,
        status: 'draft',
        total_revenue: '2000.5',
        total_expenses: '800.25',
        net_result: '1200.25',
        properties: ['property-1'],
        documents: [],
        details: {
          created_automatically: true,
          description: 'Test',
          regime: 'real',
          first_declaration: false
        },
        created_at: '2023-05-01',
        updated_at: '2023-05-01'
      } as unknown as Declaration
    ],
    error: null
  }

  const fromMock = mock.method(supabase, 'from', (table: string) => {
    assert.equal(table, 'declarations')
    return createQuery(queryResponse)
  })

  try {
    const result = await declarationService.getByUserId('user-1')
    assert.deepEqual(
      result.map(declaration => ({
        total_revenue: declaration.total_revenue,
        total_expenses: declaration.total_expenses,
        net_result: declaration.net_result
      })),
      [
        {
          total_revenue: 2000.5,
          total_expenses: 800.25,
          net_result: 1200.25
        }
      ]
    )
  } finally {
    fromMock.mock.restore()
  }
})

test('amortizationService.calculateAnnualAmortization additionne les montants numériques', async () => {
  const queryResponse: SupabaseResponse<Amortization[]> = {
    data: [
      {
        id: 'amo-1',
        user_id: 'user-1',
        property_id: 'property-1',
        item_name: 'Équipement',
        category: 'mobilier',
        purchase_date: '2022-01-01',
        purchase_amount: '1000',
        useful_life_years: 5,
        annual_amortization: '200',
        accumulated_amortization: '200',
        remaining_value: '800',
        status: 'active',
        notes: '',
        created_at: '2022-01-01',
        updated_at: '2022-01-01'
      } as unknown as Amortization,
      {
        id: 'amo-2',
        user_id: 'user-1',
        property_id: 'property-1',
        item_name: 'Amélioration',
        category: 'travaux',
        purchase_date: '2021-01-01',
        purchase_amount: '2000',
        useful_life_years: 10,
        annual_amortization: '200.5',
        accumulated_amortization: '401',
        remaining_value: '1599',
        status: 'active',
        notes: '',
        created_at: '2021-01-01',
        updated_at: '2021-01-01'
      } as unknown as Amortization
    ],
    error: null
  }

  const fromMock = mock.method(supabase, 'from', (table: string) => {
    assert.equal(table, 'amortizations')
    return createQuery(queryResponse)
  })

  try {
    const result = await amortizationService.calculateAnnualAmortization('property-1', 2023)
    assert.equal(result, 400.5)
  } finally {
    fromMock.mock.restore()
  }
})
