import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});
const entry = z.object({
  date,
  weight: z.number().min(25).max(350),
  note: z.string().max(240),
  energy: z.number().int().min(1).max(5).optional(),
});
const freeMeal = z.object({ date, meal: z.enum(["Almoço", "Jantar", "Lanche", "Outro"]), note: z.string().max(100) });
const fastSession = z.object({ start: z.number().int().positive(), end: z.number().int().positive(), hours: z.number().int().min(12).max(16) }).refine(session => session.end >= session.start);

export const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  data: z.object({
    profile: z.object({
      height: z.number().min(100).max(230),
      weight: z.number().min(25).max(350),
      days: z.number().int().min(2).max(5),
      level: z.enum(["iniciante", "intermediario"]),
      place: z.enum(["academia", "casa"]),
      favorite: z.enum(["equilibrado", "pernas", "superiores"]),
      workoutReady: z.boolean(),
      goal: z.enum(["bem-estar", "forca", "massa"]),
      duration: z.number().int().min(20).max(60),
      equipment: z.enum(["corpo", "basico"]),
      diet: z.enum(["onivora", "vegetariana", "vegana"]),
      meals: z.number().int().min(3).max(5),
      menuVariant: z.number().int().min(0).max(100000),
      avoid: z.array(z.enum(["leite", "ovos", "peixe"])).max(3),
      freeFrequency: z.number().int().min(1).max(3),
      fastHours: z.number().int().min(12).max(16),
    }),
    completed: z.array(z.number().int().min(0).max(4)).max(5),
    entries: z.array(entry).max(3650),
    freeMeals: z.array(freeMeal).max(1000),
    fastHistory: z.array(fastSession).max(1000),
    fastStart: z.number().int().positive().nullable(),
  }),
});

export type PulsoBackup = z.infer<typeof backupSchema>;
export type PulsoData = PulsoBackup["data"];
export type Entry = PulsoData["entries"][number];
export type FreeMeal = PulsoData["freeMeals"][number];
export type FastSession = PulsoData["fastHistory"][number];

export function parseBackup(text: string): PulsoBackup {
  if (text.length > 5_000_000) throw new Error("O arquivo excede o limite de 5 MB.");
  let decoded: unknown;
  try { decoded = JSON.parse(text); } catch { throw new Error("O arquivo não é um JSON válido."); }
  const result = backupSchema.safeParse(decoded);
  if (!result.success) throw new Error("O arquivo não é um backup válido do Pulso Fitness.");
  return result.data;
}
