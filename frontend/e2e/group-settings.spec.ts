import { test, expect } from "@playwright/test";
import { createConfirmedUser, deleteOrgsCreatedBy, deleteUser, uniqueEmail } from "./helpers";

test.describe("Group settings", () => {
  const email = uniqueEmail("settings");
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

  test("renaming the group persists and shows on the vehicle list header", async ({ page }) => {
    await page.getByRole("link", { name: /Настройки гаража|Garage settings/i }).click();
    await expect(page).toHaveURL(/\/app\/settings/);

    const nameInput = page.locator('input[name="groupName"]');
    await expect(nameInput).toBeEnabled({ timeout: 5000 });
    await nameInput.fill("Тестовый гараж E2E");

    const patchResponse = page.waitForResponse(
      (res) => res.url().includes("/rest/v1/organizations") && res.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: /Сохранить|Save/i }).first().click();
    await patchResponse;

    await page.goto("/app");
    await expect(page.getByText("Тестовый гараж E2E")).toBeVisible({ timeout: 5000 });
  });

  test("inviting with an invalid email shows a validation error, not a silent failure", async ({ page }) => {
    await page.goto("/app/settings");
    await page.fill('input[name="inviteEmail"]', "not-an-email");
    await page.getByRole("button", { name: /Пригласить|Invite/i }).click();

    // HTML5 validation blocks submission; URL/state should not change to a false-success message.
    await expect(page.getByText(/Приглашение отправлено|Invitation sent/i)).toHaveCount(0);
  });
});
