import { supabase } from '../../config/supabase';
import logger from '../../utils/logger';
import type { Amortization } from './types';
import {
  convertArrayNumericFields,
  convertNullableNumericFields,
  convertNumericFields,
} from './numeric';

export type AmortizationCategory =
  | 'mobilier'
  | 'electromenager'
  | 'informatique'
  | 'travaux'
  | 'amenagement'
  | 'autre';

export type AmortizationStatus = 'active' | 'completed' | 'disposed';

const AMORTIZATION_NUMERIC_FIELDS: (keyof Amortization)[] = [
  'purchase_amount',
  'useful_life_years',
  'annual_amortization',
  'accumulated_amortization',
  'remaining_value',
];

const USEFUL_LIFE_BY_CATEGORY: Record<AmortizationCategory, number> = {
  mobilier: 10,
  electromenager: 5,
  informatique: 3,
  travaux: 20,
  amenagement: 15,
  autre: 5,
};

type AmortizationInsert = {
  property_id: string;
  item_name: string;
  category: AmortizationCategory;
  purchase_date: string | Date;
  purchase_amount: number;
  useful_life_years: number;
  notes?: string | null;
  status?: AmortizationStatus;
  accumulated_amortization?: number;
  annual_amortization?: number;
  remaining_value?: number;
  user_id?: string;
  land_value?: number;
  salvage_value?: number;
};

type AmortizationUpdate = Partial<AmortizationInsert> & {
  property_id?: string;
};

const toDateYYYYMMDD = (date: string | Date): string => {
  if (typeof date === 'string') {
    return date;
  }
  return date.toISOString().slice(0, 10);
};

const buildInsertPayload = (input: AmortizationInsert): Record<string, unknown> => {
  const {
    property_id,
    item_name,
    category,
    purchase_date,
    purchase_amount,
    useful_life_years,
    notes = null,
    status = 'active',
    accumulated_amortization,
    annual_amortization,
    remaining_value,
    user_id,
    land_value,
    salvage_value,
  } = input;

  if (useful_life_years < 1) {
    throw new Error('useful_life_years doit être ≥ 1.');
  }

  if (purchase_amount < 0) {
    throw new Error('purchase_amount doit être ≥ 0.');
  }

  const payload: Record<string, unknown> = {
    property_id,
    item_name,
    category,
    purchase_date: toDateYYYYMMDD(purchase_date),
    purchase_amount,
    useful_life_years,
    notes,
    status,
  };

  if (typeof accumulated_amortization === 'number') {
    payload.accumulated_amortization = accumulated_amortization;
  }
  if (typeof annual_amortization === 'number') {
    payload.annual_amortization = annual_amortization;
  }
  if (typeof remaining_value === 'number') {
    payload.remaining_value = remaining_value;
  }
  if (typeof land_value === 'number') {
    payload.land_value = land_value;
  }
  if (typeof salvage_value === 'number') {
    payload.salvage_value = salvage_value;
  }
  if (typeof user_id === 'string' && user_id.trim().length > 0) {
    payload.user_id = user_id;
  }

  return payload;
};

const buildUpdatePayload = (patch: AmortizationUpdate): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};

  if (patch.item_name !== undefined) {
    payload.item_name = patch.item_name;
  }
  if (patch.category !== undefined) {
    payload.category = patch.category;
  }
  if (patch.purchase_date !== undefined) {
    payload.purchase_date = toDateYYYYMMDD(patch.purchase_date);
  }
  if (patch.purchase_amount !== undefined) {
    if (patch.purchase_amount < 0) {
      throw new Error('purchase_amount doit être ≥ 0.');
    }
    payload.purchase_amount = patch.purchase_amount;
  }
  if (patch.useful_life_years !== undefined) {
    if (patch.useful_life_years < 1) {
      throw new Error('useful_life_years doit être ≥ 1.');
    }
    payload.useful_life_years = patch.useful_life_years;
  }
  if (patch.notes !== undefined) {
    payload.notes = patch.notes ?? null;
  }
  if (patch.status !== undefined) {
    payload.status = patch.status;
  }
  if (patch.accumulated_amortization !== undefined) {
    payload.accumulated_amortization = patch.accumulated_amortization;
  }
  if (patch.annual_amortization !== undefined) {
    payload.annual_amortization = patch.annual_amortization;
  }
  if (patch.remaining_value !== undefined) {
    payload.remaining_value = patch.remaining_value;
  }
  if (patch.land_value !== undefined) {
    payload.land_value = patch.land_value;
  }
  if (patch.salvage_value !== undefined) {
    payload.salvage_value = patch.salvage_value;
  }
  if (patch.property_id !== undefined) {
    payload.property_id = patch.property_id;
  }

  return payload;
};

const validateAmortizationData = (data: {
  purchase_amount?: number;
  useful_life_years?: number;
}): string[] => {
  const errors: string[] = [];

  if (data.purchase_amount !== undefined && data.purchase_amount <= 0) {
    errors.push("Le montant d'achat doit être supérieur à 0");
  }

  if (data.useful_life_years !== undefined && data.useful_life_years <= 0) {
    errors.push("La durée d'amortissement doit être supérieure à 0");
  }

  return errors;
};

export const amortizationService = {
  getUsefulLifeByCategory(category: AmortizationCategory): number {
    return USEFUL_LIFE_BY_CATEGORY[category] ?? USEFUL_LIFE_BY_CATEGORY.mobilier;
  },

  validateAmortizationData,

  async create(data: AmortizationInsert): Promise<Amortization> {
    try {
      const payload = buildInsertPayload(data);
      const { data: created, error } = await supabase
        .from('amortizations')
        .insert([payload])
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      const amortization = convertNumericFields(created, AMORTIZATION_NUMERIC_FIELDS);
      logger.info('Amortization created successfully', { id: amortization.id });
      return amortization;
    } catch (error) {
      logger.error('Failed to create amortization', error);
      throw error;
    }
  },

  async getById(id: string): Promise<Amortization | null> {
    try {
      const { data, error } = await supabase
        .from('amortizations')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return convertNullableNumericFields(data, AMORTIZATION_NUMERIC_FIELDS);
    } catch (error) {
      logger.error('Failed to fetch amortization by id', error);
      throw error;
    }
  },

  async getByPropertyId(propertyId: string): Promise<Amortization[]> {
    try {
      const { data, error } = await supabase
        .from('amortizations')
        .select('*')
        .eq('property_id', propertyId)
        .order('purchase_date', { ascending: false });

      if (error) {
        throw error;
      }

      return convertArrayNumericFields(data, AMORTIZATION_NUMERIC_FIELDS);
    } catch (error) {
      logger.error('Failed to fetch amortizations by property id', error);
      throw error;
    }
  },

  async update(id: string, patch: AmortizationUpdate): Promise<Amortization> {
    try {
      const payload = buildUpdatePayload(patch);

      if (Object.keys(payload).length === 0) {
        throw new Error('Aucune mise à jour fournie');
      }

      const { data, error } = await supabase
        .from('amortizations')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      const amortization = convertNumericFields(data, AMORTIZATION_NUMERIC_FIELDS);
      logger.info('Amortization updated successfully', { id: amortization.id });
      return amortization;
    } catch (error) {
      logger.error('Failed to update amortization', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('amortizations')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      logger.info('Amortization deleted successfully', { id });
    } catch (error) {
      logger.error('Failed to delete amortization', error);
      throw error;
    }
  },
};

export type { AmortizationInsert, AmortizationUpdate };
