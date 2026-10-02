import { test, expect } from "@playwright/test";
test("portfolio, filters, inspector, details and CRUD", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".site-card")).toHaveCount(6);
  await expect(page.locator(".preview img")).toHaveCount(6);
  expect(
    await page
      .locator(".preview img")
      .evaluateAll((imgs) =>
        imgs.every((i) => (i as HTMLImageElement).naturalWidth > 0),
      ),
  ).toBe(true);
  await page.getByRole("button", { name: "7D", exact: true }).click();
  await page.getByRole("button", { name: "Tier 1", exact: true }).click();
  await expect(page.locator(".site-card")).toHaveCount(1);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.locator(".site-card").filter({ hasText: "Esports Daily" }).click();
  await expect(page.locator(".inspector h3")).toHaveText("Esports Daily");
  await page.getByRole("link", { name: "Open website workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Esports Daily", exact: true, level: 1 }),
  ).toBeVisible();
  await page.goto("/sites");
  await page.getByRole("button", { name: "Add website", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Test website");
  await page.getByLabel("Website URL").fill("https://test.example");
  await page.getByLabel("Niche", { exact: true }).last().fill("Tech");
  await page.getByRole("button", { name: "Save website" }).click();
  await expect(page.locator(".site-card")).toHaveCount(7);
  await page.locator(".site-card").filter({ hasText: "Test website" }).click();
  await page.getByRole("button", { name: "Edit site", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Updated website");
  await page.getByRole("button", { name: "Save website" }).click();
  await expect(
    page.locator(".site-card").filter({ hasText: "Updated website" }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Edit site", exact: true }).click();
  await page.getByRole("button", { name: "Archive website" }).click();
  await expect(page.locator(".site-card")).toHaveCount(6);
  expect(errors).toEqual([]);
});
test("navigation, command search, routes and mobile inspector", async ({
  page,
}) => {
  for (const route of [
    "content",
    "keywords",
    "backlinks",
    "performance",
    "seo-health",
    "alerts",
    "reports",
    "settings",
    "login",
  ]) {
    const response = await page.goto("/" + route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).not.toContainText(
      "Could not load your workspace",
    );
  }
  await page.goto("/", { waitUntil: "networkidle" });
  await page.keyboard.press("Control+k");
  await expect(
    page.getByRole("dialog", { name: "Global search" }),
  ).toBeVisible();
  await page
    .getByPlaceholder("Search websites, keywords, alerts…")
    .fill("Hardware");
  await page.getByRole("link", { name: /Hardware Arena/ }).click();
  await expect(page).toHaveURL(/sites\/demo-6/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.locator(".site-card").first().click();
  await expect(page.locator(".inspector")).toBeVisible();
  await page.getByRole("button", { name: "Close inspector" }).click();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.locator(".sidebar")).toBeVisible();
});
test("health and demo write restrictions", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect((await health.json()).mode).toBe("demo");
  expect(
    (await request.post("/api/sites", { data: { name: "Attempt" } })).status(),
  ).toBe(403);
  expect((await request.get("/not-a-real-route")).status()).toBe(404);
});
