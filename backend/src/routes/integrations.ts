import { Router } from "express";
import { numericIdSchema } from "shared";

import { mapOrderToBitrixPayload } from "../services/bitrix-service.js";
import { OrderService } from "../services/order-service.js";

export function createIntegrationRouter(orderService: OrderService) {
  const router = Router();

  router.post("/bitrix/mock", async (request, response, next) => {
    try {
      const orderNumber = numericIdSchema.parse(request.body.orderNumber);
      const order = await orderService.getOrder(orderNumber);
      const payload = mapOrderToBitrixPayload(order);

      response.json({
        status: "mock_delivered",
        payload,
        deliveredAt: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
