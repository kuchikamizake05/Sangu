import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import senderRoutes from "./routes/sender.js";
import claimRoutes from "./routes/claim.js";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get("/health", async () => ({ ok: true }));
await app.register(senderRoutes);
await app.register(claimRoutes);

const port = Number(process.env.PORT ?? 4000);
app
  .listen({ port, host: "0.0.0.0" })
  .then(() => app.log.info(`Sangu backend on :${port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
