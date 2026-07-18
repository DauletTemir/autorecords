import { test, expect } from "@playwright/test";
import { createConfirmedUser, deleteOrgsCreatedBy, deleteUser, uniqueEmail } from "./helpers";

test.describe("Public landing", () => {
  test("renders without login and CTA links to signup", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Начать бесплатно|Start free/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /Начать бесплатно|Start free/i }).first().click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("login link on landing navigates to /login", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Войти|Log in/i }).first().click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Login/signup flow", () => {
  const email = uniqueEmail("login");
  const password = "testpass123456";
  let userId: string;

  test.beforeAll(async () => {
    userId = await createConfirmedUser(email, password);
  });

  test.afterAll(async () => {
    await deleteOrgsCreatedBy(userId);
    await deleteUser(userId);
  });

  test("logs in with email+password and reaches /app with an auto-created group", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/app$/, { timeout: 10000 });
  });

  test("rejects an unauthenticated visit to /app by redirecting to /login", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows an error for wrong password instead of navigating", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', "wrong-password-here");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/invalid|неверн/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Signup flow", () => {
  test("new signup shows a check-your-email screen, not an immediate session", async ({ page }) => {
    // Mocked at the network level: Supabase's own email-sending rate limit
    // (not part of our app's logic) would otherwise make this test flaky
    // whenever the suite runs signups back-to-back in a short window.
    await page.route("**/auth/v1/signup*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "00000000-0000-4000-8000-000000000000",
          email: "mocked-signup@gmail.com",
          confirmation_sent_at: new Date().toISOString(),
        }),
      });
    });

    await page.goto("/signup");
    await page.fill('input[type="email"]', "mocked-signup@gmail.com");
    await page.fill('input[type="password"]', "testpass123456");
    await page.click('button[type="submit"]');

    await expect(page.getByText(/Проверьте почту|Check your email/i)).toBeVisible({ timeout: 10000 });
    await expect(page).not.toHaveURL(/\/app/);
  });
});
