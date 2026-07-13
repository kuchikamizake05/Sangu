import { expect, test } from "@playwright/test";

test("recipient completes OTP-gated cash claim on mobile", async ({ page }) => {
  await page.route("**/api/claim/demo-token", async (route) => route.fulfill({ json: { senderName: "Andi", amountIdr: "1720000", corridor: "MY", status: "PENDING" } }));
  await page.route("**/api/claim/demo-token/otp/request", async (route) => route.fulfill({ json: { sent: true } }));
  await page.route("**/api/claim/demo-token/otp/verify", async (route) => route.fulfill({ json: { ok: true, claimSession: "session-demo" } }));
  await page.route("**/api/claim/demo-token/payout", async (route) => route.fulfill({ json: { status: "PAID_OUT", cashCode: "DEMO-8842-1177", instructions: "Tunjukkan kode ini di gerai.", simulatedPayout: true } }));

  const response = await page.goto("/claim/demo-token");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  await page.getByRole("button", { name: "Cairkan sekarang" }).click();
  await page.getByRole("textbox", { name: "Kode OTP" }).fill("123456");
  await page.getByRole("button", { name: "Verifikasi kode" }).click();
  await page.getByRole("button", { name: /Ambil tunai di gerai/ }).click();
  await page.getByRole("button", { name: "Cairkan uang" }).click();

  await expect(page.getByText("DEMO-8842-1177")).toBeVisible();
  await expect(page.getByText(/pencairan akhir masih disimulasikan/i)).toBeVisible();
});

test("recipient is sent to the anchor when an SEP-24 withdrawal needs verification", async ({ page }) => {
  await page.route("**/api/claim/anchor-token", async (route) => route.fulfill({ json: { senderName: "Andi", amountIdr: "1720000", corridor: "MY", status: "PENDING" } }));
  await page.route("**/api/claim/anchor-token/otp/request", async (route) => route.fulfill({ json: { sent: true } }));
  await page.route("**/api/claim/anchor-token/otp/verify", async (route) => route.fulfill({ json: { ok: true, claimSession: "session-anchor" } }));
  await page.route("**/api/claim/anchor-token/payout", async (route) => route.fulfill({ json: { status: "PAID_OUT", interactiveUrl: "https://anchor.example/interactive/withdrawal-1", anchorTxId: "anchor-1", instructions: "Selesaikan langkah verifikasi anchor." } }));

  await page.goto("/claim/anchor-token");
  await page.getByRole("button", { name: "Cairkan sekarang" }).click();
  await page.getByRole("textbox", { name: "Kode OTP" }).fill("123456");
  await page.getByRole("button", { name: "Verifikasi kode" }).click();
  await page.getByRole("button", { name: "Cairkan uang" }).click();

  await expect(page.getByRole("heading", { name: "Pencairan sedang diproses" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lanjutkan verifikasi pencairan" })).toHaveAttribute("href", "https://anchor.example/interactive/withdrawal-1");
  await expect(page.getByText("Referensi anchor: anchor-1")).toBeVisible();
});
