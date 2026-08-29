import { describe, expect, it, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { LangProvider, useLang } from "../LangContext";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const STORAGE_KEY = "autorecords-lang";

function Probe() {
  const { lang, setLang, t } = useLang();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="label">{t("login")}</span>
      <button onClick={() => setLang("kk")}>to-kk</button>
      <button onClick={() => setLang("en")}>to-en</button>
      <button onClick={() => setLang("not-a-real-lang")}>to-invalid</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <LangProvider>
      <Probe />
    </LangProvider>,
  );
}

describe("LangContext", () => {
  it("defaults to ru when nothing is stored", () => {
    renderProbe();
    expect(screen.getByTestId("lang")).toHaveTextContent("ru");
  });

  it("switches language and re-renders translated text", () => {
    renderProbe();
    expect(screen.getByTestId("label")).toHaveTextContent("Войти");

    fireEvent.click(screen.getByText("to-en"));
    expect(screen.getByTestId("lang")).toHaveTextContent("en");
    expect(screen.getByTestId("label")).toHaveTextContent("Log in");

    fireEvent.click(screen.getByText("to-kk"));
    expect(screen.getByTestId("lang")).toHaveTextContent("kk");
    expect(screen.getByTestId("label")).toHaveTextContent("Кiру");
  });

  it("persists the chosen language to localStorage", () => {
    renderProbe();
    fireEvent.click(screen.getByText("to-kk"));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("kk");
  });

  it("restores the persisted language on next mount", () => {
    window.localStorage.setItem(STORAGE_KEY, "en");
    renderProbe();
    expect(screen.getByTestId("lang")).toHaveTextContent("en");
  });

  it("ignores an unsupported stored value and falls back to the default", () => {
    window.localStorage.setItem(STORAGE_KEY, "fr");
    renderProbe();
    expect(screen.getByTestId("lang")).toHaveTextContent("ru");
  });

  it("ignores setLang calls with an unsupported language", () => {
    renderProbe();
    fireEvent.click(screen.getByText("to-invalid"));
    expect(screen.getByTestId("lang")).toHaveTextContent("ru");
  });

  it("throws when useLang is used outside a LangProvider", () => {
    // Suppress the expected React error boundary console noise for this case.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow("useLang must be used within a LangProvider");
    spy.mockRestore();
  });
});
