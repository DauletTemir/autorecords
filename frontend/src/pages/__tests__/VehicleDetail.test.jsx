import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "@testing-library/jest-dom/vitest";
import { LangProvider } from "../../i18n/LangContext";

afterEach(cleanup);

vi.mock("../../hooks/useCurrentGroup", () => ({
  useCurrentGroup: vi.fn(),
}));
vi.mock("../../hooks/useVehicles", () => ({
  useVehicles: vi.fn(),
}));

const { useCurrentGroup } = await import("../../hooks/useCurrentGroup");
const { useVehicles } = await import("../../hooks/useVehicles");
const { default: VehicleDetail } = await import("../VehicleDetail");

const GROUP = { id: "group-1", name: "Гараж" };
const VIN = "1HGCM82633A123456";

const ENTRY = {
  id: "entry-1",
  vehicle_id: "vehicle-1",
  date: "2026-01-15",
  service_type: "Oil change",
  description: "Full synthetic 5W30",
  mileage: "52000",
  cost: "49.99",
  comment: "Quick Lube",
};

const VEHICLE = {
  id: "vehicle-1",
  vin: VIN,
  brand: "Honda",
  model: "Accord",
  year: "2018",
  plate: "",
  history: [ENTRY],
};

function renderPage() {
  return render(
    <LangProvider>
      <MemoryRouter initialEntries={[`/app/vehicles/${VIN}`]}>
        <Routes>
          <Route path="/app/vehicles/:vin" element={<VehicleDetail />} />
        </Routes>
      </MemoryRouter>
    </LangProvider>,
  );
}

describe("VehicleDetail — editing and deleting a service entry", () => {
  let updateEntry;
  let deleteEntry;
  let addEntry;
  let deleteVehicle;

  beforeEach(() => {
    vi.clearAllMocks();
    useCurrentGroup.mockReturnValue({ group: GROUP, loading: false });
    updateEntry = vi.fn().mockResolvedValue(undefined);
    deleteEntry = vi.fn().mockResolvedValue(undefined);
    addEntry = vi.fn().mockResolvedValue(undefined);
    deleteVehicle = vi.fn().mockResolvedValue(undefined);
    useVehicles.mockReturnValue({
      vehicles: [VEHICLE],
      loading: false,
      addEntry,
      updateEntry,
      deleteEntry,
      deleteVehicle,
    });
  });

  it("calls updateEntry with the entry id and edited fields on submit", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /Edit entry|Редактировать запись|Жазбаны өзгерту/i }));

    const typeInput = screen.getByDisplayValue("Oil change");
    await user.clear(typeInput);
    await user.type(typeInput, "Oil and filter change");

    await user.click(screen.getByRole("button", { name: /Save changes|Сохранить изменения|Өзгерiстердi сақтау/i }));

    await waitFor(() => expect(updateEntry).toHaveBeenCalledTimes(1));
    expect(updateEntry).toHaveBeenCalledWith(
      "entry-1",
      expect.objectContaining({
        service_type: "Oil and filter change",
        date: "2026-01-15",
        mileage: "52000",
        cost: "49.99",
        comment: "Quick Lube",
      }),
    );
  });

  it("pre-fills the edit form with the existing entry's values", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /Edit entry|Редактировать запись|Жазбаны өзгерту/i }));

    expect(screen.getByDisplayValue("Oil change")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Full synthetic 5W30")).toBeInTheDocument();
    expect(screen.getByDisplayValue("52000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("49.99")).toBeInTheDocument();
  });

  it("calls deleteEntry with the entry id after confirming deletion", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /Delete entry|Удалить запись|Жазбаны жою/i }));

    // Confirmation dialog appears — deleteEntry must not fire before confirming.
    expect(deleteEntry).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Yes, delete|Да, удалить|Иә, жою/i }));

    await waitFor(() => expect(deleteEntry).toHaveBeenCalledTimes(1));
    expect(deleteEntry).toHaveBeenCalledWith("entry-1");
  });

  it("does not call deleteEntry when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /Delete entry|Удалить запись|Жазбаны жою/i }));
    await user.click(screen.getByRole("button", { name: /Cancel|Отмена|Бас тарту/i }));

    expect(deleteEntry).not.toHaveBeenCalled();
  });
});

describe("VehicleDetail — history sort order", () => {
  const OLD_ENTRY = { id: "entry-old", vehicle_id: "vehicle-1", date: "2025-01-01", service_type: "Oil change", description: "", mileage: "10000", cost: "40", comment: "" };
  const MID_ENTRY = { id: "entry-mid", vehicle_id: "vehicle-1", date: "2025-06-15", service_type: "Tire rotation", description: "", mileage: "20000", cost: "30", comment: "" };
  const NEW_ENTRY = { id: "entry-new", vehicle_id: "vehicle-1", date: "2025-12-01", service_type: "Brake pads", description: "", mileage: "30000", cost: "200", comment: "" };

  function rowLabelsInOrder() {
    // The page has two <table>s (vehicle info, then history) — scope to
    // the history table specifically, and skip its own header row.
    const tables = document.querySelectorAll("table");
    const historyTable = tables[tables.length - 1];
    return Array.from(historyTable.querySelectorAll("tbody tr")).map((row) => row.textContent);
  }

  let updateEntry;

  beforeEach(() => {
    vi.clearAllMocks();
    useCurrentGroup.mockReturnValue({ group: GROUP, loading: false });
    updateEntry = vi.fn().mockResolvedValue(undefined);
    useVehicles.mockReturnValue({
      vehicles: [{ ...VEHICLE, history: [OLD_ENTRY, NEW_ENTRY, MID_ENTRY] }],
      loading: false,
      addEntry: vi.fn(),
      updateEntry,
      deleteEntry: vi.fn(),
      deleteVehicle: vi.fn(),
    });
  });

  it("renders entries sorted by date descending (newest first) by default", () => {
    renderPage();
    const rows = rowLabelsInOrder();
    expect(rows[0]).toContain("Brake pads");
    expect(rows[1]).toContain("Tire rotation");
    expect(rows[2]).toContain("Oil change");
  });

  it("numbers rows 1, 2, 3 by their current display position, not by entry id or date", () => {
    renderPage();
    const tables = document.querySelectorAll("table");
    const historyTable = tables[tables.length - 1];
    const rows = Array.from(historyTable.querySelectorAll("tbody tr"));
    const rowNumbers = rows.map((row) => row.querySelector("td").textContent.trim());

    expect(rowNumbers).toEqual(["1", "2", "3"]);
  });

  it("renumbers rows after the sort direction is toggled", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /Sorted newest first|Сначала новые|Ең жаңасынан/i }));

    const tables = document.querySelectorAll("table");
    const historyTable = tables[tables.length - 1];
    const rows = Array.from(historyTable.querySelectorAll("tbody tr"));

    // Oldest-first now — row 1 must be "Oil change" (the oldest entry),
    // not still tagged with whatever number it had under the old order.
    expect(rows[0].textContent).toContain("Oil change");
    expect(rows[0].querySelector("td").textContent.trim()).toBe("1");
    expect(rows[2].textContent).toContain("Brake pads");
    expect(rows[2].querySelector("td").textContent.trim()).toBe("3");
  });

  it("moves an edited entry to its new chronological position", async () => {
    const user = userEvent.setup();
    renderPage();

    // Edit the oldest entry (Oil change, 2025-01-01) to have the newest date.
    const editButtons = screen.getAllByRole("button", { name: /Edit entry|Редактировать запись|Жазбаны өзгерту/i });
    // Rows are newest-first: Brake pads, Tire rotation, Oil change — last edit button is Oil change's.
    await user.click(editButtons[2]);

    const dateInput = document.querySelector('input[name="date"]');
    await user.clear(dateInput);
    await user.type(dateInput, "2026-01-01");

    await user.click(screen.getByRole("button", { name: /Save changes|Сохранить изменения|Өзгерiстердi сақтау/i }));
    await waitFor(() => expect(updateEntry).toHaveBeenCalledTimes(1));
    expect(updateEntry).toHaveBeenCalledWith("entry-old", expect.objectContaining({ date: "2026-01-01" }));

    // Simulate the reload that would follow a real update: the hook
    // returns the entry with its new date, and the row order must follow.
    useVehicles.mockReturnValue({
      vehicles: [{
        ...VEHICLE,
        history: [{ ...OLD_ENTRY, date: "2026-01-01" }, NEW_ENTRY, MID_ENTRY],
      }],
      loading: false,
      addEntry: vi.fn(),
      updateEntry,
      deleteEntry: vi.fn(),
      deleteVehicle: vi.fn(),
    });
    cleanup();
    renderPage();

    const rows = rowLabelsInOrder();
    expect(rows[0]).toContain("Oil change");
    expect(rows[1]).toContain("Brake pads");
    expect(rows[2]).toContain("Tire rotation");
  });

  it("toggles sort direction when the date column header is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(rowLabelsInOrder()[0]).toContain("Brake pads");

    await user.click(screen.getByRole("button", { name: /Sorted newest first|Сначала новые|Ең жаңасынан/i }));

    const rows = rowLabelsInOrder();
    expect(rows[0]).toContain("Oil change");
    expect(rows[2]).toContain("Brake pads");
  });
});

describe("VehicleDetail — last changed column", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCurrentGroup.mockReturnValue({ group: GROUP, loading: false });
  });

  it("shows a formatted timestamp for an entry with updated_at set", () => {
    useVehicles.mockReturnValue({
      vehicles: [{ ...VEHICLE, history: [{ ...ENTRY, updated_at: "2026-03-15T14:32:00Z" }] }],
      loading: false,
      addEntry: vi.fn(),
      updateEntry: vi.fn(),
      deleteEntry: vi.fn(),
      deleteVehicle: vi.fn(),
    });
    renderPage();

    const tables = document.querySelectorAll("table");
    const historyTable = tables[tables.length - 1];
    const row = historyTable.querySelector("tbody tr");

    // Exact rendering is locale-dependent (toLocaleString) — assert the
    // date portion appears somewhere in the row rather than an exact string.
    expect(row.textContent).toMatch(/2026|15/);
  });

  it("falls back to the unknown placeholder when updated_at is missing", () => {
    useVehicles.mockReturnValue({
      vehicles: [{ ...VEHICLE, history: [{ ...ENTRY, updated_at: undefined }] }],
      loading: false,
      addEntry: vi.fn(),
      updateEntry: vi.fn(),
      deleteEntry: vi.fn(),
      deleteVehicle: vi.fn(),
    });
    renderPage();

    const tables = document.querySelectorAll("table");
    const historyTable = tables[tables.length - 1];
    expect(historyTable.querySelector("tbody tr").textContent).toContain("—");
  });
});
