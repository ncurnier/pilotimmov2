// Services d'amortissements (Supabase)
// IMPORTANT : ne JAMAIS envoyer user_id : la DB le remplit via DEFAULT (auth.uid())
// On envoie toujours property_id (depuis le Property Context côté UI).

import { supabase } from "../../lib/supabaseClient"; // ajuste si tu as un alias @/lib/...

export type AmortizationCategory =
  | "mobilier"
  | "electromenager"
  | "informatique"
  | "travaux"
  | "amenagement"
  | "autre";

export type AmortizationStatus = "active" | "completed" | "disposed";

export interface CreateAmortizationParams {
  propertyId: string;                // OBLIGATOIRE
  itemName: string;
  category?: AmortizationCategory;   // défaut: "mobilier"
  purchaseDate?: string | Date;      // défaut: aujourd'hui (YYYY-MM-DD)
  purchaseAmount: number;            // >= 0
  usefulLifeYears?: number;          // défaut: 10 / doit être >= 1
  notes?: string | null;
  // Facultatif selon ton schéma ; si non fourni, laisse Supabase/DB gérer
  landValue?: number;                // défaut DB 0
  salvageValue?: number;             // défaut DB 0
  accumulatedAmortization?: number;  // défaut DB 0
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
  propertyId?: string; // autorisé si tu veux “déplacer” l’élément vers un autre bien
}

const toDateYYYYMMDD = (d: string | Date | undefined): string | undefined => {
  if (!d) return undefined;
  if (typeof d === "string") return d; // suppose déjà "YYYY-MM-DD"
  return d.toISOString().slice(0, 10);
};

/**
 * Crée un amortissement.
 * - Ne PAS envoyer user_id (DEFAULT (auth.uid()) côté DB).
 * - property_id OBLIGATOIRE (Property Context).
 * - useful_life_years doit être >= 1 (validation front).
 */
export async function cr
