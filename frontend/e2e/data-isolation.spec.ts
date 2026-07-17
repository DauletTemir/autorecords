import { test, expect } from "@playwright/test";
import { createConfirmedUser, deleteOrgsCreatedBy, deleteUser, uniqueEmail } from "./helpers";

test.describe("Cross-group data isolation", () => {
  const emailA = uniqueEmail("iso-a");
  const emailB = uniqueEmail("iso-b");
  const password = "testpass123456";
  let userIdA: string;
  let userIdB: string;

  test.beforeAll(async () => {
    userIdA = await createConfirmedUser(emailA, password);
    userIdB = await createConfirmedUser(emailB, password);
  });

  test.afterAll(async () => {
    await deleteOrgsCreatedBy(userIdA);
    await deleteOrgsCreatedBy(userIdB);
    await deleteUser(userIdA);
    await deleteUser(userIdB);
  });

  test("a user in one group never sees another group's vehicles", async ({ browser }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await pageA.goto("/login");
    await pageA.fill('input[type="email"]', emailA);
    await pageA.fill('input[type="password"]', password);
    await pageA.click('button[type="submit"]');
    await expect(pageA).toHaveURL(/\/app$/, { timeout: 10000 });

    await pageA.getByRole("button", { name: /Добавить автомобиль|Add vehicle/i }).click();
    await pageA.fill('input[placeholder="1HGCM82633A123456"]', "1HGCM82633AISOA01");
    await pageA.getByRole("button", { name: /Сохранить|Save/i }).click();
    await expect(pageA.getByText("1HGCM82633AISOA01")).toBeVisible({ timeout: 5000 });
    await contextA.close();

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await pageB.goto("/login");
    await pageB.fill('input[type="email"]', emailB);
    await pageB.fill('input[type="password"]', password);
    await pageB.click('button[type="submit"]');
    await expect(pageB).toHaveURL(/\/app$/, { timeout: 10000 });

    await expect(pageB.getByText("1HGCM82633AISOA01")).toHaveCount(0);
    await contextB.close();
  });
});
