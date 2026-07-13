import { expect, test } from "@playwright/test";

test("sender sees the pending SEP-24 anchor status in transfer detail", async ({ page }) => {
  await page.route("**/api/transfers/anchor-transfer", async (route) => route.fulfill({ json: {
    transferId: "anchor-transfer",
    status: "PAID_OUT",
    amount: "500",
    corridor: "MY",
    amountIdr: "1750000",
    recipientMasked: "+62812••••",
    createdAt: "2026-07-13T09:00:00.000Z",
    events: [{ type: "CREATED", occurredAt: "2026-07-13T09:00:00.000Z" }, { type: "PAID_OUT", occurredAt: "2026-07-13T09:05:00.000Z" }],
    anchor: { txId: "anchor-1", status: "pending_user_transfer_start", interactiveUrl: "https://anchor.example/interactive/withdrawal-1", paymentTxHash: null },
  } }));

  await page.goto("/transfers/anchor-transfer");

  await expect(page.getByRole("status", { name: "Status pencairan anchor" })).toContainText("Siap membayar ke anchor");
  await expect(page.getByText("Referensi anchor: anchor-1")).toBeVisible();
});
