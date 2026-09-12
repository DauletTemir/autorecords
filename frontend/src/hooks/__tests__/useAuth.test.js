import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const LAST_ACTIVE_KEY = "autorecords-last-active";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const FAKE_SESSION = { user: { id: "user-1" }, access_token: "fake-token" };

const getSessionMock = vi.fn();
const signOutMock = vi.fn().mockResolvedValue({ error: null });
const onAuthStateChangeMock = vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }));

vi.mock("../../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      signOut: signOutMock,
      onAuthStateChange: onAuthStateChangeMock,
    },
  },
}));

const { useAuth } = await import("../useAuth");

describe("useAuth — inactivity timeout", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps an active session when the user was active within the last 7 days", async () => {
    localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now() - 1 * 24 * 60 * 60 * 1000)); // 1 day ago
    getSessionMock.mockResolvedValue({ data: { session: FAKE_SESSION } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(FAKE_SESSION.user);
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("signs out a session that's been inactive for more than 7 days", async () => {
    localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now() - (SEVEN_DAYS_MS + 60_000))); // just over 7 days ago
    getSessionMock.mockResolvedValue({ data: { session: FAKE_SESSION } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
  });

  it("does not sign out a brand-new session with no prior activity recorded", async () => {
    // First-ever login on this browser — nothing in localStorage yet.
    getSessionMock.mockResolvedValue({ data: { session: FAKE_SESSION } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(signOutMock).not.toHaveBeenCalled();
    expect(result.current.user).toEqual(FAKE_SESSION.user);
  });

  it("records activity on load so the clock resets from a real visit", async () => {
    localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now() - 1 * 24 * 60 * 60 * 1000));
    getSessionMock.mockResolvedValue({ data: { session: FAKE_SESSION } });

    renderHook(() => useAuth());

    await waitFor(() => {
      const stored = Number(localStorage.getItem(LAST_ACTIVE_KEY));
      expect(Date.now() - stored).toBeLessThan(5000);
    });
  });

  it("does not touch the activity timestamp when there is no session at all", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(localStorage.getItem(LAST_ACTIVE_KEY)).toBeNull();
  });

  it("resets the activity timestamp on real user interaction (pointerdown)", async () => {
    const staleTimestamp = Date.now() - 1 * 24 * 60 * 60 * 1000;
    localStorage.setItem(LAST_ACTIVE_KEY, String(staleTimestamp));
    getSessionMock.mockResolvedValue({ data: { session: FAKE_SESSION } });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      window.dispatchEvent(new Event("pointerdown"));
    });

    const stored = Number(localStorage.getItem(LAST_ACTIVE_KEY));
    expect(stored).toBeGreaterThan(staleTimestamp);
  });
});
