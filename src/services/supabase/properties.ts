import { supabase } from "../../lib/supabaseClient";

export type Property = {
  id: string;
  user_id: string;
  created_by?: string;
  address: string;
  monthly_rent: number;
  status: 'active' | 'inactive';
  start_date: string;
  description?: string;
  type?: 'apartment' | 'house' | 'studio' | 'other';
  created_at: string;
  updated_at: string;
};

/**
 * Liste les propriétés de l'utilisateur connecté
 * Utilise auth.uid() côté RLS pour filtrer automatiquement
 */
export async function listMyProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });
    
  if (error) throw error;
  return data ?? [];
}

/**
 * Récupère une propriété par son ID
 */
export async function getPropertyById(id: string): Promise<Property | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();
    
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

/**
 * Crée une nouvelle propriété
 * user_id et created_by sont remplis automatiquement via DEFAULT auth.uid()
 */
export async function createProperty(params: {
  address: string;
  monthlyRent: number;
  startDate: string;
  description?: string;
  type?: Property['type'];
}): Promise<Property> {
  const { address, monthlyRent, startDate, description, type } = params;
  
  const { data, error } = await supabase
    .from("properties")
    .insert({
      // user_id et created_by remplis par DEFAULT auth.uid()
      address,
      monthly_rent: monthlyRent,
      start_date: startDate,
      description,
      type: type || 'apartment',
      status: 'active'
    })
    .select()
    .single();
    
  if (error) throw error;
  return data;
}