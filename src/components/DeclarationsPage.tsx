import React, { useMemo, useState } from 'react'
import { FileText, CheckCircle, Plus, Download, Eye, Trash2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatCurrency } from '@/services/supabase/utils'
import { useDeclarations } from '@/hooks/useDeclarations'
import { calculateDeclarationTotals } from '@/domain/declarations/calculations'
import { DeclarationDetailsModal } from './DeclarationDetailsModal'
import { DeclarantForm } from './DeclarantForm'
import type { Declaration, Declarant } from '@/services/supabase/types'
import { downloadDeclarationPdf } from '@/utils/declarationExport'

interface DeclarationsPageProps {
  onPageChange?: (page: string) => void
}

export function DeclarationsPage({ onPageChange }: DeclarationsPageProps) {
  const { user } = useAuth()
  const [showNewDeclarationForm, setShowNewDeclarationForm] = useState(false)
  const [newDeclarationYear, setNewDeclarationYear] = useState(new Date().getFullYear() - 1)
  const [selectedDeclarationId, setSelectedDeclarationId] = useState<string | null>(null)
  const [savingDeclarant, setSavingDeclarant] = useState(false)

  const {
    declarations,
    properties,
    revenues,
    expenses,
    amortizations,
    loading,
    error,
    setError,
    currentDeclaration,
    selectDeclaration,
    createDeclaration,
    updateDeclarationStatus,
    updateDeclarationDetails,
    deleteDeclaration,
    getDeclarationContext,
    refresh
  } = useDeclarations(user?.uid)

  const selectedDeclaration = useMemo(
    () => declarations.find((declaration) => declaration.id === selectedDeclarationId) || null,
    [declarations, selectedDeclarationId]
  )
  const currentContext = useMemo(
    () => (currentDeclaration ? getDeclarationContext(currentDeclaration) : null),
    [currentDeclaration, getDeclarationContext]
  )
  const selectedContext = useMemo(
    () => (selectedDeclaration ? getDeclarationContext(selectedDeclaration) : null),
    [getDeclarationContext, selectedDeclaration]
  )

  const previewTotals = useMemo(
    () => calculateDeclarationTotals(newDeclarationYear, revenues, expenses, amortizations, properties.map((p) => p.id)),
    [amortizations, expenses, newDeclarationYear, properties, revenues]
  )

  const handleCreateDeclaration = async () => {
    const created = await createDeclaration(newDeclarationYear)
    if (created) {
      setShowNewDeclarationForm(false)
      setNewDeclarationYear(new Date().getFullYear() - 1)
      selectDeclaration(created)
    }
  }

  const handleUpdateDeclarationStatus = async (declarationId: string, status: Declaration['status']) => {
    await updateDeclarationStatus(declarationId, status)
  }

  const handleDeleteDeclaration = async (declarationId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette déclaration ?')) return
    await deleteDeclaration(declarationId)
    if (selectedDeclarationId === declarationId) {
      setSelectedDeclarationId(null)
    }
  }

  const handleOpenDetails = (declaration: Declaration) => {
    setSelectedDeclarationId(declaration.id)
    selectDeclaration(declaration)
  }

  const handleSaveDetails = async (details: Declaration['details']) => {
    if (!selectedDeclaration) return
    await updateDeclarationDetails(selectedDeclaration.id, { details })
    await refresh()
  }

  const handleSaveDeclarant = async (declarant: Declarant) => {
    if (!currentDeclaration) return

    setSavingDeclarant(true)
    try {
      await updateDeclarationDetails(currentDeclaration.id, { details: { declarant } })
      await refresh()
    } finally {
      setSavingDeclarant(false)
    }
  }

  const handleRefreshTotals = async () => {
    if (!selectedDeclaration) return
    await updateDeclarationStatus(selectedDeclaration.id, selectedDeclaration.status)
  }

  const getDeclarationProgress = (declaration: Declaration) => {
    const hasProperties = properties.length > 0
    const hasRevenues = revenues.some((revenue) => new Date(revenue.date).getFullYear() === declaration.year)
    const hasExpenses = expenses.some((expense) => new Date(expense.date).getFullYear() === declaration.year)

    let progress = 0
    if (hasProperties) progress += 25
    if (hasRevenues) progress += 25
    if (hasExpenses) progress += 25
    if (declaration.status === 'completed') progress = 100
    else if (declaration.status === 'in_progress') progress += 25

    return Math.min(progress, 100)
  }

  const canCompleteDeclaration = (declaration: Declaration) => {
    const hasProperties = properties.length > 0
    const hasRevenues = revenues.some((revenue) => new Date(revenue.date).getFullYear() === declaration.year)
    return hasProperties && hasRevenues
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            ✕
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Mes déclarations</h1>
          <p className="text-gray-600">Historique et suivi de vos déclarations LMNP</p>
        </div>
        <button
          onClick={() => setShowNewDeclarationForm(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Nouvelle déclaration</span>
        </button>
      </div>

      {showNewDeclarationForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Créer une nouvelle déclaration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Année de déclaration</label>
              <select
                value={newDeclarationYear}
                onChange={(event) => setNewDeclarationYear(Number(event.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Array.from({ length: 5 }, (_, index) => {
                  const year = new Date().getFullYear() - index
                  return (
                    <option key={year} value={year}>
                      Déclaration {year + 1} des revenus {year}
                    </option>
                  )
                })}
              </select>
            </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Aperçu des données pour {newDeclarationYear}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Propriétés:</span>
                <span className="ml-2 font-medium">{properties.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Revenus:</span>
                <span className="ml-2 font-medium text-green-600">{formatCurrency(previewTotals.totalRevenue)}</span>
              </div>
              <div>
                <span className="text-gray-600">Dépenses:</span>
                <span className="ml-2 font-medium text-red-600">{formatCurrency(previewTotals.totalExpenses)}</span>
              </div>
              <div>
                <span className="text-gray-600">Amortissements:</span>
                <span className="ml-2 font-medium text-purple-600">
                  {formatCurrency(previewTotals.totalAmortizations)}
                </span>
              </div>
              <div className="md:col-span-2 lg:col-span-1">
                <span className="text-gray-600">Résultat fiscal (LMNP):</span>
                <span
                  className={`ml-2 font-medium ${previewTotals.netResult >= 0 ? 'text-green-700' : 'text-red-700'}`}
                >
                  {formatCurrency(previewTotals.netResult)}
                </span>
              </div>
            </div>
          </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowNewDeclarationForm(false)
                  setError(null)
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateDeclaration}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Créer la déclaration
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Déclaration en cours</h2>
          <p className="text-gray-600">Suivez l'avancement de votre déclaration actuelle</p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement...</p>
            </div>
          ) : currentDeclaration ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Déclaration {currentDeclaration.year + 1} des revenus {currentDeclaration.year}
                    </h3>
                    <span
                      className={`text-sm font-medium px-3 py-1 rounded-full ${
                        currentDeclaration.status === 'draft'
                          ? 'bg-gray-100 text-gray-800'
                          : currentDeclaration.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : currentDeclaration.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {currentDeclaration.status === 'draft'
                        ? 'Brouillon'
                        : currentDeclaration.status === 'in_progress'
                        ? 'En cours'
                        : currentDeclaration.status === 'completed'
                        ? 'Terminée'
                        : 'Soumise'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-600">Revenus totaux:</span>
                      <div className="font-medium text-green-600">
                        {formatCurrency(currentDeclaration.total_revenue)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Dépenses totales:</span>
                      <div className="font-medium text-red-600">
                        {formatCurrency(currentDeclaration.total_expenses)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Amortissements:</span>
                      <div className="font-medium text-purple-700">
                        {formatCurrency(currentContext?.totals.totalAmortizations ?? 0)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Résultat fiscal (LMNP):</span>
                      <div className={`font-medium ${currentDeclaration.net_result >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(currentDeclaration.net_result)}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Progression</span>
                      <span className="text-sm text-gray-600">{getDeclarationProgress(currentDeclaration)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getDeclarationProgress(currentDeclaration)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleDeleteDeclaration(currentDeclaration.id)}
                      className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                    >
                      Supprimer
                    </button>

                    {currentDeclaration.status === 'draft' && (
                      <button
                        onClick={() => handleUpdateDeclarationStatus(currentDeclaration.id, 'in_progress')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Commencer la déclaration
                      </button>
                    )}

                    {currentDeclaration.status === 'in_progress' && canCompleteDeclaration(currentDeclaration) && (
                      <button
                        onClick={() => handleUpdateDeclarationStatus(currentDeclaration.id, 'completed')}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Finaliser la déclaration
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenDetails(currentDeclaration)}
                      className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium flex items-center space-x-2"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Voir les détails</span>
                    </button>

                    {currentDeclaration.status === 'completed' && currentContext && (
                      <button
                        onClick={() => downloadDeclarationPdf(currentContext)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center space-x-2"
                      >
                        <Download className="h-4 w-4" />
                        <span>Télécharger PDF</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Aucune déclaration en cours</h3>
              <p className="text-gray-600 mb-4">Commencez votre première déclaration LMNP</p>
              <button
                onClick={() => setShowNewDeclarationForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Nouvelle déclaration
              </button>
            </div>
          )}
      </div>
    </div>

      {currentDeclaration && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Informations du déclarant</h2>
            <p className="text-gray-600">Saisissez et révisez les informations légales du déclarant.</p>
          </div>
          <div className="p-6">
            <DeclarantForm
              declarant={currentDeclaration.details.declarant}
              onSave={handleSaveDeclarant}
              saving={savingDeclarant}
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Historique des déclarations</h2>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement...</p>
            </div>
          ) : declarations.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune déclaration</h3>
              <p className="text-gray-500 mb-6">Vos déclarations apparaîtront ici une fois créées</p>
              <button
                onClick={() => setShowNewDeclarationForm(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Créer ma première déclaration
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {declarations.map((declaration) => (
                <div key={declaration.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          Déclaration {declaration.year + 1} des revenus {declaration.year}
                        </h4>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            declaration.status === 'draft'
                              ? 'bg-gray-100 text-gray-800'
                              : declaration.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : declaration.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {declaration.status === 'draft'
                            ? 'Brouillon'
                            : declaration.status === 'in_progress'
                            ? 'En cours'
                            : declaration.status === 'completed'
                            ? 'Terminée'
                            : 'Soumise'}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span>Créée le:</span>
                          <div className="font-medium text-gray-900">{formatDate(declaration.created_at)}</div>
                        </div>
                        <div>
                          <span>Revenus:</span>
                          <div className="font-medium text-green-600">{formatCurrency(declaration.total_revenue)}</div>
                        </div>
                        <div>
                          <span>Dépenses:</span>
                          <div className="font-medium text-red-600">{formatCurrency(declaration.total_expenses)}</div>
                        </div>
                        <div>
                          <span>Résultat:</span>
                          <div
                            className={`font-medium ${declaration.net_result >= 0 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {formatCurrency(declaration.net_result)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleOpenDetails(declaration)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Voir les détails"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {declaration.status === 'completed' && (
                        <button
                          onClick={() => downloadDeclarationPdf(getDeclarationContext(declaration))}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                          title="Télécharger PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteDeclaration(declaration.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Étapes de votre déclaration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className={`bg-white p-6 rounded-xl border-2 ${properties.length > 0 ? 'border-green-200' : 'border-orange-200'}`}>
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                properties.length > 0 ? 'bg-green-100' : 'bg-orange-100'
              }`}
            >
              {properties.length > 0 ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <span className="text-xl font-bold text-orange-600">1</span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">1. Biens</h3>
            <p className="text-sm text-gray-600 mb-3">{properties.length} propriété(s) enregistrée(s)</p>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                properties.length > 0 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
              }`}
            >
              {properties.length > 0 ? 'Complet' : 'À compléter'}
            </span>
            {properties.length === 0 && (
              <button
                onClick={() => onPageChange?.('properties')}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Ajouter des biens →
              </button>
            )}
          </div>

          <div className={`bg-white p-6 rounded-xl border-2 ${revenues.length > 0 ? 'border-green-200' : 'border-orange-200'}`}>
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                revenues.length > 0 ? 'bg-green-100' : 'bg-orange-100'
              }`}
            >
              {revenues.length > 0 ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <span className="text-xl font-bold text-orange-600">2</span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">2. Recettes</h3>
            <p className="text-sm text-gray-600 mb-3">{revenues.length} revenu(s) enregistré(s)</p>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                revenues.length > 0 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
              }`}
            >
              {revenues.length > 0 ? 'Complet' : 'À compléter'}
            </span>
            {revenues.length === 0 && (
              <button
                onClick={() => onPageChange?.('recettes')}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Ajouter des revenus →
              </button>
            )}
          </div>

          <div className={`bg-white p-6 rounded-xl border-2 ${expenses.length > 0 ? 'border-green-200' : 'border-orange-200'}`}>
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                expenses.length > 0 ? 'bg-green-100' : 'bg-orange-100'
              }`}
            >
              {expenses.length > 0 ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <span className="text-xl font-bold text-orange-600">3</span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">3. Dépenses</h3>
            <p className="text-sm text-gray-600 mb-3">{expenses.length} dépense(s) enregistrée(s)</p>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                expenses.length > 0 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
              }`}
            >
              {expenses.length > 0 ? 'Complet' : 'À compléter'}
            </span>
            {expenses.length === 0 && (
              <button
                onClick={() => onPageChange?.('depenses')}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Ajouter des dépenses →
              </button>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl border-2 border-gray-200">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-xl font-bold text-gray-600">4</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">4. Finalisation</h3>
            <p className="text-sm text-gray-600 mb-3">Vérification et validation</p>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              En attente
            </span>
          </div>
        </div>
      </div>

      {selectedDeclaration && selectedContext && (
        <DeclarationDetailsModal
          declaration={selectedDeclaration}
          context={selectedContext}
          onClose={() => setSelectedDeclarationId(null)}
          onDownload={downloadDeclarationPdf}
          onSaveDetails={handleSaveDetails}
          onRefreshTotals={handleRefreshTotals}
        />
      )}
    </div>
  )
}
