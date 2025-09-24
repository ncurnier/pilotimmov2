// Services d'amortissements (Supabase)
// IMPORTANT : ne JAMAIS envoyer user_id : la DB le remplit via DEFAULT (auth.uid()).
// Toujours envoyer property_id (depuis ton Property Context côté UI).

import { supabase } from "../../lib/supabaseClient"; // ajuste le chemin si besoin

// --- Types simples ---
export type AmortizationCategory =
  | "mobilier"
  | "electromenager"
  | "informatique"
  | "travaux"
  | "amenagement"
  | "autre";

export type AmortizationStatus = "active" | "completed" | "disposed";

export interface CreateAmortizationParams {
  propertyId: string;              // OBLIGATOIRE
  itemName: string;
  purchaseAmount: number;          // >= 0
  category?: AmortizationCategory; // défaut: "mobilier"
  purchaseDate?: string | Date;    // défaut: aujourd'hui (YYYY-MM-DD)
  usefulLifeYears?: number;        // défaut: 10, >= 1
  notes?: string | null;
  landValue?: number;              // optionnel
  salvageValue?: number;           // optionnel
  accumulatedAmortization?: number;// optionnel
}

export interface UpdateAmortizationPatch {
  itemName?: string;
  category?: AmortizationCategory;
  purchaseDate?: string | Date;
  purchaseAmount?: number;
  usefulLifeYears?: number;
  notes?: string | null;
  status?: AmortizationStatus;
  landValue?: number;
  salvageValue?: number;
  accumulatedAmortization?: number;
  propertyId?: string;
}

// --- Utils ---
const toDateYYYYMMDD = (d?: string | Date): string => {
  if (typeof d === "string") return d;
  return (d ?? new Date()).toISOString().slice(0, 10);
};

// --- API ---

/**
 * Crée un amortissement.
 * - Ne PAS envoyer user_id (DEFAULT (auth.uid()) côté DB).
 * - property_id OBLIGATOIRE (Property Context).
 * - useful_life_years doit être >= 1.
 */
export async function createAmortization(params: CreateAmortizationParams): Promise<void> {
  const {
    propertyId,
    itemName,
    purchaseAmount,
    category = "mobilier",
    purchaseDate,
    usefulLifeYears = 10,
    notes = null,
    landValue,
    salvageValue,
    accumulatedAmortization,
  } = params;

  if (!propertyId) throw new Error("Sélectionne un bien d’abord (propertyId manquant).");
  if (usefulLifeYears < 1) throw new Error("useful_life_years doit être ≥ 1.");
  if (purchaseAmount < 0) throw new Error("purchase_amount doit être ≥ 0.");

  const payload: Record<string, any> = {
    // ⚠️ PAS de user_id ici
    property_id: propertyId,
    item_name: itemName,
    category,
    purchase_date: toDateYYYYMMDD(purchaseDate),
    purchase_amount: purchaseAmount,
    useful_life_years: usefulLifeYears,
    notes,
  };
  if (typeof landValue === "number") payload.land_value = landValue;
  if (typeof salvageValue === "number") payload.salvage_value = salvageValue;
  if (typeof accumulatedAmortization === "number")
    payload.accumulated_amortization = accumulatedAmortization;

  const { error } = await supabase.from("amortizations").insert(payload);
  if (error) throw error;
}

/** Liste les amortissements d’un bien (triés par date d’achat décroissante). */
export async function listAmortizationsByProperty(propertyId: string) {
  if (!propertyId) throw new Error("propertyId requis.");
  const { data, error } = await supabase
    .from("amortizations")
    .select("*")
    .eq("property_id", propertyId)
    .order("purchase_date", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Récupère un amortissement par id. */
export async function getAmortization(id: string) {
  if (!id) throw new Error("id requis.");
  const { data, error } = await supabase
    .from("amortizations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

/** Met à jour un amortissement. */
export async function updateAmortization(id: string, patch: UpdateAmortizationPatch) {
  if (!id) throw new Error("id requis.");

  const updates: Record<string, any> = {};
  if (patch.itemName !== undefined) updates.item_name = patch.itemName;
  if (patch.category !== undefined) updates.category = patch.category;
  if (patch.purchaseDate !== undefined) updates.purchase_date = toDateYYYYMMDD(patch.purchaseDate);
  if (patch.purchaseAmount !== undefined) {
    if (patch.purchaseAmount < 0) throw new Error("purchase_amount doit être ≥ 0.");
    updates.purchase_amount = patch.purchaseAmount;
  }
  if (patch.usefulLifeYears !== undefined) {
    if (patch.usefulLifeYears < 1) throw new Error("useful_life_years doit être ≥ 1.");
    updates.useful_life_years = patch.usefulLifeYears;
  }
  if (patch.notes !== undefined) updates.notes = patch.notes;
  if (patch.status !== undefined) updates.status = patch.status;
  if (patch.landValue !== undefined) updates.land_value = patch.landValue;
  if (patch.salvageValue !== undefined) updates.salvage_value = patch.salvageValue;
  if (patch.accumulatedAmortization !== undefined)
    updates.accumulated_amortization = patch.accumulatedAmortization;
  if (patch.propertyId !== undefined) updates.property_id = patch.propertyId;

  // Sécurité : ne jamais laisser passer user_id
  delete (updates as any).user_id;

  const { error } = await supabase.from("amortizations").update(updates).eq("id", id);
  if (error) throw error;
}

/** Supprime un amortissement. */
export async function deleteAmortization(id: string) {
  if (!id) throw new Error("id requis.");
  const { error } = await supabase.from("amortizations").delete().eq("id", id);
  if (error) throw error;
}
