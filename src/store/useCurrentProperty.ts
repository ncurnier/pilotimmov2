import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Property } from '../services/supabase/types';
import logger from '../utils/logger';

interface CurrentPropertyState {
  currentPropertyId: string | null;
  currentProperty: Property | null;
  setCurrentProperty: (property: Property) => void;
  setCurrentPropertyId: (id: string | null) => void;
  clearCurrentProperty: () => void;
  isPropertySelected: boolean;
}

export const useCurrentProperty = create<CurrentPropertyState>()(
  persist(
    (set, get) => ({
      currentPropertyId: null,
      currentProperty: null,
      isPropertySelected: false,

      setCurrentProperty: (property: Property) => {
        logger.info('Setting current property:', { id: property.id, address: property.address });
        set({
          currentPropertyId: property.id,
          currentProperty: property,
          isPropertySelected: true
        });
      },

      setCurrentPropertyId: (id: string | null) => {
        logger.info('Setting current property ID:', id);
        set({
          currentPropertyId: id,
          currentProperty: null, // Will be loaded by components
          isPropertySelected: !!id
        });
      },

      clearCurrentProperty: () => {
        logger.info('Clearing current property');
        set({
          currentPropertyId: null,
          currentProperty: null,
          isPropertySelected: false
        });
      }
    }),
    {
      name: 'current-property-storage',
      partialize: (state) => ({
        currentPropertyId: state.currentPropertyId,
        // Don't persist the full property object, just the ID
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.currentPropertyId) {
          logger.info('Rehydrated current property ID:', state.currentPropertyId);
          // Set isPropertySelected based on whether we have an ID
          state.isPropertySelected = true;
        }
      }
    }
  )
);

// Helper hooks for common use cases
export const useCurrentPropertyId = () => useCurrentProperty(state => state.currentPropertyId);
export const useIsPropertySelected = () => useCurrentProperty(state => state.isPropertySelected);
export const useCurrentPropertyActions = () => useCurrentProperty(state => ({
  setCurrentProperty: state.setCurrentProperty,
  setCurrentPropertyId: state.setCurrentPropertyId,
  clearCurrentProperty: state.clearCurrentProperty
}));