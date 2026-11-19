import { z } from "zod";

const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const gradeSchema = z.enum(["A", "B", "C", "D", "E"]);

export const readingSchema = z.object({
  kind: z.string().min(1),
  title: z.string().min(1), // markdown
  url: z.url(),
  duration: z.string().nullable(),
  why: z.string().nullable(),
  grade: gradeSchema.nullable(),
});

export const moduleContentSchema = z.object({
  schemaVersion: z.literal(1),
  slug: z.string().regex(slugRegex),
  key: z.string().regex(/^[a-z0-9]+$/),
  part: z.union([z.literal(1), z.literal(2)]),
  order: z.number().int().positive(),
  kicker: z.string().min(1),
  title: z.string().min(1),
  lead: z.string().nullable(),
  prerequisites: z.string().nullable(),
  seen: z.array(z.string()),
  new: z.array(z.string()),
  decisionQuestions: z.array(z.string()),
  readings: z.array(readingSchema),
  exercise: z.string().nullable(),
  seeds: z.string().nullable(),
});

export const routineItemSchema = z.object({
  slug: z.string().regex(slugRegex),
  cadence: z.enum(["daily", "weekly", "monthly"]),
  order: z.number().int().positive(),
  label: z.string().min(1),
  hint: z.string().nullable(),
});

export const routinesFileSchema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(routineItemSchema),
});

export type Grade = z.infer<typeof gradeSchema>;
export type Reading = z.infer<typeof readingSchema>;
export type ModuleContent = z.infer<typeof moduleContentSchema>;
export type RoutineItemContent = z.infer<typeof routineItemSchema>;
export type RoutinesFile = z.infer<typeof routinesFileSchema>;
