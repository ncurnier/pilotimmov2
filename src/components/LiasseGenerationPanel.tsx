import React, { useMemo } from 'react'
import { AlertCircle, CheckCircle, Download, FileText } from 'lucide-react'
import type {
  FormOverrides,
  LiasseFormMapping,
  LiasseFormType,
  FormValidationIssue
} from '@/domain/declarations/formMapping'
import { formatCurrency } from '@/services/supabase/utils'

export interface GenerationLogEntry {
  id: string
  declarationId: string
  year: number
  format: 'pdf' | 'edi'
  generatedAt: string
  user: string
  status: 'success' | 'error'
  notes?: string
}

interface LiasseGenerationPanelProps {
  mappings: LiasseFormMapping[]
  validations: FormValidationIssue[]
  overrides: FormOverrides
  selectedForm: LiasseFormType
  onSelectForm: (form: LiasseFormType) => void
  onOverrideChange: (form: LiasseFormType, code: string, value: number | null) => void
  onExport: (format: GenerationLogEntry['format']) => void
  generationLog: GenerationLogEntry[]
}

export const LiasseGenerationPanel: React.FC<LiasseGenerationPanelProps> = ({
  mappings,
  validations,
  overrides,
  selectedForm,
  onSelectForm,
  onOverrideChange,
  onExport,
  generationLog
}) => {
  const currentMapping = useMemo(
    () => mappings.find((mapping) => mapping.form === selectedForm),
    [mappings, selectedForm]
  )

  const currentIssues = useMemo(
    () => validations.filter((issue) => issue.form === selectedForm || issue.form === 'global'),
    [selectedForm, validations]
  )

  if (!currentMapping) return null

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Préparation de la liasse fiscale</h4>
          <p className="text-sm text-gray-600">Mappage automatique des cases 2031 / 2031 bis / 2033</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['2031', '2031bis', '2033'] as LiasseFormType[]).map((form) => (
            <button
              key={form}
              onClick={() => onSelectForm(form)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                selectedForm === form
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-200'
              }`}
            >
              {form === '2031' ? '2031' : form === '2031bis' ? '2031 bis' : '2033'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden border border-gray-100 rounded-lg">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Libellé</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Calcul auto</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valeur retenue</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {currentMapping.cases.map((item) => (
              <tr key={item.code}>
                <td className="px-3 py-2 text-sm font-semibold text-gray-800">{item.code}</td>
                <td className="px-3 py-2 text-sm text-gray-700">
                  <div className="font-medium text-gray-900">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </td>
                <td className="px-3 py-2 text-sm text-right text-gray-600">{formatCurrency(item.autoValue)}</td>
                <td className="px-3 py-2 text-sm text-right">
                  <input
                    type="number"
                    step="0.01"
                    className="w-32 border border-gray-300 rounded-md px-2 py-1 text-right"
                    value={overrides[selectedForm]?.[item.code] ?? item.autoValue}
                    onChange={(event) =>
                      onOverrideChange(
                        selectedForm,
                        item.code,
                        event.target.value === '' ? null : Number(event.target.value)
                      )
                    }
                  />
                  {item.overridden && (
                    <span className="ml-2 inline-flex items-center text-xs text-orange-600">Ajusté</span>
                  )}
                </td>
                <td className="px-3 py-2 text-sm">
                  <button
                    onClick={() => onOverrideChange(selectedForm, item.code, null)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Réinitialiser
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <h5 className="text-sm font-semibold text-gray-900">Contrôles de cohérence</h5>
          </div>
          {currentIssues.length === 0 ? (
            <p className="text-sm text-green-700 flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>Aucune anomalie détectée.</span>
            </p>
          ) : (
            <ul className="space-y-2 text-sm text-gray-700">
              {currentIssues.map((issue) => (
                <li key={`${issue.form}-${issue.code}`} className="flex items-start space-x-2">
                  <AlertCircle
                    className={`h-4 w-4 mt-0.5 ${issue.severity === 'error' ? 'text-red-500' : 'text-amber-500'}`}
                  />
                  <div>
                    <div className="font-medium text-gray-900">
                      {issue.form.toString()} • {issue.code}
                    </div>
                    <div className="text-gray-700">{issue.message}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="w-full lg:w-72 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <h5 className="text-sm font-semibold text-gray-900">Génération</h5>
          <p className="text-xs text-gray-600">Export horodaté au format PDF ou dépôt EDI simulé.</p>
          <div className="space-y-2">
            <button
              onClick={() => onExport('pdf')}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              <span>Exporter en PDF</span>
            </button>
            <button
              onClick={() => onExport('edi')}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <FileText className="h-4 w-4" />
              <span>Générer dépôt EDI</span>
            </button>
          </div>
          <div className="border-t border-gray-200 pt-3">
            <div className="flex items-center space-x-2 text-sm font-semibold text-gray-900">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Journal des exports</span>
            </div>
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto pr-1 text-xs text-gray-700">
              {generationLog.length === 0 && <p className="text-gray-500">Aucun export enregistré.</p>}
              {generationLog.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{entry.format.toUpperCase()}</div>
                    <div className="text-gray-500">{new Date(entry.generatedAt).toLocaleString('fr-FR')}</div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-[11px] font-semibold ${
                      entry.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {entry.status === 'success' ? 'OK' : 'Erreur'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
