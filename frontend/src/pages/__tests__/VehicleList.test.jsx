import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom/vitest";

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
    <MemoryRouter>
      <VehicleList />
    </MemoryRouter>,
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
