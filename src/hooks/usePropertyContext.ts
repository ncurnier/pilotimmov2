import { useCurrentProperty } from '../store/useCurrentProperty';
import { useCallback } from 'react';
import logger from '../utils/logger';

/**
 * Hook pour gérer le contexte de propriété dans les opérations CRUD
 * Injecte automatiquement property_id dans les créations
 * Filtre automatiquement les listes par property_id
 */
export function usePropertyContext() {
  const { currentPropertyId, isPropertySelected, currentProperty } = useCurrentProperty();

  // Injecter property_id dans les données de création
  const injectPropertyId = useCallback(<T extends Record<string, any>>(data: T): T & { property_id: string } => {
    if (!currentPropertyId) {
      throw new Error('Aucun bien sélectionné. Impossible de créer l\'élément.');
    }

    const result = {
      ...data,
      property_id: currentPropertyId
    };

    logger.info('Property ID injected into data:', { 
      property_id: currentPropertyId, 
      dataType: typeof data 
    });

    return result;
  }, [currentPropertyId]);

  // Vérifier qu'un bien est sélectionné avant une opération
  const requireProperty = useCallback((operation: string = 'cette opération') => {
    if (!isPropertySelected || !currentPropertyId) {
      throw new Error(`Un bien doit être sélectionné pour ${operation}`);
    }
    return currentPropertyId;
  }, [isPropertySelected, currentPropertyId]);

  // Créer un filtre pour les requêtes
  const createPropertyFilter = useCallback(() => {
    if (!currentPropertyId) {
      logger.warn('No property selected for filtering');
      return null;
    }
    
    return { property_id: currentPropertyId };
  }, [currentPropertyId]);

  // Valider qu'un élément appartient au bien sélectionné
  const validatePropertyOwnership = useCallback((item: { property_id?: string }, itemType: string = 'élément') => {
    if (!currentPropertyId) {
      throw new Error('Aucun bien sélectionné');
    }

    if (!item.property_id) {
      throw new Error(`${itemType} sans property_id`);
    }

    if (item.property_id !== currentPropertyId) {
      throw new Error(`${itemType} n'appartient pas au bien sélectionné`);
    }

    return true;
  }, [currentPropertyId]);

  return {
    // État
    currentPropertyId,
    isPropertySelected,
    currentProperty,
    
    // Utilitaires
    injectPropertyId,
    requireProperty,
    createPropertyFilter,
    validatePropertyOwnership,
    
    // Helpers pour les conditions
    canCreate: isPropertySelected,
    canList: isPropertySelected,
    
    // Messages d'erreur standardisés
    errors: {
      noPropertySelected: 'Veuillez sélectionner un bien pour continuer',
      cannotCreate: 'Impossible de créer sans bien sélectionné',
      cannotList: 'Impossible d\'afficher les données sans bien sélectionné'
    }
  };
}

// Hook spécialisé pour les services CRUD
export function usePropertyCRUD() {
  const context = usePropertyContext();

  return {
    ...context,
    
    // Wrapper pour les créations avec injection automatique
    createWithProperty: async <T, R>(
      createFn: (data: T & { property_id: string }) => Promise<R>,
      data: T
    ): Promise<R> => {
      const dataWithProperty = context.injectPropertyId(data);
      return createFn(dataWithProperty);
    },

    // Wrapper pour les listes avec filtre automatique
    listForProperty: async <R>(
      listFn: (filter: { property_id: string }) => Promise<R>
    ): Promise<R> => {
      const propertyId = context.requireProperty('lister les éléments');
      return listFn({ property_id: propertyId });
    }
  };
}