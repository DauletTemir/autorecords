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
