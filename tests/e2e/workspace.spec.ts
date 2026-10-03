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
test("editorial workflow, keyword filters and alert resolution", async ({
  page,
  request,
}) => {
  await page.goto("/content", { waitUntil: "networkidle" });
  await expect(page.locator(".content-card")).toHaveCount(3);
  await page.getByRole("button", { name: "+ New item" }).click();
  await page
    .getByRole("dialog", { name: "New content item" })
    .getByLabel("Topic")
    .fill("An original field guide to performance");
  await page
    .getByRole("dialog", { name: "New content item" })
    .getByLabel("Primary keyword")
    .fill("performance field guide");
  await page
    .getByRole("dialog", { name: "New content item" })
    .getByRole("button", { name: "Save item" })
    .click();
  await expect(page.locator(".content-card")).toHaveCount(4);
  await page
    .locator(".content-card")
    .filter({ hasText: "An original field guide" })
    .click();
  await page
    .getByRole("dialog", { name: "Edit content item" })
    .getByLabel("State")
    .selectOption("Review");
  await page
    .getByRole("dialog", { name: "Edit content item" })
    .getByRole("button", { name: "Save item" })
    .click();
  await expect(
    page
      .locator(".kanban>div")
      .filter({ has: page.getByRole("heading", { name: /Review/ }) })
      .locator(".content-card"),
  ).toHaveCount(2);
  await page.goto("/keywords", { waitUntil: "networkidle" });
  await page
    .getByRole("combobox", { name: "Keyword site" })
    .selectOption("demo-1");
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page
    .getByRole("combobox", { name: "Keyword movement" })
    .selectOption("down");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.goto("/alerts", { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "Resolve", exact: true })
    .first()
    .click();
  await expect(page.locator(".alert-row .badge").first()).toHaveText(
    "resolved",
  );
  await page.goto("/reports", { waitUntil: "networkidle" });
  await page.getByRole("combobox", { name: "Report range" }).selectOption("Custom");
  await page.getByLabel("Report start date").fill("2026-09-01");
  await page.getByLabel("Report end date").fill("2026-10-01");
  await expect(page.getByText("2026-09-01 – 2026-10-01")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export summary JSON" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("index-network-summary.json");
  expect(
    (
      await request.patch("/api/alerts/a1", { data: { status: "resolved" } })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/content", { data: { topic: "Attempt" } })
    ).status(),
  ).toBe(403);
});
