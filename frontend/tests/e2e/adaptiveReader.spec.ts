import { test, expect } from "@playwright/test";

// E2E: Full calibration → upload PDF → gaze anomaly → intervention
// These tests require a running dev server (npm run dev) + backend (uvicorn)
// Run with: npx playwright test

test.describe("Adaptive Reader Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo");
  });

  test("shows PDF uploader on initial load", async ({ page }) => {
    await expect(page.getByText("Seret PDF ke sini")).toBeVisible();
  });

  test("shows calibration screen after PDF upload", async ({ page }) => {
    // TODO: mock /api/pdf/extract to return fixture pages
    // then verify CalibrationScreen renders
    test.skip(); // implement after MSW setup
  });

  test("word popup appears on simulated long fixation", async ({ page }) => {
    // TODO: inject mock gaze stream, verify WordPopup renders
    test.skip();
  });
});
