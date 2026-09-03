import { z } from "zod";

/**
 * Zod-Schema für die AI-Antwort. Validiert serverseitig, was das Modell
 * zurückgibt, bevor es an den Client geht. Die apply-Aktion ist eine
 * diskriminierte Union, die 1:1 zu ApplyAction in lib/types.ts passt.
 */

const colId = z.enum(["backlog", "ready", "doing", "review", "done"]);
const points = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(5),
  z.literal(8),
  z.literal(13),
]);

const taskSpec = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).default(""),
  col: colId,
  points,
});

const storySpec = z.object({
  title: z.string().min(1).max(200),
  story: z.string().max(600).default(""),
  epic: z.enum(["Onboarding", "Board", "AI-Helfer"]),
  acs: z.array(z.string().min(1).max(300)).max(12).default([]),
  tasks: z.array(taskSpec).max(12).default([]),
});

export const applyActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ingest"),
    stories: z.array(storySpec).min(1).max(8),
    looseTasks: z.array(taskSpec).max(12).default([]),
  }),
  z.object({
    type: z.literal("createTask"),
    title: z.string().min(1).max(200),
    description: z.string().max(1000).default(""),
    col: colId,
    points,
    storyId: z.number().int().nullable(),
    acs: z.array(z.string().min(1).max(300)).max(12).default([]),
  }),
  z.object({
    type: z.literal("deriveTasks"),
    storyId: z.number().int(),
    tasks: z.array(taskSpec).min(1).max(9),
  }),
  z.object({
    type: z.literal("syncStory"),
    storyId: z.number().int(),
    addTasks: z.array(taskSpec).max(9).default([]),
    appendAcs: z
      .array(
        z.object({
          taskId: z.number().int(),
          acs: z.array(z.string().min(1).max(300)).min(1).max(8),
        }),
      )
      .max(20)
      .default([]),
  }),
  z.object({
    type: z.literal("appendTaskAcs"),
    taskId: z.number().int(),
    acs: z.array(z.string().min(1).max(300)).min(1).max(8),
  }),
  z.object({
    type: z.literal("setTaskPoints"),
    taskId: z.number().int(),
    points,
  }),
  z.object({
    type: z.literal("reorderTasks"),
    order: z.array(z.number().int()).max(500),
  }),
]);

export const aiResultSchema = z.object({
  title: z.string().min(1).max(120),
  text: z.string().max(2000).default(""),
  bullets: z.array(z.string().min(1).max(300)).max(10).default([]),
  applyLabel: z.string().max(60).optional(),
  apply: applyActionSchema.optional(),
});

export type AiResultParsed = z.infer<typeof aiResultSchema>;
