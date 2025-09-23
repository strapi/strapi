import { z } from "zod";

export const WidgetUIDSchema = z.string().min(1);

// widths must be one of 4, 6, 8, 12
export const WidthSchema = z.union([
  z.literal(4),
  z.literal(6),
  z.literal(8),
  z.literal(12),
]);

const widthsFieldSchema = z.record(WidgetUIDSchema, WidthSchema);

export const HomepageLayoutSchema = z.object({
  version: z.number().int().min(1),
  order: z.array(WidgetUIDSchema).max(100),
  widths: widthsFieldSchema,
  updatedAt: z.string().datetime(),
}).strict();

export type WidthsField = z.infer<typeof widthsFieldSchema>;
export type HomepageLayout = z.infer<typeof HomepageLayoutSchema>;

export const HomepageLayoutWriteSchema = z.object({
  order: z.array(WidgetUIDSchema).max(100).optional(),
  widths: z.record(WidgetUIDSchema, WidthSchema).optional(),
})
  .strict()
  .refine((v) => v.order || v.widths, {
    message: "At least one of 'order' or 'widths' is required",
  });

export type HomepageLayoutWrite = z.infer<typeof HomepageLayoutWriteSchema>;