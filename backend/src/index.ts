import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import senderRoutes from "./routes/sender.js";
import claimRoutes from "./routes/claim.js";
import { startScheduler, stopScheduler } from "./lib/scheduler.js";
import { isOnchainEnabled } from "./stellar/escrow.js";
import { isAnchorEnabled } from "./anchor/sep24.js";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get("/health", async () => ({
  ok: true,
  onchain: isOnchainEnabled(), // false = demo-mode (ESCROW_ID/RELAYER_SECRET belum diisi)
  anchor: isAnchorEnabled(),
}));
await app.register(senderRoutes);
await app.register(claimRoutes);

startScheduler(app.log);
app.addHook("onClose", async () => stopScheduler());

const port = Number(process.env.PORT ?? 4000);
app
  .listen({ port, host: "0.0.0.0" })
  .then(() => app.log.info(`Sangu backend on :${port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
