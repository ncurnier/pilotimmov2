import { useEffect, useMemo, useState } from 'react'
import { Download, RefreshCcw, Save, X } from 'lucide-react'
import type { Declaration, DeclarationDetails } from '@/services/supabase/types'
import type { DeclarationContext } from '@/domain/declarations/context'
import { formatCurrency, formatDate } from '@/services/supabase/utils'

interface DeclarationDetailsModalProps {
  declaration: Declaration
  context: DeclarationContext
  onClose: () => void
  onDownload: (context: DeclarationContext) => void
  onSaveDetails: (details: DeclarationDetails) => Promise<void>
  onRefreshTotals: () => Promise<void>
}

export const DeclarationDetailsModal: React.FC<DeclarationDetailsModalProps> = ({
  declaration,
  context,
  onClose,
  onDownload,
  onSaveDetails,
  onRefreshTotals
}) => {
  const [details, setDetails] = useState<DeclarationDetails>(() => ({
    description: declaration.details?.description ?? '',
    regime: declaration.details?.regime ?? 'real',
    notes: declaration.details?.notes ?? ''
  }))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDetails({
      description: declaration.details?.description ?? '',
      regime: declaration.details?.regime ?? 'real',
      notes: declaration.details?.notes ?? ''
    })
  }, [declaration.details?.description, declaration.details?.notes, declaration.details?.regime])

  const totals = useMemo(() => context.totals, [context.totals])

  const handleSubmit = async () => {
    setSaving(true)
    await onSaveDetails(details)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Déclaration {declaration.year + 1} des revenus {declaration.year}
            </h3>
            <p className="text-sm text-gray-600">Créée le {formatDate(declaration.created_at)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="text-sm text-gray-600">Revenus totaux</p>
              <p className="text-xl font-semibold text-green-600">{formatCurrency(totals.totalRevenue)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="text-sm text-gray-600">Dépenses totales</p>
              <p className="text-xl font-semibold text-red-600">{formatCurrency(totals.totalExpenses)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="text-sm text-gray-600">Amortissements (LMNP)</p>
              <p className="text-xl font-semibold text-purple-700">
                {formatCurrency(totals.totalAmortizations)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="text-sm text-gray-600">Résultat fiscal</p>
              <p className={`text-xl font-semibold ${totals.netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totals.netResult)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">Revenus ({context.revenues.length})</h4>
                <button
                  onClick={onRefreshTotals}
                  className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <RefreshCcw className="h-4 w-4" />
                  <span>Recalculer</span>
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {context.revenues.map((revenue) => (
                  <div key={revenue.id} className="flex justify-between text-sm text-gray-700">
                    <span className="text-gray-600">{formatDate(revenue.date)}</span>
                    <span className="font-medium text-green-600">{formatCurrency(revenue.amount)}</span>
                  </div>
                ))}
                {context.revenues.length === 0 && (
                  <p className="text-sm text-gray-500">Aucun revenu enregistré pour cette année.</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">Dépenses ({context.expenses.length})</h4>
                <button
                  onClick={onRefreshTotals}
                  className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <RefreshCcw className="h-4 w-4" />
                  <span>Recalculer</span>
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {context.expenses.map((expense) => (
                  <div key={expense.id} className="flex justify-between text-sm text-gray-700">
                    <span className="text-gray-600">{formatDate(expense.date)}</span>
                    <span className="font-medium text-red-600">{formatCurrency(expense.amount)}</span>
                  </div>
                ))}
                {context.expenses.length === 0 && (
                  <p className="text-sm text-gray-500">Aucune dépense enregistrée pour cette année.</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">Amortissements ({context.amortizations.length})</h4>
                <span className="text-xs text-gray-500">Régime LMNP BIC</span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {context.amortizations.map((amortization) => (
                  <div key={amortization.id} className="text-sm text-gray-700 space-y-1 border-b border-gray-100 pb-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{formatDate(amortization.purchase_date)}</span>
                      <span className="font-medium text-purple-700">
                        {formatCurrency(amortization.annual_amortization)} / an
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>{amortization.item_name}</span>
                      <span>{amortization.useful_life_years} ans</span>
                    </div>
                  </div>
                ))}
                {context.amortizations.length === 0 && (
                  <p className="text-sm text-gray-500">Aucun amortissement actif pour cette année fiscale.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Détails de la déclaration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Régime</label>
                <select
                  value={details.regime}
                  onChange={(event) => setDetails((prev) => ({ ...prev, regime: event.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="real">Régime réel</option>
                  <option value="micro">Micro-BIC</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={details.description}
                  onChange={(event) => setDetails((prev) => ({ ...prev, description: event.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="Description de la déclaration"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes internes</label>
                <textarea
                  value={details.notes}
                  onChange={(event) => setDetails((prev) => ({ ...prev, notes: event.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Ajoutez des précisions sur les calculs ou les ajustements"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {context.properties.length} bien(s) associé(s) • {context.revenues.length} revenu(s) • {context.expenses.length} dépense(s) • {context.amortizations.length} amortissement(s)
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => onDownload(context)}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Télécharger</span>
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Enregistrement...' : 'Enregistrer'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
