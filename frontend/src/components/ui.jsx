import { C } from "../theme";

export function Label({ children }) {
  return (
    <span className="font-display uppercase text-xs" style={{ color: C.bodyText, letterSpacing: "0.12em" }}>
      {children}
    </span>
  );
}

export function VinPlate({ vin, small }) {
  return (
    <span
      className="font-mono inline-block"
      style={{
        background: C.headingText, color: "#F8F3EC", borderRadius: 6,
        padding: small ? "2px 8px" : "4px 12px",
        fontSize: small ? 12 : 15, letterSpacing: "0.08em",
      }}
    >
      {vin}
    </span>
  );
}

export function Btn({ children, onClick, kind = "solid", disabled, style, type = "button" }) {
  const kinds = {
    solid: { background: C.accent, color: "#fff", border: `1.5px solid ${C.accent}` },
    ghost: { background: "transparent", color: C.headingText, border: `1.5px solid ${C.line}` },
    dark: { background: C.headingText, color: "#fff", border: `1.5px solid ${C.headingText}` },
    danger: { background: "transparent", color: C.danger, border: `1.5px solid ${C.danger}` },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="font-display uppercase font-semibold"
      style={{
        letterSpacing: "0.06em", fontSize: 14, padding: "9px 18px", borderRadius: 999,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        ...kinds[kind], ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Input(props) {
  return (
    <input
      {...props}
      className={"font-body " + (props.className || "")}
      style={{
        border: `1px solid ${C.line}`, borderRadius: 6, padding: "8px 10px",
        fontSize: 14, width: "100%", background: "#fff", color: C.headingText, ...props.style,
      }}
    />
  );
}

export function Field({ label, children }) {
  return (
    <div className="mb-3">
      <div className="mb-1"><Label>{label}</Label></div>
      {children}
    </div>
  );
}

export function Modal({ title, children, onClose }) {
  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(40,30,20,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-md p-5" style={{ background: C.card, borderRadius: 10, border: `2px solid ${C.headingText}`, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div className="font-display uppercase font-bold text-xl mb-4" style={{ color: C.headingText }}>{title}</div>
        {children}
      </div>
    </div>
  );
}
