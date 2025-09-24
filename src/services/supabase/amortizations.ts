import { supabase } from "../../lib/supabaseClient";

export type AmortizationCategory =
  | "mobilier" | "electromenager" | "informatique" | "travaux" | "amenagement" | "autre";

export type Amortization = {
  id: string;
  user_id: string;
  property_id: string;
  item_name: string;
  category: AmortizationCategory;
  purchase_date: string;
  purchase_amount: number;
  useful_life_years: number;
  annual_amortization: number;
  accumulated_amortization: number;
  remaining_value: number;
  status: 'active' | 'completed' | 'disposed';
  notes?: string;
  created_at: string;
  updated_at: string;
};

const toDateYYYYMMDD = (d?: string | Date): string =>
  typeof d === "string" ? d : (d ?? new Date()).toISOString().slice(0, 10);

/**
 * Crée un nouvel amortissement
 * user_id est rempli automatiquement via DEFAULT auth.uid()
 */
export async function createAmortization(params: {
  propertyId: string;
  itemName: string;
  purchaseAmount: number;
  category?: AmortizationCategory;
  purchaseDate?: string | Date;
  usefulLifeYears?: number;
  notes?: string | null;
}): Promise<Amortization> {
  const { 
    propertyId, 
    itemName, 
    purchaseAmount,
    category = "mobilier", 
    purchaseDate, 
    usefulLifeYears = 10, 
    notes = null 
  } = params;

  // Validations côté client
  if (!propertyId) {
    throw new Error("Sélectionnez un bien (propertyId manquant).");
  }
  if (usefulLifeYears < 1) {
    throw new Error("La durée d'amortissement doit être >= 1 année.");
  }
  if (purchaseAmount < 0) {
    throw new Error("Le montant d'achat doit être >= 0.");
  }

  const { data, error } = await supabase
    .from("amortizations")
    .insert({
      // ⚠️ PAS de user_id (DEFAULT auth.uid() côté DB)
      property_id: propertyId,
      item_name: itemName,
      category,
      purchase_date: toDateYYYYMMDD(purchaseDate),
      purchase_amount: purchaseAmount,
      useful_life_years: usefulLifeYears,
      notes,
      status: 'active'
    })
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

/**
 * Liste les amortissements d'une propriété
 */
export async function listAmortizationsByProperty(propertyId: string): Promise<Amortization[]> {
  const { data, error } = await supabase
    .from("amortizations")
    .select("*")
    .eq("property_id", propertyId)
    .order("purchase_date", { ascending: false });
    
  if (error) throw error;
  return data ?? [];
}

/**
 * Supprime un amortissement
 */
export async function deleteAmortization(id: string): Promise<void> {
  const { error } = await supabase
    .from("amortizations")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
}

/**
 * Validation des données d'amortissement
 */
export function validateAmortizationData(data: {
  purchase_amount?: number;
  useful_life_years?: number;
}): string[] {
  const errors: string[] = [];

  if (data.purchase_amount !== undefined && data.purchase_amount < 0) {
    errors.push("Le montant d'achat doit être >= 0");
  }

  if (data.useful_life_years !== undefined && data.useful_life_years < 1) {
    errors.push("La durée d'amortissement doit être >= 1 année");
  }

  return errors;
}