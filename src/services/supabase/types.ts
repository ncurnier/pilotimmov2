export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          user_id: string
          email: string
          display_name: string
          first_name?: string
          last_name?: string
          phone?: string
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
        Insert: {
          id?: string
          user_id: string
          email: string
          display_name: string
          first_name?: string
          last_name?: string
          phone?: string
          subscription?: 'free' | 'premium' | 'pro'
          preferences?: {
            notifications: boolean
            newsletter: boolean
            two_factor_auth: boolean
            theme: 'light' | 'dark'
          }
          stats?: {
            properties_count: number
            total_revenue: number
            total_expenses: number
            declarations_count: number
          }
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          email?: string
          display_name?: string
          first_name?: string
          last_name?: string
          phone?: string
          subscription?: 'free' | 'premium' | 'pro'
          preferences?: {
            notifications: boolean
            newsletter: boolean
            two_factor_auth: boolean
            theme: 'light' | 'dark'
          }
          stats?: {
            properties_count: number
            total_revenue: number
            total_expenses: number
            declarations_count: number
          }
          updated_at?: string
        }
      }
      properties: {
        Row: {
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
        Insert: {
          id?: string
          user_id: string
          created_by?: string
          address: string
          start_date: string
          monthly_rent: number
          status?: 'active' | 'inactive'
          description?: string
          type?: 'apartment' | 'house' | 'studio' | 'other'
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          created_by?: string
          address?: string
          start_date?: string
          monthly_rent?: number
          status?: 'active' | 'inactive'
          description?: string
          type?: 'apartment' | 'house' | 'studio' | 'other'
          updated_at?: string
        }
      }
      revenues: {
        Row: {
          id: string
          user_id: string
          property_id: string
          amount: number
          date: string
          description: string
          type: 'rent' | 'charges' | 'other'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          property_id?: string
          amount: number
          date: string
          description: string
          type: 'rent' | 'charges' | 'other'
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          property_id?: string | null
          amount?: number
          date?: string
          description?: string
          type?: 'rent' | 'charges' | 'other'
          updated_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          property_id: string
          amount: number
          date: string
          description: string
          category: 'maintenance' | 'insurance' | 'taxes' | 'management' | 'other'
          receipt_url?: string
          deductible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          property_id?: string
          amount: number
          date: string
          description: string
          category: 'maintenance' | 'insurance' | 'taxes' | 'management' | 'other'
          receipt_url?: string
          deductible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          property_id?: string | null
          amount?: number
          date?: string
          description?: string
          category?: 'maintenance' | 'insurance' | 'taxes' | 'management' | 'other'
          receipt_url?: string
          deductible?: boolean
          updated_at?: string
        }
      }
      declarations: {
        Row: {
          id: string
          user_id: string
          year: number
          status: 'draft' | 'in_progress' | 'completed' | 'submitted'
          total_revenue: number
          total_expenses: number
          net_result: number
          properties: string[]
          documents: string[]
          details: {
            created_automatically: boolean
            description: string
            regime: 'micro' | 'real'
            first_declaration: boolean
          }
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          year: number
          status?: 'draft' | 'in_progress' | 'completed' | 'submitted'
          total_revenue?: number
          total_expenses?: number
          net_result?: number
          properties?: string[]
          documents?: string[]
          details: {
            created_automatically: boolean
            description: string
            regime: 'micro' | 'real'
            first_declaration: boolean
          }
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          year?: number
          status?: 'draft' | 'in_progress' | 'completed' | 'submitted'
          total_revenue?: number
          total_expenses?: number
          net_result?: number
          properties?: string[]
          documents?: string[]
          details?: {
            created_automatically: boolean
            description: string
            regime: 'micro' | 'real'
            first_declaration: boolean
          }
          updated_at?: string
        }
      }
      notifications: {
        Row: {
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
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: 'info' | 'warning' | 'error' | 'success'
          read?: boolean
          read_at?: string
          action_url?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          title?: string
          message?: string
          type?: 'info' | 'warning' | 'error' | 'success'
          read?: boolean
          read_at?: string
          action_url?: string
          updated_at?: string
        }
      }
      tenants: {
        Row: {
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
        Insert: {
          id?: string
          user_id: string
          property_id: string
          first_name: string
          last_name: string
          email?: string
          phone?: string
          start_date: string
          end_date?: string
          monthly_rent: number
          deposit?: number
          status?: 'active' | 'inactive' | 'ended'
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          property_id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string
          start_date?: string
          end_date?: string
          monthly_rent?: number
          deposit?: number
          status?: 'active' | 'inactive' | 'ended'
          notes?: string
          updated_at?: string
        }
      }
      amortizations: {
        Row: {
          id: string
          user_id: string
          property_id: string
          item_name: string
          category: 'mobilier' | 'electromenager' | 'informatique' | 'travaux' | 'amenagement' | 'autre'
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
        Insert: {
          id?: string
          user_id: string
          property_id: string
          item_name: string
          category?: 'mobilier' | 'electromenager' | 'informatique' | 'travaux' | 'amenagement' | 'autre'
          purchase_date: string
          purchase_amount: number
          useful_life_years?: number
          annual_amortization?: number
          accumulated_amortization?: number
          remaining_value?: number
          status?: 'active' | 'completed' | 'disposed'
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          property_id?: string
          item_name?: string
          category?: 'mobilier' | 'electromenager' | 'informatique' | 'travaux' | 'amenagement' | 'autre'
          purchase_date?: string
          purchase_amount?: number
          useful_life_years?: number
          annual_amortization?: number
          accumulated_amortization?: number
          remaining_value?: number
          status?: 'active' | 'completed' | 'disposed'
          notes?: string
          updated_at?: string
        }
      }
    }
  }
}

export type UserProfile = Database['public']['Tables']['users']['Row']
export type Property = Database['public']['Tables']['properties']['Row']
export type Revenue = Database['public']['Tables']['revenues']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row']
export type Declaration = Database['public']['Tables']['declarations']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type Tenant = Database['public']['Tables']['tenants']['Row']
export type Amortization = Database['public']['Tables']['amortizations']['Row']

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