import { describe, expect, it, vi, beforeEach } from "vitest";

describe("backupOrgToSheets when unconfigured", () => {
  it("returns skipped:true when Google credentials are not set", async () => {
    const { backupOrgToSheets } = await import("../sheetsBackup.js");
    const result = await backupOrgToSheets("11111111-1111-1111-1111-111111111111");
    expect(result).toEqual({ skipped: true });
  });
});

describe("backupOrgToSheets when configured", () => {
  const TARGET_ORG = "22222222-2222-2222-2222-222222222222";
  const OTHER_ORG = "33333333-3333-3333-3333-333333333333";

  const updateMock = vi.fn().mockResolvedValue({});
  const clearMock = vi.fn().mockResolvedValue({});
  const getMock = vi.fn().mockResolvedValue({ data: { sheets: [{ properties: { title: "Vehicles" } }, { properties: { title: "ServiceEntries" } }] } });
  const batchUpdateMock = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    vi.resetModules();
    updateMock.mockClear();
    clearMock.mockClear();
    getMock.mockClear();
    batchUpdateMock.mockClear();

    vi.doMock("../../config/env.js", () => ({
      env: {
        GOOGLE_SERVICE_ACCOUNT_EMAIL: "test@test.iam.gserviceaccount.com",
        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: "fake-key",
        BACKUP_SPREADSHEET_ID: "fake-spreadsheet-id",
        BACKUP_ORG_ID: TARGET_ORG,
      },
    }));

    vi.doMock("googleapis", () => ({
      google: {
        auth: { JWT: vi.fn() },
        sheets: () => ({
          spreadsheets: {
            get: getMock,
            batchUpdate: batchUpdateMock,
            values: { update: updateMock, clear: clearMock },
          },
        }),
      },
    }));

    vi.doMock("../supabaseAdmin.js", () => ({
      supabaseAdmin: {
        from: vi.fn((table: string) => ({
          select: () => ({
            eq: () => ({
              order: async () => {
                if (table === "vehicles") {
                  return {
                    data: [{ vin: "VIN123", brand: "Kia", model: "Sportage", year: "2019", plate: "", created_at: "2026-01-01" }],
                    error: null,
                  };
                }
                return { data: [], error: null };
              },
            }),
          }),
        })),
      },
    }));
  });

  it("skips silently when the requested org doesn't match BACKUP_ORG_ID", async () => {
    const { backupOrgToSheets } = await import("../sheetsBackup.js");
    const result = await backupOrgToSheets(OTHER_ORG);
    expect(result).toEqual({ skipped: true });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("writes vehicle and entry rows when the org matches", async () => {
    const { backupOrgToSheets } = await import("../sheetsBackup.js");
    const result = await backupOrgToSheets(TARGET_ORG);
    expect(result).toEqual({ skipped: false });
    expect(clearMock).toHaveBeenCalledTimes(2);
    expect(updateMock).toHaveBeenCalledTimes(2);
    const vehiclesCall = updateMock.mock.calls.find((c) => c[0].range === "Vehicles!A1");
    expect(vehiclesCall[0].requestBody.values[1]).toEqual(["VIN123", "Kia", "Sportage", "2019", "", "2026-01-01"]);
  });

  it("creates missing sheet tabs before writing", async () => {
    getMock.mockResolvedValueOnce({ data: { sheets: [] } });
    const { backupOrgToSheets } = await import("../sheetsBackup.js");
    await backupOrgToSheets(TARGET_ORG);
    expect(batchUpdateMock).toHaveBeenCalledTimes(1);
    const requests = batchUpdateMock.mock.calls[0][0].requestBody.requests;
    expect(requests.map((r: { addSheet: { properties: { title: string } } }) => r.addSheet.properties.title)).toEqual(["Vehicles", "ServiceEntries"]);
  });
});
