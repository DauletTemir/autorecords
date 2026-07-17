import { test, expect } from "@playwright/test";
import { createConfirmedUser, deleteOrgsCreatedBy, deleteUser, uniqueEmail } from "./helpers";

test.describe("Vehicle and service entry CRUD", () => {
  const email = uniqueEmail("crud");
  const password = "testpass123456";
  let userId: string;

  test.beforeAll(async () => {
    userId = await createConfirmedUser(email, password);
  });

  test.afterAll(async () => {
    await deleteOrgsCreatedBy(userId);
    await deleteUser(userId);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/app$/, { timeout: 10000 });
  });

  test("adding a vehicle manually shows it in the list", async ({ page }) => {
    await page.getByRole("button", { name: /Добавить автомобиль|Add vehicle/i }).click();
    await page.fill('input[name="vin"]', "1HGCM82633ACRUD01");
    await page.fill('input[name="brand"]', "Toyota");
    await page.getByRole("button", { name: /Сохранить|Save/i }).click();

    await expect(page.getByText("1HGCM82633ACRUD01")).toBeVisible({ timeout: 5000 });
  });

  test("opening a vehicle and adding a service entry shows it in history", async ({ page }) => {
    await page.getByText("1HGCM82633ACRUD01").click();
    await expect(page).toHaveURL(/\/app\/vehicles\//);

    await page.getByRole("button", { name: /Добавить запись|Add entry/i }).click();
    await page.fill('input[name="service_type"]', "Oil change");
    await page.getByRole("button", { name: /Сохранить|Save/i }).click();

    await expect(page.locator("table").getByText("Oil change")).toBeVisible({ timeout: 5000 });
  });

  test("filters narrow the visible history by service type", async ({ page }) => {
    await page.getByText("1HGCM82633ACRUD01").click();
    await expect(page).toHaveURL(/\/app\/vehicles\//);

    const typeSelect = page.locator("select").first();
    await typeSelect.selectOption("Oil change");

    await expect(page.locator("table").getByText("Oil change")).toBeVisible();
  });

  test("deleting a vehicle removes it from the list", async ({ page }) => {
    await page.getByText("1HGCM82633ACRUD01").click();
    await expect(page).toHaveURL(/\/app\/vehicles\//);

    await page.getByRole("button", { name: /Удалить автомобиль|Delete vehicle/i }).click();
    await page.getByRole("button", { name: /Да, удалить|Yes, delete/i }).click();

    await expect(page).toHaveURL(/\/app$/, { timeout: 5000 });
    await expect(page.getByText("1HGCM82633ACRUD01")).toHaveCount(0);
  });
});
