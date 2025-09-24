import { useState } from "react";
import { useCurrentProperty } from "../../store/useCurrentProperty";
import { createAmortization } from "../../services/supabase/amortizations";

export default function NewAmortizationForm() {
  const { currentPropertyId } = useCurrentProperty();

  const [itemName, setItemName] = useState("Mobilier");
  const [purchaseAmount, setPurchaseAmount] = useState<number>(1000);
  const [usefulLifeYears, setUsefulLifeYears] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!currentPropertyId) {
      setMsg("Sélectionne d’abord un bien (property_id).");
      return;
    }
    if (usefulLifeYears < 1) {
      setMsg("La durée (useful_life_years) doit être ≥ 1.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createAmortization({
        propertyId: currentPropertyId,
        itemName,
        purchaseAmount,
        usefulLifeYears,
      });
      setMsg("✅ Amortissement créé");
    } catch (err: any) {
      setMsg(`❌ ${err.message ?? "Erreur inconnue"}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, maxWidth: 420 }}>
      {!currentPropertyId && (
        <div style={{ padding: 8, background: "#fff3cd", border: "1px solid #ffeeba" }}>
          Sélectionne un bien pour activer le formulaire.
        </div>
      )}

      <label>
        Intitulé
        <input
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="Ex: Mobilier salon"
        />
      </label>

      <label>
        Montant d’achat (€)
        <input
          type="number"
          inputMode="decimal"
          value={purchaseAmount}
          onChange={(e) => setPurchaseAmount(Number(e.target.value))}
          min={0}
        />
      </label>

      <label>
        Durée d’amortissement (années)
        <input
          type="number"
          value={usefulLifeYears}
          onChange={(e) => setUsefulLifeYears(parseInt(e.target.value || "0", 10))}
          min={1}
        />
      </label>

      <button type="submit" disabled={!currentPropertyId || isSubmitting}>
        {isSubmitting ? "Création..." : "Créer l’amortissement"}
      </button>

      {msg && <div>{msg}</div>}
    </form>
  );
}
