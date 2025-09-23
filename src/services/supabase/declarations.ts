import { supabase } from '../../config/supabase'
import type { Declaration } from './types'
import logger from '../../utils/logger'
import { ensureNumber } from './numeric'

const normalizeDeclaration = (declaration: Declaration): Declaration => ({
  ...declaration,
  total_revenue: ensureNumber((declaration as unknown as { total_revenue: unknown }).total_revenue),
  total_expenses: ensureNumber((declaration as unknown as { total_expenses: unknown }).total_expenses),
  net_result: ensureNumber((declaration as unknown as { net_result: unknown }).net_result)
})

export const declarationService = {
  async create(declarationData: Omit<Declaration, 'id' | 'created_at' | 'updated_at'>): Promise<Declaration> {
    try {
      const { data, error } = await supabase
        .from('declarations')
        .insert([declarationData])
        .select()
        .single()

      if (error) throw error
      
      logger.info('Declaration created successfully', { id: data.id })
      return normalizeDeclaration(data)
    } catch (error) {
      logger.error('Failed to create declaration', error)
      throw error
    }
  },

  async getById(id: string): Promise<Declaration | null> {
    try {
      const { data, error } = await supabase
        .from('declarations')
        .select('*')
        .eq('id', id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data ? normalizeDeclaration(data) : null
    } catch (error) {
      logger.error('Failed to get declaration by ID', error)
      throw error
    }
  },

  async getByUserId(userId: string): Promise<Declaration[]> {
    try {
      const { data, error } = await supabase
        .from('declarations')
        .select('*')
        .eq('user_id', userId)
        .order('year', { ascending: false })

      if (error) throw error
      return (data || []).map(normalizeDeclaration)
    } catch (error) {
      logger.error('Failed to get declarations by user ID', error)
      throw error
    }
  },

  async update(id: string, updates: Partial<Declaration>): Promise<void> {
    try {
      const { error } = await supabase
        .from('declarations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      
      logger.info('Declaration updated successfully', { id })
    } catch (error) {
      logger.error('Failed to update declaration', error)
      throw error
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('declarations')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      logger.info('Declaration deleted successfully', { id })
    } catch (error) {
      logger.error('Failed to delete declaration', error)
      throw error
    }
  }
}