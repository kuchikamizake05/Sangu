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

test("recipient sees only Rupiah — the anchor never surfaces in the claim flow", async ({ page }) => {
  await page.route("**/api/claim/anchor-token", async (route) => route.fulfill({ json: { senderName: "Andi", amountIdr: "1720000", corridor: "MY", status: "PENDING" } }));
  await page.route("**/api/claim/anchor-token/otp/request", async (route) => route.fulfill({ json: { sent: true } }));
  await page.route("**/api/claim/anchor-token/otp/verify", async (route) => route.fulfill({ json: { ok: true, claimSession: "session-anchor" } }));
  await page.route("**/api/claim/anchor-token/payout", async (route) => route.fulfill({ json: { status: "PAID_OUT", simulatedPayout: true, instructions: "Dana sedang diproses ke DANA. Tidak ada yang perlu kamu lakukan lagi." } }));

  await page.goto("/claim/anchor-token");
  await page.getByRole("button", { name: "Cairkan sekarang" }).click();
  await page.getByRole("textbox", { name: "Kode OTP" }).fill("123456");
  await page.getByRole("button", { name: "Verifikasi kode" }).click();
  await page.getByRole("button", { name: /^DANA/ }).click();
  await page.getByRole("textbox", { name: "Nomor DANA" }).fill("081234567890");
  await page.getByRole("button", { name: "Cairkan uang" }).click();

  await expect(page.getByRole("heading", { name: "Pencairan diproses" })).toBeVisible();
  await expect(page.getByText(/Rp 1.720.000 melalui DANA/)).toBeVisible();
  await expect(page.getByText(/anchor/i)).toHaveCount(0);
});
