/*import { z } from "zod";

export const WidgetUIDSchema = z.string().min(1);
export const WidthSchema = z.number().int().min(1).max(12);

// Incoming payload from the client (no version/updatedAt).
// We also PRUNE widths whose keys are not present in `order`.
export const UserLayoutWriteSchema = z
  .object({
    order: z.array(WidgetUIDSchema).max(100),
    widths: z.record(WidgetUIDSchema, WidthSchema),
  })
  .strict()
  // TODO Araks: do we need to delete orphaned widths?
  .transform((data) => {
    const allowed = new Set(data.order);
    const pruned: Record<string, number> = {};
    for (const [uid, w] of Object.entries(data.widths)) {
      if (allowed.has(uid)) pruned[uid] = w;
    }
    return { ...data, widths: pruned };
  });

export const UserLayoutSchema = z
  .object({
    version: z.number().int().min(0),
    order: z.array(WidgetUIDSchema).max(100),
    widths: z.record(WidgetUIDSchema, WidthSchema),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type UserLayoutWrite = z.infer<typeof UserLayoutWriteSchema>;
export type UserLayout = z.infer<typeof UserLayoutSchema>;*/
import { z } from "zod";

export const WidgetUIDSchema = z.string().min(1);

// widths must be one of 4, 6, 8, 12
export const WidthSchema = z.union([
  z.literal(4),
  z.literal(6),
  z.literal(8),
  z.literal(12),
]);

export const UserLayoutSchema = z.object({
  version: z.number().int().min(0),
  order: z.array(WidgetUIDSchema).max(100),
  widths: z.record(WidgetUIDSchema, WidthSchema),
  updatedAt: z.string().datetime(),
}).strict();

export type UserLayout = z.infer<typeof UserLayoutSchema>;

// PATCH accepts partial changes
export const UserLayoutWriteSchema = z.object({
  order: z.array(WidgetUIDSchema).max(100).optional(),
  widths: z.record(WidgetUIDSchema, WidthSchema).optional(),
})
  .strict()
  .refine((v) => v.order || v.widths, {
    message: "At least one of 'order' or 'widths' is required",
  });

export type UserLayoutWrite = z.infer<typeof UserLayoutWriteSchema>;