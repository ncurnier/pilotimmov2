import { supabase } from '../../config/supabase'
import type { Amortization } from './types'
import logger from '../../utils/logger'
import {
  convertArrayNumericFields,
  convertNullableNumericFields,
  convertNumericFields
} from './numeric'

const AMORTIZATION_NUMERIC_FIELDS: (keyof Amortization)[] = [
  'purchase_amount',
  'annual_amortization',
  'accumulated_amortization',
  'remaining_value'
]

export const amortizationService = {
  async create(amortizationData: Omit<Amortization, 'id' | 'created_at' | 'updated_at'>): Promise<Amortization> {
    try {
      // Validation anti-placeholder (sécurité)
      if (amortizationData.user_id === 'test-user-id' || 
          amortizationData.property_id === 'test-property-id') {
        throw new Error('Placeholders string interdits - utilisez des UUIDs réels uniquement')
      }

      // Validation côté client
      if (amortizationData.useful_life_years <= 0) {
        throw new Error('La durée d\'amortissement doit être supérieure à 0 (minimum 1 an)')
      }

      if (amortizationData.purchase_amount < 0) {
        throw new Error('Le montant d\'achat ne peut pas être négatif')
      }

      // Validation que property_id est fourni
      if (!amortizationData.property_id) {
        throw new Error('property_id est requis pour créer un amortissement')
      }

      // Validation anti-placeholder (sécurité)
      if (amortizationData.user_id === 'test-user-id' || 
          amortizationData.property_id === 'test-property-id') {
        throw new Error('Placeholders string interdits - utilisez des UUIDs réels uniquement')
      }

      // Vérifier que l'utilisateur a accès à cette propriété
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('id, user_id')
        .eq('id', amortizationData.property_id)
        .single()

      if (propertyError || !property) {
        throw new Error('Propriété non trouvée ou accès refusé')
      }
      // Les calculs sont effectués automatiquement par le trigger
      const { data, error } = await supabase
        .from('amortizations')
        .insert([amortizationData])
        .select()
        .single()

      if (error) throw error
      
      logger.info('Amortization created successfully', { id: data.id })
      return convertNumericFields(data, AMORTIZATION_NUMERIC_FIELDS)
    } catch (error) {
      logger.error('Failed to create amortization', error)
      throw error
    }
  },

  async getById(id: string): Promise<Amortization | null> {
    try {
      const { data, error } = await supabase
        .from('amortizations')
        .select('*')
        .eq('id', id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return convertNullableNumericFields(data, AMORTIZATION_NUMERIC_FIELDS)
    } catch (error) {
      logger.error('Failed to get amortization by ID', error)
      throw error
    }
  },

  async getByUserId(userId: string): Promise<Amortization[]> {
    try {
      const { data, error } = await supabase
        .from('amortizations')
        .select('*')
        .eq('user_id', userId)
        .order('purchase_date', { ascending: false })

      if (error) throw error
      return convertArrayNumericFields(data, AMORTIZATION_NUMERIC_FIELDS)
    } catch (error) {
      logger.error('Failed to get amortizations by user ID', error)
      throw error
    }
  },

  async getByPropertyId(propertyId: string): Promise<Amortization[]> {
    try {
      const { data, error } = await supabase
        .from('amortizations')
        .select('*')
        .eq('property_id', propertyId)
        .order('purchase_date', { ascending: false })

      if (error) throw error
      return convertArrayNumericFields(data, AMORTIZATION_NUMERIC_FIELDS)
    } catch (error) {
      logger.error('Failed to get amortizations by property ID', error)
      throw error
    }
  },

  async update(id: string, updates: Partial<Amortization>): Promise<void> {
    try {
      // Validation côté client
      if (updates.useful_life_years !== undefined && updates.useful_life_years <= 0) {
        throw new Error('La durée d\'amortissement doit être supérieure à 0')
      }

      if (updates.purchase_amount !== undefined && updates.purchase_amount < 0) {
        throw new Error('Le montant d\'achat ne peut pas être négatif')
      }

      // Les calculs sont effectués automatiquement par le trigger
      const { error } = await supabase
        .from('amortizations')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      
      logger.info('Amortization updated successfully', { id })
    } catch (error) {
      logger.error('Failed to update amortization', error)
      throw error
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('amortizations')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      logger.info('Amortization deleted successfully', { id })
    } catch (error) {
      logger.error('Failed to delete amortization', error)
      throw error
    }
  },

  async calculateAnnualAmortization(propertyId: string, year: number): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('amortizations')
        .select('*')
        .eq('property_id', propertyId)
        .eq('status', 'active')

      if (error) throw error

      let totalAnnualAmortization = 0

      for (const amortization of convertArrayNumericFields(
        data,
        AMORTIZATION_NUMERIC_FIELDS
      )) {
        const purchaseYear = new Date(amortization.purchase_date).getFullYear()
        const yearsElapsed = year - purchaseYear + 1
        
        // Vérifier si l'amortissement est applicable pour cette année
        if (yearsElapsed > 0 && 
            yearsElapsed <= amortization.useful_life_years && 
            amortization.annual_amortization > 0) {
          totalAnnualAmortization += amortization.annual_amortization
        }
      }

      return totalAnnualAmortization
    } catch (error) {
      logger.error('Failed to calculate annual amortization', error)
      throw error
    }
  },

  // Durées d'amortissement selon les règles LMNP
  getUsefulLifeByCategory(category: string): number {
    const usefulLifeMap: Record<string, number> = {
      'mobilier': 10,        // Mobilier : 10 ans
      'electromenager': 5,   // Électroménager : 5 ans
      'informatique': 3,     // Matériel informatique : 3 ans
      'travaux': 20,         // Travaux d'aménagement : 20 ans
      'amenagement': 15,     // Aménagements : 15 ans
      'autre': 5             // Autre : 5 ans par défaut
    }
    
    return usefulLifeMap[category] || 5
  },

  // Validation des règles métier LMNP
  validateAmortizationData(data: Partial<Amortization>): string[] {
    const errors: string[] = []

    // Validation anti-placeholder
    if (data.user_id === 'test-user-id' || data.property_id === 'test-property-id') {
      errors.push('Placeholders string interdits - utilisez des UUIDs réels uniquement')
    }

    // Validation anti-placeholder
    if (data.user_id === 'test-user-id' || data.property_id === 'test-property-id') {
      errors.push('Placeholders string interdits - utilisez des UUIDs réels uniquement')
    }

    if (data.useful_life_years !== undefined) {
      if (data.useful_life_years <= 0) {
        errors.push('La durée d\'amortissement doit être supérieure à 0 (minimum 1 an)')
      }
      if (data.useful_life_years > 50) {
        errors.push('La durée d\'amortissement ne peut pas dépasser 50 ans')
      }
    }

    if (data.purchase_amount !== undefined && data.purchase_amount < 0) {
      errors.push('Le montant d\'achat ne peut pas être négatif')
    }

    if (data.accumulated_amortization !== undefined && data.accumulated_amortization < 0) {
      errors.push('L\'amortissement cumulé ne peut pas être négatif')
    }

    if (data.purchase_amount !== undefined && 
        data.accumulated_amortization !== undefined && 
        data.accumulated_amortization > data.purchase_amount) {
      errors.push('L\'amortissement cumulé ne peut pas dépasser le montant d\'achat')
    }

    return errors
  }
}