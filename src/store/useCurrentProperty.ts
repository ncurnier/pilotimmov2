import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type Property = {
  id: string;
  address: string;
  monthly_rent: number;
  user_id: string;
  created_by?: string;
  status: string;
  start_date: string;
  created_at: string;
  updated_at: string;
};

type PropertyState = {
  currentPropertyId: string | null;
  currentProperty: Property | null;
  setCurrentProperty: (property: Property) => void;
  setCurrentPropertyId: (id: string) => void;
  clearCurrentProperty: () => void;
  isPropertySelected: boolean;
};

export const useCurrentProperty = create<PropertyState>()(
  persist(
    (set) => ({
      currentPropertyId: null,
      currentProperty: null,
      isPropertySelected: false,
      setCurrentProperty: (property) => set({
        currentPropertyId: property.id,
        currentProperty: property,
        isPropertySelected: true
      }),
      setCurrentPropertyId: (id) => set({ 
        currentPropertyId: id,
        isPropertySelected: !!id
      }),
      clearCurrentProperty: () => set({
        currentPropertyId: null,
        currentProperty: null,
        isPropertySelected: false
      }),
    }),
    {
      name: "property-context",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      ),
      version: 1,
    }
  )
);