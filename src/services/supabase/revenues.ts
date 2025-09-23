import { supabase } from '../../config/supabase'
import type { Revenue } from './types'
import logger from '../../utils/logger'
import { ensureNumber } from './numeric'

const normalizeRevenue = (revenue: Revenue): Revenue => ({
  ...revenue,
  amount: ensureNumber((revenue as unknown as { amount: unknown }).amount)
})

export const revenueService = {
  async create(revenueData: Omit<Revenue, 'id' | 'created_at' | 'updated_at'>): Promise<Revenue> {
    try {
      const { data, error } = await supabase
        .from('revenues')
        .insert([revenueData])
        .select()
        .single()

      if (error) throw error
      
      logger.info('Revenue created successfully', { id: data.id })
      return normalizeRevenue(data)
    } catch (error) {
      logger.error('Failed to create revenue', error)
      throw error
    }
  },

  async getById(id: string): Promise<Revenue | null> {
    try {
      const { data, error } = await supabase
        .from('revenues')
        .select('*')
        .eq('id', id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data ? normalizeRevenue(data) : null
    } catch (error) {
      logger.error('Failed to get revenue by ID', error)
      throw error
    }
  },

  async getByPropertyId(propertyId: string): Promise<Revenue[]> {
    try {
      const { data, error } = await supabase
        .from('revenues')
        .select('*')
        .eq('property_id', propertyId)
        .order('date', { ascending: false })

      if (error) throw error
      return (data || []).map(normalizeRevenue)
    } catch (error) {
      logger.error('Failed to get revenues by property ID', error)
      throw error
    }
  },

  async getByUserId(userId: string): Promise<Revenue[]> {
    try {
      const { data, error } = await supabase
        .from('revenues')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })

      if (error) throw error
      return (data || []).map(normalizeRevenue)
    } catch (error) {
      logger.error('Failed to get revenues by user ID', error)
      throw error
    }
  },

  async update(id: string, updates: Partial<Revenue>): Promise<void> {
    try {
      const { error } = await supabase
        .from('revenues')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      
      logger.info('Revenue updated successfully', { id })
    } catch (error) {
      logger.error('Failed to update revenue', error)
      throw error
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('revenues')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      logger.info('Revenue deleted successfully', { id })
    } catch (error) {
      logger.error('Failed to delete revenue', error)
      throw error
    }
  }
}