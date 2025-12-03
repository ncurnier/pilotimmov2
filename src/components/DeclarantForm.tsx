import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, PencilLine, RefreshCw } from 'lucide-react'
import type { Declarant } from '@/services/supabase/types'

interface DeclarantFormProps {
  declarant?: Declarant
  onSave: (value: Declarant) => Promise<void>
  saving?: boolean
}

const defaultDeclarant: Declarant = {
  company_name: '',
  siren: '',
  vat_number: '',
  ape_code: '',
  address_line1: '',
  address_line2: '',
  postal_code: '',
  city: '',
  country: 'France',
  contact_email: '',
  contact_phone: ''
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const sirenRegex = /^\d{9}$/
const phoneRegex = /^[+\d][\d\s.-]{5,}$/

export function DeclarantForm({ declarant, onSave, saving }: DeclarantFormProps) {
  const [formData, setFormData] = useState<Declarant>({ ...defaultDeclarant, ...declarant })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    setFormData({ ...defaultDeclarant, ...declarant })
  }, [declarant])

  const completeness = useMemo(() => {
    const requiredFields: (keyof Declarant)[] = [
      'company_name',
      'siren',
      'address_line1',
      'postal_code',
      'city',
      'country',
      'contact_email'
    ]

    const filled = requiredFields.filter((field) => formData[field]?.toString().trim())
    return Math.round((filled.length / requiredFields.length) * 100)
  }, [formData])

  const validate = (data: Declarant) => {
    const validationErrors: Record<string, string> = {}

    if (!data.company_name.trim()) {
      validationErrors.company_name = 'La raison sociale est requise.'
    }

    if (!data.siren.trim() || !sirenRegex.test(data.siren.trim())) {
      validationErrors.siren = 'Le SIREN doit comporter exactement 9 chiffres.'
    }

    if (!data.address_line1.trim() || data.address_line1.trim().length < 10) {
      validationErrors.address_line1 = 'L\'adresse doit contenir au moins 10 caractères.'
    }

    if (!data.postal_code.trim()) {
      validationErrors.postal_code = 'Le code postal est requis.'
    }

    if (!data.city.trim()) {
      validationErrors.city = 'La ville est requise.'
    }

    if (!data.country.trim()) {
      validationErrors.country = 'Le pays est requis.'
    }

    if (!data.contact_email.trim() || !emailRegex.test(data.contact_email.trim())) {
      validationErrors.contact_email = "L'email de contact n'est pas valide."
    }

    if (data.contact_phone && !phoneRegex.test(data.contact_phone.trim())) {
      validationErrors.contact_phone = 'Le numéro de téléphone doit contenir au moins 6 caractères numériques.'
    }

    if (data.vat_number && data.vat_number.trim().length < 4) {
      validationErrors.vat_number = 'Le numéro de TVA doit contenir au moins 4 caractères.'
    }

    if (data.ape_code && data.ape_code.trim().length < 3) {
      validationErrors.ape_code = 'Le code APE/NAF doit contenir au moins 3 caractères.'
    }

    return validationErrors
  }

  const handleChange = (field: keyof Declarant, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const validationErrors = validate(formData)
    setErrors(validationErrors)
    setSuccessMessage('')

    if (Object.keys(validationErrors).length > 0) return

    await onSave(formData)
    setSuccessMessage('Informations du déclarant sauvegardées avec succès.')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Visualisation</h3>
            <p className="text-sm text-gray-600">
              Vérifiez les informations saisies et repérez les champs manquants.
            </p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-white text-gray-700 border border-gray-200 font-medium">
            Complétude {completeness}%
          </span>
        </div>

        <div className="space-y-3 text-sm">
          {[
            { label: 'Raison sociale', value: formData.company_name },
            { label: 'SIREN', value: formData.siren },
            { label: 'TVA intracom', value: formData.vat_number },
            { label: 'Code APE/NAF', value: formData.ape_code },
            { label: 'Adresse', value: formData.address_line1 },
            { label: 'Complément', value: formData.address_line2 },
            { label: 'Code postal', value: formData.postal_code },
            { label: 'Ville', value: formData.city },
            { label: 'Pays', value: formData.country },
            { label: 'Email de contact', value: formData.contact_email },
            { label: 'Téléphone de contact', value: formData.contact_phone }
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-start justify-between rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{item.label}</p>
                <p className={`font-medium ${item.value ? 'text-gray-900' : 'text-gray-400'}`}>
                  {item.value || 'Non renseigné'}
                </p>
              </div>
              {item.value ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-1" />
              ) : (
                <PencilLine className="h-4 w-4 text-gray-400 mt-1" />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Déclarant</h3>
              <p className="text-sm text-gray-600">Saisissez les informations obligatoires du déclarant.</p>
            </div>
            {successMessage && (
              <span className="flex items-center text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-lg">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {successMessage}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Raison sociale</label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(event) => handleChange('company_name', event.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.company_name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Nom de l'entreprise"
            />
            {errors.company_name && <p className="text-xs text-red-600 mt-1">{errors.company_name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SIREN</label>
            <input
              type="text"
              inputMode="numeric"
              value={formData.siren}
              onChange={(event) => handleChange('siren', event.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.siren ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="123456789"
            />
            {errors.siren && <p className="text-xs text-red-600 mt-1">{errors.siren}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">TVA intracommunautaire</label>
            <input
              type="text"
              value={formData.vat_number}
              onChange={(event) => handleChange('vat_number', event.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.vat_number ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="FRXX999999999"
            />
            {errors.vat_number && <p className="text-xs text-red-600 mt-1">{errors.vat_number}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code APE/NAF (optionnel)</label>
            <input
              type="text"
              value={formData.ape_code}
              onChange={(event) => handleChange('ape_code', event.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.ape_code ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="6820A"
            />
            {errors.ape_code && <p className="text-xs text-red-600 mt-1">{errors.ape_code}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse complète</label>
            <input
              type="text"
              value={formData.address_line1}
              onChange={(event) => handleChange('address_line1', event.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.address_line1 ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Numéro et voie"
            />
            {errors.address_line1 && <p className="text-xs text-red-600 mt-1">{errors.address_line1}</p>}
            <input
              type="text"
              value={formData.address_line2}
              onChange={(event) => handleChange('address_line2', event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-2"
              placeholder="Complément, bâtiment, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
            <input
              type="text"
              value={formData.postal_code}
              onChange={(event) => handleChange('postal_code', event.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.postal_code ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="75001"
            />
            {errors.postal_code && <p className="text-xs text-red-600 mt-1">{errors.postal_code}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
            <input
              type="text"
              value={formData.city}
              onChange={(event) => handleChange('city', event.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.city ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Paris"
            />
            {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
            <input
              type="text"
              value={formData.country}
              onChange={(event) => handleChange('country', event.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.country ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="France"
            />
            {errors.country && <p className="text-xs text-red-600 mt-1">{errors.country}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email de contact</label>
            <input
              type="email"
              value={formData.contact_email}
              onChange={(event) => handleChange('contact_email', event.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.contact_email ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="contact@entreprise.fr"
            />
            {errors.contact_email && <p className="text-xs text-red-600 mt-1">{errors.contact_email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone de contact</label>
            <input
              type="tel"
              value={formData.contact_phone}
              onChange={(event) => handleChange('contact_phone', event.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.contact_phone ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="+33 6 12 34 56 78"
            />
            {errors.contact_phone && <p className="text-xs text-red-600 mt-1">{errors.contact_phone}</p>}
          </div>
        </div>

        {Object.keys(errors).length > 0 && (
          <div className="flex items-start space-x-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="font-medium">Merci de corriger les erreurs avant d'enregistrer.</p>
              <p className="text-xs text-red-600">SIREN à 9 chiffres, email valide et adresse suffisamment détaillée sont requis.</p>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <span className="text-sm text-gray-600">Modification inline : mettez à jour les champs ci-dessus pour corriger rapidement.</span>
        </div>
      </form>
    </div>
  )
}
