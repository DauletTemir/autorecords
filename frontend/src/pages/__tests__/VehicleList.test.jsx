import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom/vitest";
import { LangProvider } from "../../i18n/LangContext";

afterEach(cleanup);

vi.mock("../../hooks/useCurrentGroup", () => ({
  useCurrentGroup: vi.fn(),
}));
vi.mock("../../hooks/useVehicles", () => ({
  useVehicles: vi.fn(),
}));
vi.mock("../../lib/api", () => ({
  analyzePhoto: vi.fn(),
  triggerBackup: vi.fn(),
}));

const { useCurrentGroup } = await import("../../hooks/useCurrentGroup");
const { useVehicles } = await import("../../hooks/useVehicles");
const { analyzePhoto } = await import("../../lib/api");
const { default: VehicleList } = await import("../VehicleList");

const GROUP = { id: "group-1", name: "Гараж" };

function renderPage() {
  return render(
    <LangProvider>
      <MemoryRouter>
        <VehicleList />
      </MemoryRouter>
    </LangProvider>,
  );
}

async function uploadPhoto() {
  const file = new File(["fake-bytes"], "invoice.jpg", { type: "image/jpeg" });
  const input = document.querySelector('input[type="file"]');
  await userEvent.upload(input, file);
}

describe("VehicleList — photo upload writes a service entry", () => {
  let addVehicle;
  let addEntry;

  beforeEach(() => {
    vi.clearAllMocks();
    useCurrentGroup.mockReturnValue({ group: GROUP, loading: false });
    addVehicle = vi.fn();
    addEntry = vi.fn().mockResolvedValue(undefined);
  });

  it("inserts a service_entries row for an existing vehicle using the extracted fields", async () => {
    const existingVehicle = { id: "vehicle-1", vin: "1HGCM82633A123456", brand: "Honda", model: "Accord", year: "2018", plate: "", history: [] };
    useVehicles.mockReturnValue({
      vehicles: [existingVehicle],
      loading: false,
      addVehicle,
      addEntry,
    });
    analyzePhoto.mockResolvedValue({
      vin: "1HGCM82633A123456",
      brand: "Honda",
      model: "Accord",
      year: "2018",
      plate: "",
      date: "2026-01-15",
      service_type: "Oil change",
      description: "Full synthetic 5W30",
      mileage: "52000",
      cost: "49.99",
      comment: "Quick Lube",
    });

    renderPage();
    await uploadPhoto();

    await waitFor(() => expect(addEntry).toHaveBeenCalledTimes(1));

    // The vehicle already exists — no new vehicle should be created.
    expect(addVehicle).not.toHaveBeenCalled();

    // The bug: handlePhoto used to stop after resolving the vehicle and
    // never called addEntry at all, so no service_entries row was ever
    // written despite the toast claiming otherwise.
    expect(addEntry).toHaveBeenCalledWith("vehicle-1", {
      date: "2026-01-15",
      service_type: "Oil change",
      description: "Full synthetic 5W30",
      mileage: "52000",
      cost: "49.99",
      comment: "Quick Lube",
    });

    expect(await screen.findByText(/Oil change/)).toBeInTheDocument();

    // Regression: handlePhoto used to hardcode "ru" instead of the app's
    // active language.
    expect(analyzePhoto).toHaveBeenCalledWith(expect.anything(), "ru", ["1HGCM82633A123456"]);
  });

  it("creates the vehicle first, then inserts the entry against the new vehicle's id", async () => {
    useVehicles.mockReturnValue({
      vehicles: [],
      loading: false,
      addVehicle,
      addEntry,
    });
    addVehicle.mockResolvedValue({ id: "vehicle-new", vin: "1HGCM82633A999999" });
    analyzePhoto.mockResolvedValue({
      vin: "1HGCM82633A999999",
      brand: "Kia",
      model: "Sportage",
      year: "2019",
      plate: "",
      date: "2026-02-01",
      service_type: "Brake replacement",
      description: "Front pads and rotors",
      mileage: "78000",
      cost: "310.00",
      comment: "",
    });

    renderPage();
    await uploadPhoto();

    await waitFor(() => expect(addVehicle).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(addEntry).toHaveBeenCalledTimes(1));

    expect(addEntry).toHaveBeenCalledWith("vehicle-new", expect.objectContaining({
      service_type: "Brake replacement",
      date: "2026-02-01",
      mileage: "78000",
      cost: "310.00",
    }));

    expect(await screen.findByText(/Brake replacement/)).toBeInTheDocument();
  });
});

describe("VehicleList — photo upload error handling", () => {
  let addVehicle;
  let addEntry;

  beforeEach(() => {
    vi.clearAllMocks();
    useCurrentGroup.mockReturnValue({ group: GROUP, loading: false });
    addVehicle = vi.fn();
    addEntry = vi.fn().mockResolvedValue(undefined);
    useVehicles.mockReturnValue({ vehicles: [], loading: false, addVehicle, addEntry });
  });

  it("shows the quota-exceeded translation, not the raw error, when the backend reports quota_exceeded", async () => {
    analyzePhoto.mockRejectedValue(new Error("quota_exceeded"));

    renderPage();
    await uploadPhoto();

    expect(await screen.findByText(/достигнут дневной лимит/i)).toBeInTheDocument();

    // Regression: the raw backend error code/message must never leak into
    // the toast shown to the user.
    expect(screen.queryByText(/quota_exceeded/)).not.toBeInTheDocument();
    expect(screen.queryByText(/RESOURCE_EXHAUSTED/)).not.toBeInTheDocument();

    expect(addVehicle).not.toHaveBeenCalled();
    expect(addEntry).not.toHaveBeenCalled();
  });

  it("shows the service-unavailable translation when Gemini is temporarily overloaded", async () => {
    analyzePhoto.mockRejectedValue(new Error("service_unavailable"));

    renderPage();
    await uploadPhoto();

    expect(await screen.findByText(/временно перегружен/i)).toBeInTheDocument();
    expect(screen.queryByText(/service_unavailable/)).not.toBeInTheDocument();
    expect(screen.queryByText(/достигнут дневной лимит/i)).not.toBeInTheDocument();

    expect(addVehicle).not.toHaveBeenCalled();
    expect(addEntry).not.toHaveBeenCalled();
  });

  it("falls back to the generic aiError translation for any other failure", async () => {
    analyzePhoto.mockRejectedValue(new Error("ai_analysis_failed"));

    renderPage();
    await uploadPhoto();

    expect(await screen.findByText(/Не удалось распознать изображение/i)).toBeInTheDocument();
    expect(screen.queryByText(/достигнут дневной лимит/i)).not.toBeInTheDocument();
  });
});
