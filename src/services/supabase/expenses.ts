import { supabase } from '@/config/supabase'
import { BaseService } from './base'
import type { Expense } from './types'
import logger from '@/utils/logger'

class ExpenseService extends BaseService<Expense> {
  protected tableName = 'expenses'

  async create(expenseData: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> {
    return super.create(expenseData)
  }

  async getById(id: string): Promise<Expense | null> {
    return super.getById(id)
  }

  async getByUserId(userId: string): Promise<Expense[]> {
    return super.getByUserId(userId)
  }

  async getByPropertyId(propertyId: string): Promise<Expense[]> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('property_id', propertyId)
        .order('date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('Failed to get expenses by property ID', error)
      throw error
    }
  }

  async update(id: string, updates: Partial<Expense>): Promise<void> {
    return super.update(id, updates)
  }

  async delete(id: string): Promise<void> {
    return super.delete(id)
  }
}

export const expenseService = new ExpenseService()