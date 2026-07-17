import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../../services/supabaseAdmin.js", () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}));

vi.mock("../../services/sheetsBackup.js", () => ({
  backupOrgToSheets: vi.fn(),
}));

const { supabaseAdmin } = await import("../../services/supabaseAdmin.js");
const { backupOrgToSheets } = await import("../../services/sheetsBackup.js");
const { app } = await import("../../app.js");

const VALID_ORG_ID = "a1111111-1111-4111-8111-111111111111";

function mockMembershipQuery(result: { data: unknown; error: unknown }) {
  vi.mocked(supabaseAdmin.from).mockReturnValue({
    select: () => ({
      eq: () => ({
        eq: () => ({
          maybeSingle: async () => result,
        }),
      }),
    }),
  } as never);
}

describe("POST /api/backup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects requests without a valid token", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: "invalid" } as never,
    } as never);

    const res = await request(app)
      .post("/api/backup")
      .set("Authorization", "Bearer bad-token")
      .send({ orgId: VALID_ORG_ID });

    expect(res.status).toBe(401);
  });

  it("rejects a missing or malformed orgId", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    } as never);

    const res = await request(app)
      .post("/api/backup")
      .set("Authorization", "Bearer good-token")
      .send({ orgId: "not-a-uuid" });

    expect(res.status).toBe(400);
  });

  it("returns 403 when the caller is not a member of the group", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    } as never);
    mockMembershipQuery({ data: null, error: null });

    const res = await request(app)
      .post("/api/backup")
      .set("Authorization", "Bearer good-token")
      .send({ orgId: VALID_ORG_ID });

    expect(res.status).toBe(403);
    expect(backupOrgToSheets).not.toHaveBeenCalled();
  });

  it("returns skipped:true when backup is not configured for this org", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    } as never);
    mockMembershipQuery({ data: { user_id: "user-1" }, error: null });
    vi.mocked(backupOrgToSheets).mockResolvedValue({ skipped: true });

    const res = await request(app)
      .post("/api/backup")
      .set("Authorization", "Bearer good-token")
      .send({ orgId: VALID_ORG_ID });

    expect(res.status).toBe(200);
    expect(res.body.skipped).toBe(true);
  });

  it("performs the backup when the caller is a member and it's configured", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    } as never);
    mockMembershipQuery({ data: { user_id: "user-1" }, error: null });
    vi.mocked(backupOrgToSheets).mockResolvedValue({ skipped: false });

    const res = await request(app)
      .post("/api/backup")
      .set("Authorization", "Bearer good-token")
      .send({ orgId: VALID_ORG_ID });

    expect(res.status).toBe(200);
    expect(res.body.skipped).toBe(false);
    expect(backupOrgToSheets).toHaveBeenCalledWith(VALID_ORG_ID);
  });

  it("returns 502 with details when the Sheets API call fails", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    } as never);
    mockMembershipQuery({ data: { user_id: "user-1" }, error: null });
    vi.mocked(backupOrgToSheets).mockRejectedValue(new Error("Google Sheets API has not been used"));

    const res = await request(app)
      .post("/api/backup")
      .set("Authorization", "Bearer good-token")
      .send({ orgId: VALID_ORG_ID });

    expect(res.status).toBe(502);
    expect(res.body.detail).toMatch(/Google Sheets API/);
  });
});
