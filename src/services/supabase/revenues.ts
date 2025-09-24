import { supabase } from '@/config/supabase'
import { BaseService } from './base'
import type { Revenue } from './types'
import logger from '@/utils/logger'

class RevenueService extends BaseService<Revenue> {
  protected tableName = 'revenues'

  async create(revenueData: Omit<Revenue, 'id' | 'created_at' | 'updated_at'>): Promise<Revenue> {
    return super.create(revenueData)
  }

  async getById(id: string): Promise<Revenue | null> {
    return super.getById(id)
  }

  async getByUserId(userId: string): Promise<Revenue[]> {
    return super.getByUserId(userId)
  }

  async getByPropertyId(propertyId: string): Promise<Revenue[]> {
    try {
      const { data, error } = await supabase
        .from('revenues')
        .select('*')
        .eq('property_id', propertyId)
        .order('date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('Failed to get revenues by property ID', error)
      throw error
    }
  }

  async update(id: string, updates: Partial<Revenue>): Promise<void> {
    return super.update(id, updates)
  }

  async delete(id: string): Promise<void> {
    return super.delete(id)
  }
}

export const revenueService = new RevenueService()