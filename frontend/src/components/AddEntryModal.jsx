import { useState } from "react";
import { useLang } from "../i18n/LangContext";
import { C } from "../theme";
import { Btn, Field, Input, Modal } from "./ui";

const EMPTY_ENTRY = {
  date: new Date().toISOString().slice(0, 10),
  service_type: "", description: "", mileage: "", cost: "", comment: "",
};

export default function AddEntryModal({ onSave, onClose, existingEntry }) {
  const { t } = useLang();
  const isEditing = Boolean(existingEntry);
  const [e, setE] = useState(() =>
    isEditing
      ? {
          date: existingEntry.date ?? "",
          service_type: existingEntry.service_type ?? "",
          description: existingEntry.description ?? "",
          mileage: existingEntry.mileage ?? "",
          cost: existingEntry.cost ?? "",
          comment: existingEntry.comment ?? "",
        }
      : EMPTY_ENTRY,
  );
  const set = (k) => (ev) => setE({ ...e, [k]: ev.target.value });

  return (
    <Modal title={isEditing ? t("editEntry") : t("addEntry")} onClose={onClose}>
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
        <Btn onClick={() => onSave(e)}>{isEditing ? t("saveChanges") : t("save")}</Btn>
      </div>
    </Modal>
  );
}
