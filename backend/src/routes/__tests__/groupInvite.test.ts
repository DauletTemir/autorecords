import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../../services/supabaseAdmin.js", () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
      admin: { inviteUserByEmail: vi.fn() },
    },
    from: vi.fn(),
  },
}));

const { supabaseAdmin } = await import("../../services/supabaseAdmin.js");
const { app } = await import("../../app.js");

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

describe("POST /api/groups/:id/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects requests without a valid token", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: "invalid" } as never,
    } as never);

    const res = await request(app)
      .post("/api/groups/group-1/invite")
      .set("Authorization", "Bearer bad-token")
      .send({ email: "friend@example.com" });

    expect(res.status).toBe(401);
  });

  it("rejects an invalid email payload", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    } as never);

    const res = await request(app)
      .post("/api/groups/group-1/invite")
      .set("Authorization", "Bearer good-token")
      .send({ email: "not-an-email" });

    expect(res.status).toBe(400);
  });

  it("returns 403 when the caller is not a member of the group", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    } as never);
    mockMembershipQuery({ data: null, error: null });

    const res = await request(app)
      .post("/api/groups/group-1/invite")
      .set("Authorization", "Bearer good-token")
      .send({ email: "friend@example.com" });

    expect(res.status).toBe(403);
  });

  it("sends an invite when the caller is a member", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    } as never);
    mockMembershipQuery({ data: { user_id: "user-1" }, error: null });
    vi.mocked(supabaseAdmin.auth.admin.inviteUserByEmail).mockResolvedValue({
      data: {} as never,
      error: null,
    } as never);

    const res = await request(app)
      .post("/api/groups/group-1/invite")
      .set("Authorization", "Bearer good-token")
      .send({ email: "friend@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
