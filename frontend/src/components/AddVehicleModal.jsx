import { useState } from "react";
import { T } from "../i18n/translations";
import { Btn, Field, Input, Modal } from "./ui";

const t = (k) => T.ru[k] || k;

export default function AddVehicleModal({ onSave, onClose }) {
  const [v, setV] = useState({ vin: "", brand: "", model: "", year: "", plate: "" });
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  return (
    <Modal title={t("addVehicle")} onClose={onClose}>
      <Field label={t("vin") + " *"}><Input name="vin" value={v.vin} onChange={set("vin")} placeholder="1HGCM82633A123456" className="font-mono" /></Field>
      <Field label={t("brand")}><Input name="brand" value={v.brand} onChange={set("brand")} /></Field>
      <Field label={t("model")}><Input name="model" value={v.model} onChange={set("model")} /></Field>
      <Field label={t("year")}><Input name="year" value={v.year} onChange={set("year")} /></Field>
      <Field label={t("plate")}><Input name="plate" value={v.plate} onChange={set("plate")} /></Field>
      <div className="flex gap-2 justify-end mt-4">
        <Btn kind="ghost" onClick={onClose}>{t("cancel")}</Btn>
        <Btn onClick={() => onSave(v)} disabled={!v.vin.trim()}>{t("save")}</Btn>
      </div>
    </Modal>
  );
}
