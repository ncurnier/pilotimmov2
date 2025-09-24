import { useState } from "react";
import { useCurrentProperty } from "../../store/useCurrentProperty";
import { createAmortization, validateAmortizationData } from "../../services/supabase/amortizations";
import { Calculator, AlertCircle } from "lucide-react";

export default function NewAmortizationForm() {
  const { currentPropertyId, currentProperty } = useCurrentProperty();
  
  const [itemName, setItemName] = useState("Mobilier salon");
  const [purchaseAmount, setPurchaseAmount] = useState<number>(1000);
  const [usefulLifeYears, setUsefulLifeYears] = useState<number>(10);
  const [category, setCategory] = useState<"mobilier" | "electromenager" | "informatique" | "travaux" | "amenagement" | "autre">("mobilier");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const categoryOptions = [
    { value: 'mobilier', label: 'Mobilier (10 ans)', years: 10 },
    { value: 'electromenager', label: 'Électroménager (5 ans)', years: 5 },
    { value: 'informatique', label: 'Informatique (3 ans)', years: 3 },
    { value: 'travaux', label: 'Travaux (20 ans)', years: 20 },
    { value: 'amenagement', label: 'Aménagement (15 ans)', years: 15 },
    { value: 'autre', label: 'Autre (5 ans)', years: 5 }
  ];

  const handleCategoryChange = (newCategory: typeof category) => {
    setCategory(newCategory);
    const option = categoryOptions.find(opt => opt.value === newCategory);
    if (option) {
      setUsefulLifeYears(option.years);
    }
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!currentPropertyId) {
      setMessage({ type: 'error', text: "Sélectionnez d'abord un bien." });
      return;
    }

    // Validation côté client
    const validationErrors = validateAmortizationData({
      purchase_amount: purchaseAmount,
      useful_life_years: usefulLifeYears
    });

    if (validationErrors.length > 0) {
      setMessage({ type: 'error', text: validationErrors.join(', ') });
      return;
    }

    if (!itemName.trim()) {
      setMessage({ type: 'error', text: "Le nom de l'équipement est requis." });
      return;
    }

    setIsSubmitting(true);
    try {
      await createAmortization({
        propertyId: currentPropertyId,
        itemName: itemName.trim(),
        purchaseAmount,
        usefulLifeYears,
        category,
        notes: notes.trim() || null
      });
      
      setMessage({ type: 'success', text: "✅ Amortissement créé avec succès" });
      
      // Reset form
      setItemName("Mobilier salon");
      setPurchaseAmount(1000);
      setUsefulLifeYears(10);
      setCategory("mobilier");
      setNotes("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: 'error', text: `❌ ${err.message}` });
      } else {
        setMessage({ type: 'error', text: "❌ Erreur inconnue" });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const calculatePreview = () => {
    if (purchaseAmount > 0 && usefulLifeYears > 0) {
      const annualAmortization = purchaseAmount / usefulLifeYears;
      const monthlyAmortization = annualAmortization / 12;
      return { annualAmortization, monthlyAmortization };
    }
    return null;
  };

  const preview = calculatePreview();

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Calculator className="h-6 w-6 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">Nouvel amortissement</h2>
      </div>

      {!currentPropertyId && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <span className="text-orange-700 font-medium">
              Sélectionnez un bien pour activer le formulaire
            </span>
          </div>
        </div>
      )}

      {currentProperty && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            <span className="text-blue-900 font-medium">
              Bien sélectionné: {currentProperty.address}
            </span>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom de l'équipement *
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Ex: Réfrigérateur Samsung"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catégorie *
            </label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as typeof category)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categoryOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Montant d'achat (€) *
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Durée d'amortissement (années) *
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={usefulLifeYears}
              onChange={(e) => setUsefulLifeYears(parseInt(e.target.value || "1", 10))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (optionnel)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Notes sur cet équipement..."
          />
        </div>

        {/* Aperçu du calcul */}
        {preview && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Aperçu du calcul</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Amortissement annuel:</span>
                <div className="font-medium text-blue-600">
                  {Math.round(preview.annualAmortization * 100) / 100} €
                </div>
              </div>
              <div>
                <span className="text-gray-600">Amortissement mensuel:</span>
                <div className="font-medium text-green-600">
                  {Math.round(preview.monthlyAmortization * 100) / 100} €
                </div>
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className={`p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-700' 
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={!currentPropertyId || isSubmitting}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            !currentPropertyId || isSubmitting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? "Création en cours..." : "Créer l'amortissement"}
        </button>
      </form>
    </div>
  );
}