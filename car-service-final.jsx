import React, { useState, useEffect, useRef } from "react";

/* ============================================================
   CAR SERVICE DATABASE — FINAL
   - Предзагруженные данные: Kia Sportage, Hyundai Palisade, RAM 1500
   - 📷 Кнопка ИИ-анализа фото документов (в рамках подписки)
   - Постоянное хранилище (данные сохраняются между сессиями)
   - Двуязычный интерфейс EN/RU, фильтры, PDF
   ============================================================ */

const C = {
  paper: "#F1F2EE",
  card: "#FFFFFF",
  ink: "#171A1D",
  inkSoft: "#4A5157",
  line: "#D8DBD4",
  hazard: "#FFC400",
  hazardDark: "#8A6A00",
  danger: "#B3261E",
  ok: "#1E7A3C",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
.font-disp { font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif; }
.font-body { font-family: 'Barlow', system-ui, sans-serif; }
.font-mono2 { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
@media print {
  .no-print { display: none !important; }
  body { background: #fff !important; }
}
input:focus, select:focus, button:focus-visible, textarea:focus {
  outline: 2px solid ${C.hazard}; outline-offset: 1px;
}
@keyframes spin { to { transform: rotate(360deg); } }
`;

const T = {
  en: {
    appTitle: "CAR SERVICE DATABASE",
    appSub: "Fleet management · service history · AI document intake",
    vehicles: "Vehicles",
    searchPh: "Search by VIN, brand or model…",
    noVehicles: "No vehicles yet",
    addVehicle: "Add vehicle",
    analyzePhoto: "Analyze document photo",
    analyzing: "Analyzing document…",
    photoHint: "Upload a photo of an invoice or work order — AI extracts the data automatically",
    records: "records",
    lastService: "Last service",
    back: "← All vehicles",
    basicInfo: "Vehicle information",
    vin: "VIN",
    brand: "Brand",
    model: "Model",
    year: "Year",
    plate: "License plate",
    history: "Service history",
    date: "Date",
    type: "Service type",
    desc: "Description",
    mileage: "Mileage",
    cost: "Cost",
    comment: "Comment",
    addEntry: "Add entry",
    save: "Save",
    cancel: "Cancel",
    filters: "Filters",
    anyType: "Any type",
    costMin: "Cost min",
    costMax: "Cost max",
    clear: "Clear",
    exportPdf: "Print to PDF",
    noHistory: "No service entries yet.",
    noMatch: "No entries match the filters.",
    deleteVehicle: "Delete vehicle",
    confirmDelete: "Delete this vehicle and its entire history?",
    confirmTitle: "Confirmation",
    confirmYes: "Yes, delete",
    aiError: "Could not analyze the image. Try a clearer photo.",
    aiNoVin: "VIN not found in the document. Entry saved under:",
    aiAdded: "Entry added for",
    newVehicle: "new vehicle created",
    required: "VIN is required",
    unknown: "—",
    entriesTotal: "entries",
    totalCost: "Total cost",
    printedTitle: "Service history report",
    resetData: "Reset to Drive data",
    confirmReset: "Reset all data to the original Google Drive snapshot? Local changes will be lost.",
  },
  ru: {
    appTitle: "БАЗА АВТОСЕРВИСА",
    appSub: "Автопарк · история обслуживания · ИИ-приём документов",
    vehicles: "Автомобили",
    searchPh: "Поиск по VIN, марке или модели…",
    noVehicles: "Пока нет автомобилей",
    addVehicle: "Добавить автомобиль",
    analyzePhoto: "Анализ фото документа",
    analyzing: "Анализирую документ…",
    photoHint: "Загрузите фото счёта или заказ-наряда — ИИ извлечёт данные автоматически",
    records: "записей",
    lastService: "Последнее обслуживание",
    back: "← Все автомобили",
    basicInfo: "Информация об автомобиле",
    vin: "VIN",
    brand: "Марка",
    model: "Модель",
    year: "Год",
    plate: "Гос. номер",
    history: "История обслуживания",
    date: "Дата",
    type: "Тип работ",
    desc: "Описание",
    mileage: "Пробег",
    cost: "Стоимость",
    comment: "Комментарий",
    addEntry: "Добавить запись",
    save: "Сохранить",
    cancel: "Отмена",
    filters: "Фильтры",
    anyType: "Любой тип",
    costMin: "Стоимость от",
    costMax: "Стоимость до",
    clear: "Сбросить",
    exportPdf: "Экспорт PDF",
    noHistory: "Записей об обслуживании пока нет.",
    noMatch: "Нет записей по заданным фильтрам.",
    deleteVehicle: "Удалить автомобиль",
    confirmDelete: "Удалить автомобиль и всю его историю?",
    confirmTitle: "Подтверждение",
    confirmYes: "Да, удалить",
    aiError: "Не удалось распознать изображение. Попробуйте более чёткое фото.",
    aiNoVin: "VIN не найден в документе. Запись сохранена под:",
    aiAdded: "Запись добавлена для",
    newVehicle: "создан новый автомобиль",
    required: "VIN обязателен",
    unknown: "—",
    entriesTotal: "записей",
    totalCost: "Итого",
    printedTitle: "Отчёт по истории обслуживания",
    resetData: "Сброс к данным Drive",
    confirmReset: "Вернуть исходные данные с Google Drive? Локальные изменения будут потеряны.",
  },
};

const STORAGE_KEY = "car-service-db-v3";

// ===== Данные, загруженные с Google Drive (файл "cars") =====
const INITIAL_VEHICLES = {
  KNDPN3AC8K7509452: {
    vin: "KNDPN3AC8K7509452",
    brand: "Kia",
    model: "Sportage",
    year: "2019",
    plate: "",
    history: [
      { date: "2024-11-01", service_type: "Oil and filter", description: "Oil change and filter replacement", mileage: "153186", cost: "", comment: "" },
      { date: "2025-02-21", service_type: "Oil and filter", description: "Oil change and filter replacement", mileage: "162787", cost: "", comment: "" },
      { date: "2025-09-29", service_type: "Emissions inspection", description: "Emissions test for tax 2025", mileage: "170741", cost: "140.32", comment: "For tax 2025" },
      { date: "2025-11-01", service_type: "Registration", description: "Registration issue", mileage: "", cost: "", comment: "" },
      { date: "2025-11-28", service_type: "Oil and filter", description: "Oil change and filter replacement", mileage: "173138", cost: "", comment: "" },
      { date: "2026-06-06", service_type: "Spark plugs", description: "Spark plugs replacement (all 4)", mileage: "180000", cost: "", comment: "" },
    ],
  },
  KM8R44HE9NU387985: {
    vin: "KM8R44HE9NU387985",
    brand: "Hyundai",
    model: "Palisade",
    year: "2022",
    plate: "XWW9916",
    history: [
      { date: "2026-02-01", service_type: "Accessory", description: "Dash cam", mileage: "", cost: "128.62", comment: "" },
      { date: "2026-03-15", service_type: "Accessory", description: "Key cover", mileage: "", cost: "8.95", comment: "" },
      { date: "2026-03-15", service_type: "Accessory", description: "Floor Mats + Cargo Mat Set", mileage: "", cost: "108.24", comment: "" },
      { date: "2026-07-10", service_type: "Oil and filter", description: "Замена масла и фильтра (Valvoline Full Synthetic 5W30, 7 кварт), 20-точечная инспекция, проверка АКБ, долив омывайки", mileage: "112785", cost: "119.40", comment: "Brakes Plus, Cedar Park TX · счёт #35915232941 · купон −$20 · Visa" },
    ],
  },
  "1C6RR7TT6KS662725": {
    vin: "1C6RR7TT6KS662725",
    brand: "RAM",
    model: "1500",
    year: "2019",
    plate: "WMR6014",
    history: [
      { date: "", service_type: "Parts", description: "LKQ Part No: 445144866 / 68367520AA", mileage: "101000", cost: "667", comment: "LKQ inv #398620006" },
      { date: "", service_type: "Parts", description: "Mopar 68367521AA", mileage: "129000", cost: "490", comment: "Dealer part, 2 days delivery" },
    ],
  },
};

/* ---------- storage ---------- */
async function loadDB() {
  try {
    const res = await window.storage.get(STORAGE_KEY);
    if (res && res.value) return JSON.parse(res.value);
  } catch (e) { /* нет сохранённых данных — используем исходные */ }
  return null;
}
async function saveDB(vehicles) {
  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(vehicles));
  } catch (e) {
    console.error("Storage save failed", e);
  }
}

async function testAiConnection() {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 50,
      messages: [{ role: "user", content: "Ответь только словом: OK" }],
    }),
  });
  const raw = await response.text();
  return `HTTP ${response.status}\n${raw.slice(0, 500)}`;
}

/* ---------- ИИ-анализ фото (в рамках подписки, без API-ключа) ---------- */

// Конвертируем ЛЮБОЙ формат фото (включая HEIC с iPhone) в компактный JPEG
// через canvas — так надёжнее и намного быстрее/дешевле по токенам.
async function fileToSupportedImage(file, maxDim = 1568) {
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error("read-failed"));
    r.readAsDataURL(file);
  });

  let img;
  try {
    img = await new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error("decode-failed"));
      im.src = dataUrl;
    });
  } catch (e) {
    // Браузер не смог декодировать формат (обычно HEIC на не-Apple устройствах)
    throw new Error("Формат фото не поддерживается браузером. Сделайте снимок камерой ещё раз или выберите JPEG/PNG.");
  }

  let { width, height } = img;
  if (!width || !height) throw new Error("Не удалось прочитать изображение (пустой файл?).");
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  const outDataUrl = canvas.toDataURL("image/jpeg", 0.87);
  return { base64: outDataUrl.split(",")[1], mediaType: "image/jpeg" };
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Модель не вернула JSON. Ответ: " + text.slice(0, 200));
  return JSON.parse(match[0]);
}

async function analyzeDocument(file, lang, knownVins) {
  const { base64, mediaType } = await fileToSupportedImage(file);
  const prompt = `You are an OCR/extraction system for an automotive service company. Analyze this photo or screenshot of a vehicle service document (invoice, work order, receipt) and extract structured data.

Known fleet VINs (if the document clearly refers to one of these vehicles by brand/model/plate but the VIN itself is not visible, use the matching VIN): ${knownVins.join(", ")}

Respond ONLY with a raw JSON object, no markdown fences, no explanations:
{
  "vin": "string or empty",
  "brand": "string or empty",
  "model": "string or empty",
  "year": "string or empty",
  "plate": "string or empty",
  "date": "YYYY-MM-DD or empty",
  "service_type": "short label, e.g. oil change / repair / diagnostics / parts",
  "description": "what was done or what was bought",
  "mileage": "number as string or empty",
  "cost": "total amount as number string or empty",
  "comment": "anything else useful, incl. service center name"
}
Write "service_type", "description" and "comment" in ${lang === "ru" ? "Russian" : "English"}. If a field is unreadable or absent, use an empty string.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });
  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Сервер вернул не-JSON (HTTP ${response.status}): ${raw.slice(0, 300)}`);
  }

  if (!response.ok || data.error) {
    const msg = data?.error?.message || data?.error?.type || `HTTP ${response.status}`;
    throw new Error(`Ошибка API (${response.status}): ${msg}`);
  }

  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  if (!text) throw new Error("Пустой ответ от модели. Сырые данные: " + JSON.stringify(data).slice(0, 300));
  return extractJson(text);
}

/* ---------- UI atoms ---------- */
function Label({ children }) {
  return (
    <span className="font-disp uppercase text-xs" style={{ color: C.inkSoft, letterSpacing: "0.14em" }}>
      {children}
    </span>
  );
}

function VinPlate({ vin, small }) {
  return (
    <span
      className="font-mono2 inline-block"
      style={{
        background: C.ink, color: "#F3F4F0", borderRadius: 3,
        padding: small ? "2px 8px" : "4px 12px",
        fontSize: small ? 12 : 15, letterSpacing: "0.1em",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)",
      }}
    >
      {vin}
    </span>
  );
}

function Btn({ children, onClick, kind = "solid", disabled, style }) {
  const kinds = {
    solid: { background: C.hazard, color: C.ink, border: `1.5px solid ${C.ink}` },
    ghost: { background: "transparent", color: C.ink, border: `1.5px solid ${C.ink}` },
    dark: { background: C.ink, color: "#fff", border: `1.5px solid ${C.ink}` },
    danger: { background: "transparent", color: C.danger, border: `1.5px solid ${C.danger}` },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="font-disp uppercase font-semibold"
      style={{
        letterSpacing: "0.08em", fontSize: 14, padding: "9px 16px", borderRadius: 3,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        ...kinds[kind], ...style,
      }}
    >
      {children}
    </button>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={"font-body " + (props.className || "")}
      style={{
        border: `1px solid ${C.line}`, borderRadius: 3, padding: "8px 10px",
        fontSize: 14, width: "100%", background: "#fff", color: C.ink, ...props.style,
      }}
    />
  );
}

/* ---------- main app ---------- */
export default function App() {
  const [lang, setLang] = useState("ru");
  const [vehicles, setVehicles] = useState(null);
  const [view, setView] = useState({ page: "list", vin: null });
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [confirm, setConfirm] = useState(null); // { msg, onYes }
  const fileRef = useRef(null);
  const t = (k) => T[lang][k] || k;

  useEffect(() => {
    loadDB().then((saved) => setVehicles(saved || INITIAL_VEHICLES));
  }, []);

  const notify = (msg, kind = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), kind === "warn" ? 12000 : 6000);
  };

  const persist = async (next) => {
    setVehicles(next);
    await saveDB(next);
  };

  const runDiagnostic = async () => {
    setBusy(true);
    try {
      const result = await testAiConnection();
      notify("Диагностика:\n" + result, "warn");
      console.log("AI diagnostic result:", result);
    } catch (e) {
      notify("Диагностика — сбой fetch:\n" + (e.message || e), "warn");
    } finally {
      setBusy(false);
    }
  };

  /* --- фото → ИИ → запись в базу --- */
  const handlePhoto = async (file) => {
    if (!file || !vehicles) return;
    setBusy(true);
    try {
      const ex = await analyzeDocument(file, lang, Object.keys(vehicles));
      let vin = (ex.vin || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      let noVin = false;
      if (!vin || vin.length < 11) {
        vin = "UNKNOWN-" + Date.now().toString().slice(-6);
        noVin = true;
      }
      const isNew = !vehicles[vin];
      const next = { ...vehicles };
      if (isNew) {
        next[vin] = { vin, brand: ex.brand || "", model: ex.model || "", year: ex.year || "", plate: ex.plate || "", history: [] };
      } else {
        // базовая информация не перезаписывается — только заполняются пробелы
        const v = { ...next[vin] };
        ["brand", "model", "year", "plate"].forEach((f) => { if (!v[f] && ex[f]) v[f] = ex[f]; });
        next[vin] = v;
      }
      const entry = {
        date: ex.date || new Date().toISOString().slice(0, 10),
        service_type: ex.service_type || "",
        description: ex.description || "",
        mileage: ex.mileage || "",
        cost: ex.cost || "",
        comment: ex.comment || "",
      };
      next[vin] = { ...next[vin], history: [...next[vin].history, entry] };
      await persist(next);
      notify(noVin ? `${t("aiNoVin")} ${vin}` : `${t("aiAdded")} ${next[vin].brand} ${next[vin].model}${isNew ? " — " + t("newVehicle") : ""}`, noVin ? "warn" : "ok");
      setView({ page: "detail", vin });
    } catch (e) {
      console.error(e);
      notify(`${t("aiError")}\n${e.message || e}`, "warn");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addVehicleManual = async (info) => {
    const vin = info.vin.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!vin) return notify(t("required"), "warn");
    const next = { ...vehicles };
    if (!next[vin]) next[vin] = { vin, brand: info.brand, model: info.model, year: info.year, plate: info.plate, history: [] };
    await persist(next);
    setShowAddVehicle(false);
    setView({ page: "detail", vin });
  };

  const addEntry = async (vin, entry) => {
    const next = { ...vehicles };
    next[vin] = { ...next[vin], history: [...next[vin].history, entry] };
    await persist(next);
  };

  const deleteVehicle = (vin) => {
    setConfirm({
      msg: t("confirmDelete"),
      onYes: async () => {
        const next = { ...vehicles };
        delete next[vin];
        await persist(next);
        setView({ page: "list", vin: null });
        setConfirm(null);
      },
    });
  };

  const resetToInitial = () => {
    setConfirm({
      msg: t("confirmReset"),
      onYes: async () => {
        await persist(INITIAL_VEHICLES);
        setView({ page: "list", vin: null });
        setConfirm(null);
      },
    });
  };

  if (!vehicles)
    return (
      <div className="font-body flex items-center justify-center min-h-screen" style={{ background: C.paper, color: C.inkSoft }}>
        <style>{FONTS}</style>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: `4px solid ${C.line}`, borderTopColor: C.hazard, animation: "spin 0.9s linear infinite" }} />
      </div>
    );

  const list = Object.values(vehicles).filter((v) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [v.vin, v.brand, v.model, v.plate].join(" ").toLowerCase().includes(q);
  });

  return (
    <div className="font-body min-h-screen" style={{ background: C.paper, color: C.ink }}>
      <style>{FONTS}</style>
      <div className="no-print" style={{ height: 8, background: `repeating-linear-gradient(-45deg, ${C.hazard} 0 14px, ${C.ink} 14px 28px)` }} />

      <header className="no-print px-4 sm:px-8 pt-5 pb-4 flex flex-wrap items-end justify-between gap-3" style={{ borderBottom: `1.5px solid ${C.ink}` }}>
        <div>
          <h1 className="font-disp font-bold uppercase" style={{ fontSize: 30, lineHeight: 1, letterSpacing: "0.04em" }}>{t("appTitle")}</h1>
          <div className="text-sm mt-1" style={{ color: C.inkSoft }}>{t("appSub")}</div>
        </div>
        <div className="flex gap-1">
          {["en", "ru"].map((L) => (
            <button
              key={L}
              onClick={() => setLang(L)}
              className="font-disp uppercase font-semibold"
              style={{
                padding: "6px 14px", fontSize: 14, letterSpacing: "0.1em",
                border: `1.5px solid ${C.ink}`, borderRadius: 3,
                background: lang === L ? C.ink : "transparent",
                color: lang === L ? C.hazard : C.ink, cursor: "pointer",
              }}
            >
              {L.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {toast && (
        <div
          className="no-print fixed top-4 right-4 z-50 text-sm px-4 py-3 shadow-lg"
          style={{
            background: toast.kind === "warn" ? "#FFF4E0" : "#EAF6EC",
            border: `1.5px solid ${toast.kind === "warn" ? C.hazardDark : C.ok}`,
            borderRadius: 4, maxWidth: 340, whiteSpace: "pre-wrap",
          }}
        >
          {toast.msg}
        </div>
      )}

      <main className="px-4 sm:px-8 py-6 max-w-6xl mx-auto">
        {view.page === "list" ? (
          <>
            <div className="flex flex-wrap gap-3 items-center mb-3 no-print">
              <div className="flex-1 min-w-[200px]">
                <Input placeholder={t("searchPh")} value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <Btn kind="dark" onClick={() => fileRef.current?.click()} disabled={busy}>📷 {t("analyzePhoto")}</Btn>
              <Btn onClick={() => setShowAddVehicle(true)}>＋ {t("addVehicle")}</Btn>
            </div>
            <div className="text-xs mb-5 no-print" style={{ color: C.inkSoft }}>{t("photoHint")}</div>

            <div className="mb-3"><Label>{t("vehicles")} — {Object.keys(vehicles).length}</Label></div>

            {list.length === 0 ? (
              <div className="text-center py-16 px-6" style={{ border: `1.5px dashed ${C.line}`, borderRadius: 4, background: C.card }}>
                <div className="font-disp uppercase font-semibold text-lg">{t("noVehicles")}</div>
              </div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))" }}>
                {list.map((v) => {
                  const last = [...v.history].reverse().find((h) => h.date);
                  return (
                    <button
                      key={v.vin}
                      onClick={() => setView({ page: "detail", vin: v.vin })}
                      className="text-left p-4"
                      style={{ background: C.card, border: `1.5px solid ${C.line}`, borderLeft: `5px solid ${C.hazard}`, borderRadius: 4, cursor: "pointer" }}
                    >
                      <div className="font-disp uppercase font-bold" style={{ fontSize: 20, lineHeight: 1.1 }}>
                        {v.brand || t("unknown")} {v.model}
                      </div>
                      <div className="text-sm mb-2" style={{ color: C.inkSoft }}>
                        {v.year || t("unknown")} · {v.plate || t("unknown")}
                      </div>
                      <VinPlate vin={v.vin} small />
                      <div className="text-xs mt-3 font-mono2" style={{ color: C.inkSoft }}>
                        {v.history.length} {t("records")}{last ? ` · ${t("lastService")}: ${last.date}` : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-8 no-print flex gap-2">
              <Btn kind="ghost" onClick={resetToInitial} style={{ fontSize: 12, padding: "6px 12px" }}>↺ {t("resetData")}</Btn>
              <Btn kind="ghost" onClick={runDiagnostic} disabled={busy} style={{ fontSize: 12, padding: "6px 12px" }}>🔧 Диагностика ИИ-соединения</Btn>
            </div>
          </>
        ) : (
          <DetailPage
            t={t}
            lang={lang}
            vehicle={vehicles[view.vin]}
            busy={busy}
            onBack={() => setView({ page: "list", vin: null })}
            onAddEntry={(e) => addEntry(view.vin, e)}
            onDelete={() => deleteVehicle(view.vin)}
            onPhoto={() => fileRef.current?.click()}
          />
        )}
      </main>

      {/* скрытый input для фото — общий */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden no-print"
        onChange={(e) => handlePhoto(e.target.files?.[0])}
      />

      {busy && (
        <div className="no-print fixed inset-0 z-40 flex items-center justify-center" style={{ background: "rgba(23,26,29,0.55)" }}>
          <div className="bg-white px-8 py-6 text-center" style={{ borderRadius: 4, border: `2px solid ${C.hazard}` }}>
            <div className="mx-auto mb-3" style={{ width: 34, height: 34, borderRadius: "50%", border: `4px solid ${C.line}`, borderTopColor: C.hazard, animation: "spin 0.9s linear infinite" }} />
            <div className="font-disp uppercase font-semibold" style={{ letterSpacing: "0.08em" }}>{t("analyzing")}</div>
          </div>
        </div>
      )}

      {showAddVehicle && <AddVehicleModal t={t} onSave={addVehicleManual} onClose={() => setShowAddVehicle(false)} />}

      {confirm && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(23,26,29,0.55)" }} onClick={() => setConfirm(null)}>
          <div className="w-full max-w-sm p-5" style={{ background: C.card, borderRadius: 4, border: `2px solid ${C.danger}` }} onClick={(e) => e.stopPropagation()}>
            <div className="font-disp uppercase font-bold text-lg mb-2" style={{ color: C.danger }}>⚠ {t("confirmTitle")}</div>
            <div className="text-sm mb-5">{confirm.msg}</div>
            <div className="flex gap-2 justify-end">
              <Btn kind="ghost" onClick={() => setConfirm(null)}>{t("cancel")}</Btn>
              <Btn kind="danger" onClick={confirm.onYes}>{t("confirmYes")}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- detail page ---------- */
function DetailPage({ t, lang, vehicle, busy, onBack, onAddEntry, onDelete, onPhoto }) {
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ dateFrom: "", dateTo: "", type: "", costMin: "", costMax: "" });

  if (!vehicle) return null;

  const types = [...new Set(vehicle.history.map((h) => h.service_type).filter(Boolean))];

  const filtered = vehicle.history.filter((h) => {
    if (f.dateFrom && h.date && h.date < f.dateFrom) return false;
    if (f.dateTo && h.date && h.date > f.dateTo) return false;
    if (f.type && h.service_type !== f.type) return false;
    const cost = parseFloat(String(h.cost).replace(/[^\d.]/g, ""));
    if (f.costMin && !(cost >= parseFloat(f.costMin))) return false;
    if (f.costMax && !(cost <= parseFloat(f.costMax))) return false;
    return true;
  });

  const totalCost = filtered.reduce((s, h) => {
    const c = parseFloat(String(h.cost).replace(/[^\d.]/g, ""));
    return s + (isNaN(c) ? 0 : c);
  }, 0);

  const info = [["vin", vehicle.vin], ["brand", vehicle.brand], ["model", vehicle.model], ["year", vehicle.year], ["plate", vehicle.plate]];

  return (
    <div>
      <div className="no-print mb-4">
        <button onClick={onBack} className="font-disp uppercase font-semibold text-sm" style={{ color: C.inkSoft, letterSpacing: "0.08em", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          {t("back")}
        </button>
      </div>

      <section className="p-5 mb-5" style={{ background: C.card, border: `1.5px solid ${C.ink}`, borderRadius: 4 }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Label>{t("basicInfo")}</Label>
            <div className="font-disp uppercase font-bold mt-1" style={{ fontSize: 28, lineHeight: 1 }}>
              {vehicle.brand || t("unknown")} {vehicle.model} {vehicle.year && <span style={{ color: C.inkSoft }}>· {vehicle.year}</span>}
            </div>
            <div className="mt-3"><VinPlate vin={vehicle.vin} /></div>
          </div>
          <table className="text-sm">
            <tbody>
              {info.map(([k, v]) => (
                <tr key={k}>
                  <td className="pr-4 py-1"><Label>{t(k)}</Label></td>
                  <td className="font-mono2 py-1">{v || t("unknown")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="no-print flex flex-wrap gap-2 mt-4 pt-4" style={{ borderTop: `1px solid ${C.line}` }}>
          <Btn kind="dark" onClick={onPhoto} disabled={busy}>📷 {t("analyzePhoto")}</Btn>
          <Btn onClick={() => setShowForm(true)}>＋ {t("addEntry")}</Btn>
          <Btn kind="ghost" onClick={() => window.print()}>⤓ {t("exportPdf")}</Btn>
          <Btn kind="danger" onClick={onDelete}>{t("deleteVehicle")}</Btn>
        </div>
      </section>

      <section className="no-print p-4 mb-5" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 4 }}>
        <div className="mb-2"><Label>{t("filters")}</Label></div>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))" }}>
          <Input type="date" value={f.dateFrom} onChange={(e) => setF({ ...f, dateFrom: e.target.value })} />
          <Input type="date" value={f.dateTo} onChange={(e) => setF({ ...f, dateTo: e.target.value })} />
          <select
            value={f.type}
            onChange={(e) => setF({ ...f, type: e.target.value })}
            className="font-body"
            style={{ border: `1px solid ${C.line}`, borderRadius: 3, padding: "8px 10px", fontSize: 14, background: "#fff" }}
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
            <span className="font-mono2 text-sm">{t("totalCost")}: {totalCost.toLocaleString(lang === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 2 })}</span>
          )}
        </div>
        {filtered.length === 0 ? (
          <div className="p-6 text-sm text-center" style={{ background: C.card, border: `1.5px dashed ${C.line}`, borderRadius: 4, color: C.inkSoft }}>
            {vehicle.history.length === 0 ? t("noHistory") : t("noMatch")}
          </div>
        ) : (
          <div style={{ overflowX: "auto", background: C.card, border: `1.5px solid ${C.ink}`, borderRadius: 4 }}>
            <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr style={{ background: C.ink, color: "#fff" }}>
                  {["date", "type", "desc", "mileage", "cost", "comment"].map((k) => (
                    <th key={k} className="font-disp uppercase text-left px-3 py-2 font-semibold" style={{ letterSpacing: "0.08em", fontSize: 13 }}>{t(k)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...filtered].reverse().map((h, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td className="px-3 py-2 font-mono2 whitespace-nowrap">{h.date || t("unknown")}</td>
                    <td className="px-3 py-2">
                      <span style={{ background: C.hazard + "33", border: `1px solid ${C.hazard}`, borderRadius: 3, padding: "1px 7px", fontSize: 13 }}>
                        {h.service_type || t("unknown")}
                      </span>
                    </td>
                    <td className="px-3 py-2" style={{ maxWidth: 280 }}>{h.description}</td>
                    <td className="px-3 py-2 font-mono2 whitespace-nowrap">{h.mileage}</td>
                    <td className="px-3 py-2 font-mono2 whitespace-nowrap">{h.cost}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: C.inkSoft, maxWidth: 220 }}>{h.comment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && <AddEntryModal t={t} onClose={() => setShowForm(false)} onSave={async (e) => { await onAddEntry(e); setShowForm(false); }} />}
    </div>
  );
}

/* ---------- modals ---------- */
function Modal({ title, children, onClose }) {
  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(23,26,29,0.55)" }} onClick={onClose}>
      <div className="w-full max-w-md p-5" style={{ background: C.card, borderRadius: 4, border: `2px solid ${C.ink}`, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div className="font-disp uppercase font-bold text-xl mb-4">{title}</div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <div className="mb-1"><Label>{label}</Label></div>
      {children}
    </div>
  );
}

function AddVehicleModal({ t, onSave, onClose }) {
  const [v, setV] = useState({ vin: "", brand: "", model: "", year: "", plate: "" });
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  return (
    <Modal title={t("addVehicle")} onClose={onClose}>
      <Field label={t("vin") + " *"}><Input value={v.vin} onChange={set("vin")} placeholder="1HGCM82633A123456" className="font-mono2" /></Field>
      <Field label={t("brand")}><Input value={v.brand} onChange={set("brand")} /></Field>
      <Field label={t("model")}><Input value={v.model} onChange={set("model")} /></Field>
      <Field label={t("year")}><Input value={v.year} onChange={set("year")} /></Field>
      <Field label={t("plate")}><Input value={v.plate} onChange={set("plate")} /></Field>
      <div className="flex gap-2 justify-end mt-4">
        <Btn kind="ghost" onClick={onClose}>{t("cancel")}</Btn>
        <Btn onClick={() => onSave(v)} disabled={!v.vin.trim()}>{t("save")}</Btn>
      </div>
    </Modal>
  );
}

function AddEntryModal({ t, onSave, onClose }) {
  const [e, setE] = useState({
    date: new Date().toISOString().slice(0, 10),
    service_type: "", description: "", mileage: "", cost: "", comment: "",
  });
  const set = (k) => (ev) => setE({ ...e, [k]: ev.target.value });
  return (
    <Modal title={t("addEntry")} onClose={onClose}>
      <Field label={t("date")}><Input type="date" value={e.date} onChange={set("date")} /></Field>
      <Field label={t("type")}><Input value={e.service_type} onChange={set("service_type")} /></Field>
      <Field label={t("desc")}>
        <textarea
          value={e.description}
          onChange={set("description")}
          rows={3}
          className="font-body w-full"
          style={{ border: `1px solid ${C.line}`, borderRadius: 3, padding: "8px 10px", fontSize: 14 }}
        />
      </Field>
      <Field label={t("mileage")}><Input value={e.mileage} onChange={set("mileage")} className="font-mono2" /></Field>
      <Field label={t("cost")}><Input value={e.cost} onChange={set("cost")} className="font-mono2" /></Field>
      <Field label={t("comment")}><Input value={e.comment} onChange={set("comment")} /></Field>
      <div className="flex gap-2 justify-end mt-4">
        <Btn kind="ghost" onClick={onClose}>{t("cancel")}</Btn>
        <Btn onClick={() => onSave(e)}>{t("save")}</Btn>
      </div>
    </Modal>
  );
}
