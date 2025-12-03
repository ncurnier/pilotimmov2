export type AmortizationCategory = 'mobilier' | 'electromenager' | 'informatique' | 'travaux' | 'amenagement' | 'autre'

// Core database types
export interface UserProfile {
  id: string
  user_id: string
  email: string
  display_name: string
  first_name?: string
  last_name?: string
  subscription: 'free' | 'premium' | 'pro'
  preferences: {
    notifications: boolean
    newsletter: boolean
    two_factor_auth: boolean
    theme: 'light' | 'dark'
  }
  stats: {
    properties_count: number
    total_revenue: number
    total_expenses: number
    declarations_count: number
  }
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  user_id: string
  created_by?: string
  address: string
  start_date: string
  monthly_rent: number
  status: 'active' | 'inactive'
  description?: string
  type?: 'apartment' | 'house' | 'studio' | 'other'
  created_at: string
  updated_at: string
}

export interface Revenue {
  id: string
  user_id: string
  property_id: string
  amount: number
  date: string
  description: string
  type: 'rent' | 'deposit' | 'charges' | 'other'
  created_at: string
  updated_at: string
}

export interface Expense {
  id: string
  user_id: string
  property_id: string
  amount: number
  date: string
  description: string
  category: 'maintenance' | 'insurance' | 'taxes' | 'management' | 'utilities' | 'repairs' | 'other'
  deductible: boolean
  created_at: string
  updated_at: string
}

export interface Tenant {
  id: string
  user_id: string
  property_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  start_date: string
  end_date?: string
  monthly_rent: number
  deposit: number
  status: 'active' | 'inactive' | 'ended'
  notes?: string
  created_at: string
  updated_at: string
}

export interface Amortization {
  id: string
  user_id: string
  property_id: string
  item_name: string
  category:
    | 'mobilier'
    | 'electromenager'
    | 'informatique'
    | 'travaux'
    | 'amenagement'
    | 'immeuble_hors_terrain'
    | 'autre'
  purchase_date: string
  purchase_amount: number
  useful_life_years: number
  annual_amortization: number
  accumulated_amortization: number
  remaining_value: number
  status: 'active' | 'completed' | 'disposed'
  notes?: string
  created_at: string
  updated_at: string
}

export interface Declaration {
  id: string
  user_id: string
  year: number
  status: 'draft' | 'in_progress' | 'completed' | 'submitted'
  total_revenue: number
  total_expenses: number
  net_result: number
  properties: string[]
  documents: string[]
  details: DeclarationDetails
  created_at: string
  updated_at: string
}

export interface Declarant {
  company_name: string
  siren: string
  vat_number?: string
  ape_code?: string
  address_line1: string
  address_line2?: string
  postal_code: string
  city: string
  country: string
  contact_email: string
  contact_phone?: string
}

export interface DeclarationDetails {
  created_automatically?: boolean
  description?: string
  regime?: string
  first_declaration?: boolean
  notes?: string
  declarant?: Declarant
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  read: boolean
  read_at?: string
  action_url?: string
  created_at: string
  updated_at: string
}

// Dashboard aggregated data
export interface DashboardStats {
  propertiesCount: number
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  unreadNotifications: number
}

export interface DashboardData {
  stats: DashboardStats
  declarations: Declaration[]
  notifications: Notification[]
  recentRevenues: Revenue[]
  recentExpenses: Expense[]
}