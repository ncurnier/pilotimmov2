import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import logger from "../utils/logger";
import type { Property } from "../services/supabase/types";

type PropertyState = {
  currentPropertyId: string | null;
  currentProperty: Property | null;
  isPropertySelected: boolean;
  setCurrentProperty: (property: Property) => void;
  setCurrentPropertyId: (id: string | null) => void;
  clearCurrentProperty: () => void;
  hasProperty: () => boolean;
  getCurrentProperty: () => Property | null;
  getCurrentPropertyId: () => string | null;
};

const initialState: Pick<
  PropertyState,
  "currentPropertyId" | "currentProperty" | "isPropertySelected"
> = {
  currentPropertyId: null,
  currentProperty: null,
  isPropertySelected: false,
};

export const useCurrentProperty = create<PropertyState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setCurrentProperty: (property) => {
        logger.info("[Property] set", { id: property.id, address: property.address });
        set({
          currentPropertyId: property.id,
          currentProperty: property,
          isPropertySelected: true,
        });
      },
      setCurrentPropertyId: (id) => {
        logger.info("[Property] set id", id);
        set({
          currentPropertyId: id,
          currentProperty: null,
          isPropertySelected: Boolean(id),
        });
      },
      clearCurrentProperty: () => {
        logger.info("[Property] clear");
        set({ ...initialState });
      },
      hasProperty: () => Boolean(get().currentPropertyId),
      getCurrentProperty: () => get().currentProperty,
      getCurrentPropertyId: () => get().currentPropertyId,
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
      partialize: (state) => ({
        currentPropertyId: state.currentPropertyId,
        currentProperty: state.currentProperty,
        isPropertySelected: state.isPropertySelected,
      }),
      version: 2,
      migrate: (persistedState, version) => {
        if (!persistedState) {
          return initialState;
        }

        const typedState = persistedState as Partial<PropertyState>;
        const currentProperty = typedState.currentProperty ?? null;
        const currentPropertyId =
          typedState.currentPropertyId ?? currentProperty?.id ?? null;

        if (version < 2) {
          return {
            ...initialState,
            ...typedState,
            currentProperty,
            currentPropertyId,
            isPropertySelected: Boolean(currentPropertyId),
          };
        }

        return {
          ...initialState,
          ...typedState,
          currentProperty,
          currentPropertyId,
          isPropertySelected: Boolean(currentPropertyId),
        };
      },
    }
  )
);
