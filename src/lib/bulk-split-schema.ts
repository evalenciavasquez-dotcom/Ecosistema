import { z } from "zod";

export const bulkSplitSchema = z.object({
  fragmentos: z
    .array(z.string())
    .max(20)
    .describe(
      "Cada fragmento es UNA sola novedad atómica y autocontenida (un pago, una decisión, un evento, un riesgo, una nota) lista para clasificarse por separado. Texto claro y corto, en las palabras originales cuando sea posible."
    ),
});

export type BulkSplit = z.infer<typeof bulkSplitSchema>;
