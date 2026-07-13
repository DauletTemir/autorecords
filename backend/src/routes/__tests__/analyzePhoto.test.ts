import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";
import sharp from "sharp";

vi.mock("../../services/supabaseAdmin.js", () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
    },
  },
}));

vi.mock("../../services/gemini.js", () => ({
  analyzeDocumentImage: vi.fn(),
}));

const { supabaseAdmin } = await import("../../services/supabaseAdmin.js");
const { analyzeDocumentImage } = await import("../../services/gemini.js");
const { app } = await import("../../app.js");

// Truncated bytes: enough for MIME sniffing, but not a decodable image —
// used for tests that only need to pass the magic-byte check.
const tinyJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

async function makeRealJpeg(): Promise<Buffer> {
  return sharp({ create: { width: 20, height: 20, channels: 3, background: "#ffffff" } })
    .jpeg()
    .toBuffer();
}

describe("POST /api/analyze-photo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects requests without an Authorization header", async () => {
    const res = await request(app).post("/api/analyze-photo").attach("photo", tinyJpeg, "doc.jpg");
    expect(res.status).toBe(401);
  });

  it("rejects requests with an invalid token", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: "invalid" } as never,
    } as never);

    const res = await request(app)
      .post("/api/analyze-photo")
      .set("Authorization", "Bearer bad-token")
      .attach("photo", tinyJpeg, "doc.jpg");

    expect(res.status).toBe(401);
  });

  it("rejects requests with no file attached", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    } as never);

    const res = await request(app)
      .post("/api/analyze-photo")
      .set("Authorization", "Bearer good-token");

    expect(res.status).toBe(400);
  });

  it("rejects files that are not recognizable images", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    } as never);

    const res = await request(app)
      .post("/api/analyze-photo")
      .set("Authorization", "Bearer good-token")
      .attach("photo", Buffer.from("not an image"), "doc.jpg");

    expect(res.status).toBe(400);
  });

  it("returns extracted data on the happy path with a mocked Gemini client", async () => {
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    } as never);
    vi.mocked(analyzeDocumentImage).mockResolvedValue({
      vin: "1HGCM82633A123456",
      brand: "Honda",
      model: "Accord",
      year: "2018",
      plate: "",
      date: "2026-01-01",
      service_type: "Oil change",
      description: "",
      mileage: "50000",
      cost: "45.00",
      comment: "",
    });

    const res = await request(app)
      .post("/api/analyze-photo")
      .set("Authorization", "Bearer good-token")
      .field("lang", "en")
      .attach("photo", await makeRealJpeg(), "doc.jpg");

    expect(res.status).toBe(200);
    expect(res.body.vin).toBe("1HGCM82633A123456");
  });
});
