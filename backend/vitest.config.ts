import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      PORT: "3001",
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      GEMINI_API_KEY: "test-gemini-key",
      FRONTEND_ORIGIN: "http://localhost:5173",
    },
  },
});
