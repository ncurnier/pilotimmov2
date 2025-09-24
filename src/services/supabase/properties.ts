import { supabase } from '../../config/supabase'
import type { Property } from './types'
import logger from '../../utils/logger'
import {
  convertArrayNumericFields,
  convertNullableNumericFields,
  convertNumericFields
} from './numeric'

const PROPERTY_NUMERIC_FIELDS: (keyof Property)[] = ['monthly_rent']

export const propertyService = {
  async create(propertyData: Omit<Property, 'id' | 'created_at' | 'updated_at'>): Promise<Property> {
    try {
      // S'assurer que created_by est défini
      const dataWithCreatedBy = {
        ...propertyData,
        created_by: propertyData.created_by || propertyData.user_id
      };

      const { data, error } = await supabase
        .from('properties')
        .insert([dataWithCreatedBy])
        .select()
        .single()

      if (error) throw error
      
      logger.info('Property created successfully', { id: data.id })
      return convertNumericFields(data, PROPERTY_NUMERIC_FIELDS)
    } catch (error) {
      logger.error('Failed to create property', error)
      throw error
    }
  },

  async getById(id: string): Promise<Property | null> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return convertNullableNumericFields(data, PROPERTY_NUMERIC_FIELDS)
    } catch (error) {
      logger.error('Failed to get property by ID', error)
      throw error
    }
  },

  async getByUserId(userId: string): Promise<Property[]> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return convertArrayNumericFields(data, PROPERTY_NUMERIC_FIELDS)
    } catch (error) {
      logger.error('Failed to get properties by user ID', error)
      throw error
    }
  },

  async update(id: string, updates: Partial<Property>): Promise<void> {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      
      logger.info('Property updated successfully', { id })
    } catch (error) {
      logger.error('Failed to update property', error)
      throw error
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      logger.info('Property deleted successfully', { id })
    } catch (error) {
      logger.error('Failed to delete property', error)
      throw error
    }
  }
}