// Services d'amortissements (Supabase)
// IMPORTANT : ne JAMAIS envoyer user_id : la DB le remplit via DEFAULT (auth.uid()).
// Toujours envoyer property_id (depuis ton Property Context côté UI).

import { supabase } from "../../lib/supabaseClient"; // ajuste si ton client est ailleurs

// --- Types ---

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
  landValue?: number;                // optionnel (défaut DB 0)
  salvageValue?: number;             // optionnel (défaut DB 0)
  accumulatedAmortization?: number;  // optionnel (défaut DB 0)
}

export interface UpdateAmortizationPatch {
  itemName?: string;
  category?: AmortizationCategory;
  purchaseDate?: string | Date;
  purchaseAmount?: number;
  usefulLifeYears?: number;
  notes?: string | null;
  status?: AmortizationStatus;
