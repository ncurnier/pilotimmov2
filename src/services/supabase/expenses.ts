import { supabase } from '../../config/supabase'
import type { Expense } from './types'
import logger from '../../utils/logger'

export const expenseService = {
  async create(expenseData: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([expenseData])
        .select()
        .single()

      if (error) throw error
      
      logger.info('Expense created successfully', { id: data.id })
      return data
    } catch (error) {
      logger.error('Failed to create expense', error)
      throw error
    }
  },

  async getById(id: string): Promise<Expense | null> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data || null
    } catch (error) {
      logger.error('Failed to get expense by ID', error)
      throw error
    }
  },

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
  },

  async getByUserId(userId: string): Promise<Expense[]> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('Failed to get expenses by user ID', error)
      throw error
    }
  },

  async update(id: string, updates: Partial<Expense>): Promise<void> {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      
      logger.info('Expense updated successfully', { id })
    } catch (error) {
      logger.error('Failed to update expense', error)
      throw error
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      logger.info('Expense deleted successfully', { id })
    } catch (error) {
      logger.error('Failed to delete expense', error)
      throw error
    }
  }
}