import * as z from 'zod';

// widths must be one of 4, 6, 8, 12
export const WidthSchema = z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(12)]);

const WidgetEntrySchema = z.strictObject({
  uid: z.string().nonempty(),
  width: WidthSchema,
});

export const HomepageLayoutSchema = z.strictObject({
  version: z.number().int().min(1),
  widgets: z.array(WidgetEntrySchema).max(100),
  updatedAt: z.string().datetime(),
});

export type HomepageLayout = z.infer<typeof HomepageLayoutSchema>;

export const HomepageLayoutWriteSchema = z.strictObject({
  version: z.number().int().min(1).optional(),
  widgets: z.array(WidgetEntrySchema).max(100),
  updatedAt: z.string().datetime().optional(),
});

export type HomepageLayoutWrite = z.infer<typeof HomepageLayoutWriteSchema>;
