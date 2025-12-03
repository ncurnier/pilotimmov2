import { supabase } from '@/config/supabase'
import { BaseService } from './base'
import type { Amortization } from './types'
import logger from '@/utils/logger'

export type AmortizationCategory =
  | 'mobilier'
  | 'electromenager'
  | 'informatique'
  | 'travaux'
  | 'amenagement'
  | 'immeuble_hors_terrain'
  | 'autre'

class AmortizationService extends BaseService<Amortization> {
  protected tableName = 'amortizations'

  async create(amortizationData: Omit<Amortization, 'id' | 'created_at' | 'updated_at'>): Promise<Amortization> {
    return super.create(amortizationData)
  }

  async getById(id: string): Promise<Amortization | null> {
    return super.getById(id)
  }

  async getByUserId(userId: string): Promise<Amortization[]> {
    return super.getByUserId(userId)
  }

  async getByPropertyId(propertyId: string): Promise<Amortization[]> {
    try {
      const { data, error } = await supabase
        .from('amortizations')
        .select('*')
        .eq('property_id', propertyId)
        .order('purchase_date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      logger.error('Failed to get amortizations by property ID', error)
      throw error
    }
  }

  getUsefulLifeByCategory(category: AmortizationCategory): number {
    const categoryLifeMap: Record<AmortizationCategory, number> = {
      'mobilier': 10,
      'electromenager': 5,
      'informatique': 3,
      'travaux': 20,
      'amenagement': 15,
      'immeuble_hors_terrain': 30,
      'autre': 5
    }
    return categoryLifeMap[category] || 10
  }

  validateAmortizationData(data: {
    purchase_amount?: number
    useful_life_years?: number
  }): string[] {
    const errors: string[] = []

    if (data.purchase_amount !== undefined && data.purchase_amount < 0) {
      errors.push("Le montant d'achat doit être >= 0")
    }

    if (data.useful_life_years !== undefined && data.useful_life_years < 1) {
      errors.push("La durée d'amortissement doit être >= 1 année")
    }

    return errors
  }

  async update(id: string, updates: Partial<Amortization>): Promise<void> {
    return super.update(id, updates)
  }

  async delete(id: string): Promise<void> {
    return super.delete(id)
  }
}

export const amortizationService = new AmortizationService()