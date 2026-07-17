import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { C } from "../theme";
import { T } from "../i18n/translations";
import { useCurrentGroup } from "../hooks/useCurrentGroup";
import { useVehicles } from "../hooks/useVehicles";
import { Btn, Input, Label, VinPlate } from "../components/ui";
import AddEntryModal from "../components/AddEntryModal";
import { filterHistory, sumCost } from "../lib/historyFilters";

const t = (k) => T.ru[k] || k;

export default function VehicleDetail() {
  const { vin } = useParams();
  const navigate = useNavigate();
  const { group } = useCurrentGroup();
  const { vehicles, loading, addEntry, deleteVehicle } = useVehicles(group?.id);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [f, setF] = useState({ dateFrom: "", dateTo: "", type: "", costMin: "", costMax: "" });

  if (loading || !vehicles) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: C.pageBg }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `4px solid ${C.line}`, borderTopColor: C.accent, animation: "spin 0.9s linear infinite" }} />
      </div>
    );
  }

  const vehicle = vehicles.find((v) => v.vin === vin);
  if (!vehicle) return null;

  const types = [...new Set(vehicle.history.map((h) => h.service_type).filter(Boolean))];

  const filtered = filterHistory(vehicle.history, f);
  const totalCost = sumCost(filtered);

  const info = [["vin", vehicle.vin], ["brand", vehicle.brand], ["model", vehicle.model], ["year", vehicle.year], ["plate", vehicle.plate]];

  return (
    <div className="font-body min-h-screen px-4 sm:px-8 py-6 max-w-6xl mx-auto" style={{ background: C.pageBg, color: C.headingText }}>
      <div className="no-print mb-4">
        <button onClick={() => navigate("/app")} className="font-display uppercase font-semibold text-sm" style={{ color: C.bodyText, letterSpacing: "0.06em", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          {t("back")}
        </button>
      </div>

      <section className="p-5 mb-5" style={{ background: C.card, border: `1.5px solid ${C.headingText}`, borderRadius: 12 }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Label>{t("basicInfo")}</Label>
            <div className="font-display uppercase font-bold mt-1" style={{ fontSize: 26, lineHeight: 1, color: C.headingText }}>
              {vehicle.brand || t("unknown")} {vehicle.model} {vehicle.year && <span style={{ color: C.bodyText }}>· {vehicle.year}</span>}
            </div>
            <div className="mt-3"><VinPlate vin={vehicle.vin} /></div>
          </div>
          <table className="text-sm">
            <tbody>
              {info.map(([k, v]) => (
                <tr key={k}>
                  <td className="pr-4 py-1"><Label>{t(k)}</Label></td>
                  <td className="font-mono py-1">{v || t("unknown")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="no-print flex flex-wrap gap-2 mt-4 pt-4" style={{ borderTop: `1px solid ${C.line}` }}>
          <Btn onClick={() => setShowForm(true)}>＋ {t("addEntry")}</Btn>
          <Btn kind="ghost" onClick={() => window.print()}>⤓ {t("exportPdf")}</Btn>
          <Btn kind="danger" onClick={() => setConfirmDelete(true)}>{t("deleteVehicle")}</Btn>
        </div>
      </section>

      <section className="no-print p-4 mb-5" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12 }}>
        <div className="mb-2"><Label>{t("filters")}</Label></div>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))" }}>
          <Input type="date" value={f.dateFrom} onChange={(e) => setF({ ...f, dateFrom: e.target.value })} />
          <Input type="date" value={f.dateTo} onChange={(e) => setF({ ...f, dateTo: e.target.value })} />
          <select
            value={f.type}
            onChange={(e) => setF({ ...f, type: e.target.value })}
            className="font-body"
            style={{ border: `1px solid ${C.line}`, borderRadius: 6, padding: "8px 10px", fontSize: 14, background: "#fff" }}
          >
            <option value="">{t("anyType")}</option>
            {types.map((ty) => <option key={ty} value={ty}>{ty}</option>)}
          </select>
          <Input type="number" placeholder={t("costMin")} value={f.costMin} onChange={(e) => setF({ ...f, costMin: e.target.value })} />
          <Input type="number" placeholder={t("costMax")} value={f.costMax} onChange={(e) => setF({ ...f, costMax: e.target.value })} />
          <Btn kind="ghost" onClick={() => setF({ dateFrom: "", dateTo: "", type: "", costMin: "", costMax: "" })}>{t("clear")}</Btn>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-2">
          <Label>{t("history")} — {filtered.length} {t("entriesTotal")}</Label>
          {totalCost > 0 && (
            <span className="font-mono text-sm">{t("totalCost")}: {totalCost.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}</span>
          )}
        </div>
        {filtered.length === 0 ? (
          <div className="p-6 text-sm text-center" style={{ background: C.card, border: `1.5px dashed ${C.line}`, borderRadius: 12, color: C.bodyText }}>
            {vehicle.history.length === 0 ? t("noHistory") : t("noMatch")}
          </div>
        ) : (
          <div style={{ overflowX: "auto", background: C.card, border: `1.5px solid ${C.headingText}`, borderRadius: 12 }}>
            <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr style={{ background: C.headingText, color: "#fff" }}>
                  {["date", "type", "desc", "mileage", "cost", "comment"].map((k) => (
                    <th key={k} className="font-display uppercase text-left px-3 py-2 font-semibold" style={{ letterSpacing: "0.06em", fontSize: 13 }}>{t(k)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...filtered].reverse().map((h, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{h.date || t("unknown")}</td>
                    <td className="px-3 py-2">
                      <span style={{ background: C.accent + "22", border: `1px solid ${C.accent}`, borderRadius: 6, padding: "1px 7px", fontSize: 13 }}>
                        {h.service_type || t("unknown")}
                      </span>
                    </td>
                    <td className="px-3 py-2" style={{ maxWidth: 280 }}>{h.description}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{h.mileage}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{h.cost}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: C.bodyText, maxWidth: 220 }}>{h.comment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <AddEntryModal
          onClose={() => setShowForm(false)}
          onSave={async (entry) => {
            try {
              await addEntry(vehicle.id, entry);
              setShowForm(false);
            } catch (err) {
              console.error("Failed to save service entry:", err.message);
            }
          }}
        />
      )}

      {confirmDelete && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(40,30,20,0.5)" }} onClick={() => setConfirmDelete(false)}>
          <div className="w-full max-w-sm p-5" style={{ background: C.card, borderRadius: 12, border: `2px solid ${C.danger}` }} onClick={(e) => e.stopPropagation()}>
            <div className="font-display uppercase font-bold text-lg mb-2" style={{ color: C.danger }}>⚠ {t("confirmTitle")}</div>
            <div className="text-sm mb-5">{t("confirmDelete")}</div>
            <div className="flex gap-2 justify-end">
              <Btn kind="ghost" onClick={() => setConfirmDelete(false)}>{t("cancel")}</Btn>
              <Btn kind="danger" onClick={async () => { await deleteVehicle(vehicle.id); navigate("/app"); }}>{t("confirmYes")}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
