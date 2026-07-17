import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createConfirmedUser, deleteOrgsCreatedBy, deleteUser, uniqueEmail } from "./helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe("PDF export", () => {
  const email = uniqueEmail("pdf");
  const password = "testpass123456";
  let userId: string;

  test.beforeAll(async () => {
    userId = await createConfirmedUser(email, password);
  });

  test.afterAll(async () => {
    await deleteOrgsCreatedBy(userId);
    await deleteUser(userId);
  });

  test("clicking export calls window.print without a real print dialog", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/app$/, { timeout: 10000 });

    await page.getByRole("button", { name: /Добавить автомобиль|Add vehicle/i }).click();
    await page.fill('input[placeholder="1HGCM82633A123456"]', "1HGCM82633APDF001");
    await page.getByRole("button", { name: /Сохранить|Save/i }).click();
    await page.getByText("1HGCM82633APDF001").click();

    let printCalled = false;
    await page.exposeFunction("__markPrintCalled", () => {
      printCalled = true;
    });
    await page.evaluate(() => {
      window.print = () => (window as unknown as { __markPrintCalled: () => void }).__markPrintCalled();
    });

    await page.getByRole("button", { name: /Экспорт PDF|Print to PDF/i }).click();
    await page.waitForTimeout(300);
    expect(printCalled).toBe(true);
  });
});

test.describe("AI photo analysis", () => {
  const email = uniqueEmail("photo");
  const password = "testpass123456";
  let userId: string;

  test.beforeAll(async () => {
    userId = await createConfirmedUser(email, password);
  });

  test.afterAll(async () => {
    await deleteOrgsCreatedBy(userId);
    await deleteUser(userId);
  });

  test("uploading a photo creates a vehicle from the mocked backend response", async ({ page }) => {
    await page.route("**/api/analyze-photo", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          vin: "1HGCM82633APHOTO1",
          brand: "Honda",
          model: "Civic",
          year: "2020",
          plate: "",
          date: "2026-01-01",
          service_type: "Oil change",
          description: "Mocked extraction",
          mileage: "10000",
          cost: "50.00",
          comment: "",
        }),
      });
    });

    await page.goto("/login");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/app$/, { timeout: 10000 });

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, "fixtures", "sample-document.jpg"));

    await expect(page.getByText("1HGCM82633APHOTO1")).toBeVisible({ timeout: 10000 });
  });
});
