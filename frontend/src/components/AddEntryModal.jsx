import { useState } from "react";
import { T } from "../i18n/translations";
import { C } from "../theme";
import { Btn, Field, Input, Modal } from "./ui";

const t = (k) => T.ru[k] || k;

export default function AddEntryModal({ onSave, onClose }) {
  const [e, setE] = useState({
    date: new Date().toISOString().slice(0, 10),
    service_type: "", description: "", mileage: "", cost: "", comment: "",
  });
  const set = (k) => (ev) => setE({ ...e, [k]: ev.target.value });

  return (
    <Modal title={t("addEntry")} onClose={onClose}>
      <Field label={t("date")}><Input type="date" name="date" value={e.date} onChange={set("date")} /></Field>
      <Field label={t("type")}><Input name="service_type" value={e.service_type} onChange={set("service_type")} /></Field>
      <Field label={t("desc")}>
        <textarea
          name="description"
          value={e.description}
          onChange={set("description")}
          rows={3}
          className="font-body w-full"
          style={{ border: `1px solid ${C.line}`, borderRadius: 6, padding: "8px 10px", fontSize: 14 }}
        />
      </Field>
      <Field label={t("mileage")}><Input name="mileage" value={e.mileage} onChange={set("mileage")} className="font-mono" /></Field>
      <Field label={t("cost")}><Input name="cost" value={e.cost} onChange={set("cost")} className="font-mono" /></Field>
      <Field label={t("comment")}><Input name="comment" value={e.comment} onChange={set("comment")} /></Field>
      <div className="flex gap-2 justify-end mt-4">
        <Btn kind="ghost" onClick={onClose}>{t("cancel")}</Btn>
        <Btn onClick={() => onSave(e)}>{t("save")}</Btn>
      </div>
    </Modal>
  );
}
