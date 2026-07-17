import { defineConfig } from "@playwright/test";
import "dotenv/config";
import { config } from "dotenv";

config({ path: ".env.e2e" });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
  },
});
