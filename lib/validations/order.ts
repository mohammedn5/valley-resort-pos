import { z } from "zod";

export const localOrderItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
});

export const syncOrderSchema = z.object({
  localOrderId: z.string().min(1),
  locationId: z.string().min(1),
  shiftId: z.string().min(1),
  userId: z.string().min(1),
  items: z.array(localOrderItemSchema).min(1),
  paymentMethod: z.enum(["cash", "card", "split"]),
  cashAmount: z.number().nonnegative(),
  cardAmount: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
  createdAt: z.string().min(1),
});

export type LocalOrderItemInput = z.infer<typeof localOrderItemSchema>;
export type SyncOrderInput = z.infer<typeof syncOrderSchema>;
