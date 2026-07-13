import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { C } from "../theme";
import { T } from "../i18n/translations";
import { useCurrentGroup } from "../hooks/useCurrentGroup";
import { useVehicles } from "../hooks/useVehicles";
import { analyzePhoto } from "../lib/api";
import { Btn, Input, Label, VinPlate } from "../components/ui";
import AddVehicleModal from "../components/AddVehicleModal";

const t = (k) => T.ru[k] || k;

export default function VehicleList() {
  const { group, loading: groupLoading } = useCurrentGroup();
  const { vehicles, loading, addVehicle, reload } = useVehicles(group?.id);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  const notify = (msg, kind = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), kind === "warn" ? 12000 : 6000);
  };

  const handlePhoto = async (file) => {
    if (!file || !vehicles) return;
    setBusy(true);
    try {
      const knownVins = vehicles.map((v) => v.vin);
      const extracted = await analyzePhoto(file, "ru", knownVins);
      let vin = (extracted.vin || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!vin || vin.length < 11) {
        notify(`${t("aiNoVin")} нет VIN, добавьте автомобиль вручную`, "warn");
        return;
      }
      const existing = vehicles.find((v) => v.vin === vin);
      if (!existing) {
        await addVehicle({ vin, brand: extracted.brand, model: extracted.model, year: extracted.year, plate: extracted.plate });
      }
      notify(`${t("aiAdded")} ${extracted.brand} ${extracted.model}`);
      await reload();
    } catch (e) {
      notify(`${t("aiError")}\n${e.message}`, "warn");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (groupLoading || loading || !vehicles) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: C.pageBg }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `4px solid ${C.line}`, borderTopColor: C.accent, animation: "spin 0.9s linear infinite" }} />
      </div>
    );
  }

  const list = vehicles.filter((v) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [v.vin, v.brand, v.model, v.plate].join(" ").toLowerCase().includes(q);
  });

  return (
    <div className="font-body min-h-screen" style={{ background: C.pageBg, color: C.headingText }}>
      <header className="px-4 sm:px-8 pt-6 pb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display font-bold" style={{ fontSize: 28, color: C.headingText }}>{group?.name || t("appTitle")}</h1>
          <div className="text-sm mt-1" style={{ color: C.bodyText }}>{t("appSub")}</div>
        </div>
        <Link to="/app/settings" className="text-sm" style={{ color: C.accent }}>{t("groupSettings")}</Link>
      </header>

      {toast && (
        <div
          className="fixed top-4 right-4 z-50 text-sm px-4 py-3 shadow-lg"
          style={{
            background: toast.kind === "warn" ? "#FFF4E0" : "#EAF6EC",
            border: `1.5px solid ${toast.kind === "warn" ? C.accentDark : C.ok}`,
            borderRadius: 8, maxWidth: 340, whiteSpace: "pre-wrap",
          }}
        >
          {toast.msg}
        </div>
      )}

      <main className="px-4 sm:px-8 py-6 max-w-6xl mx-auto">
        <div className="flex flex-wrap gap-3 items-center mb-3">
          <div className="flex-1 min-w-[200px]">
            <Input placeholder={t("searchPh")} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Btn kind="dark" onClick={() => fileRef.current?.click()} disabled={busy}>📷 {t("analyzePhoto")}</Btn>
          <Btn onClick={() => setShowAdd(true)}>＋ {t("addVehicle")}</Btn>
        </div>
        <div className="text-xs mb-5" style={{ color: C.bodyText }}>{t("photoHint")}</div>

        <div className="mb-3"><Label>{t("vehicles")} — {vehicles.length}</Label></div>

        {list.length === 0 ? (
          <div className="text-center py-16 px-6" style={{ border: `1.5px dashed ${C.line}`, borderRadius: 12, background: C.card }}>
            <div className="font-display uppercase font-semibold text-lg">{t("noVehicles")}</div>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))" }}>
            {list.map((v) => {
              const last = [...v.history].reverse().find((h) => h.date);
              return (
                <Link
                  key={v.vin}
                  to={`/app/vehicles/${v.vin}`}
                  className="text-left p-4 block"
                  style={{ background: C.card, border: `1.5px solid ${C.line}`, borderLeft: `5px solid ${C.accent}`, borderRadius: 10 }}
                >
                  <div className="font-display uppercase font-bold" style={{ fontSize: 20, lineHeight: 1.1, color: C.headingText }}>
                    {v.brand || t("unknown")} {v.model}
                  </div>
                  <div className="text-sm mb-2" style={{ color: C.bodyText }}>
                    {v.year || t("unknown")} · {v.plate || t("unknown")}
                  </div>
                  <VinPlate vin={v.vin} small />
                  <div className="text-xs mt-3 font-mono" style={{ color: C.bodyText }}>
                    {v.history.length} {t("records")}{last ? ` · ${t("lastService")}: ${last.date}` : ""}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handlePhoto(e.target.files?.[0])}
      />

      {busy && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: "rgba(40,30,20,0.5)" }}>
          <div className="bg-white px-8 py-6 text-center" style={{ borderRadius: 10, border: `2px solid ${C.accent}` }}>
            <div className="mx-auto mb-3" style={{ width: 34, height: 34, borderRadius: "50%", border: `4px solid ${C.line}`, borderTopColor: C.accent, animation: "spin 0.9s linear infinite" }} />
            <div className="font-display uppercase font-semibold">{t("analyzing")}</div>
          </div>
        </div>
      )}

      {showAdd && (
        <AddVehicleModal
          onSave={async (info) => { await addVehicle(info); setShowAdd(false); }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
