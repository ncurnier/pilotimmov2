import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type PropertyState = {
  currentPropertyId: string | null;
  setCurrentProperty: (id: string) => void;
  clearCurrentProperty: () => void;
};

export const useCurrentProperty = create<PropertyState>()(
  persist(
    (set) => ({
      currentPropertyId: null,
      setCurrentProperty: (id) => set({ currentPropertyId: id }),
      clearCurrentProperty: () => set({ currentPropertyId: null }),
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
