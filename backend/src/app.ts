import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

import { config } from "./config.js";
import { HttpError } from "./lib/http-error.js";
import { createIntegrationRouter } from "./routes/integrations.js";
import { createOrderRouter } from "./routes/orders.js";
import { OrderService } from "./services/order-service.js";
import { FileOrderRepository } from "./storage/order-repository.js";

export function createApp() {
  const app = express();
  const repository = new FileOrderRepository();
  const orderService = new OrderService(repository);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || config.apiOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new HttpError(403, "Origin not allowed"));
      },
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 40,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use("/storage", express.static(config.storageDir));
  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.use("/orders", createOrderRouter(orderService));
  app.use("/integrations", createIntegrationRouter(orderService));

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof HttpError) {
      response.status(error.statusCode).json({
        message: error.message,
        details: error.details ?? null,
      });
      return;
    }

    if (error instanceof Error && "issues" in error) {
      response.status(400).json({
        message: "Проверьте заполнение формы.",
        details: error,
      });
      return;
    }

    response.status(500).json({
      message: "Внутренняя ошибка сервера",
    });
  });

  return app;
}
