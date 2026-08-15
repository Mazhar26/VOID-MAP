import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as ai from "./ai";
import * as db from "./db";

const categorySchema = z.enum(["skill", "interest", "project", "idea"]);
const conceptInput = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(4000).nullable().optional(),
  category: categorySchema,
  confidence: z.number().int().min(1).max(100),
  tags: z.array(z.string().trim().min(1).max(48)).max(20).optional(),
  urls: z.array(z.string().url().max(1000)).max(20).optional(),
  positionX: z.number().int().min(-100000).max(100000).optional(),
  positionY: z.number().int().min(-100000).max(100000).optional(),
});

const entanglementInput = z.object({
  sourceId: z.number().int().positive(),
  targetId: z.number().int().positive(),
  relationship: z.string().trim().min(1).max(120),
  strength: z.number().int().min(1).max(100),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  graph: router({
    get: protectedProcedure.query(({ ctx }) => db.getGraph(ctx.user.id)),
    createConcept: protectedProcedure.input(conceptInput).mutation(({ ctx, input }) => db.createConcept(ctx.user.id, input)),
    updateConcept: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: conceptInput.partial() })).mutation(({ ctx, input }) => db.updateConcept(ctx.user.id, input.id, input.data)),
    deleteConcept: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => db.deleteConcept(ctx.user.id, input.id)),
    savePositions: protectedProcedure.input(z.object({ positions: z.array(z.object({ id: z.number().int().positive(), positionX: z.number().int(), positionY: z.number().int() })).max(400) })).mutation(({ ctx, input }) => db.saveConceptPositions(ctx.user.id, input.positions)),
    createEntanglement: protectedProcedure.input(entanglementInput).mutation(({ ctx, input }) => db.createEntanglement(ctx.user.id, input)),
    updateEntanglement: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: entanglementInput.pick({ relationship: true, strength: true }).partial() })).mutation(({ ctx, input }) => db.updateEntanglement(ctx.user.id, input.id, input.data)),
    deleteEntanglement: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => db.deleteEntanglement(ctx.user.id, input.id)),
  }),
  ai: router({
    discoverEntanglements: protectedProcedure.mutation(async ({ ctx }) => {
      const graph = await db.getGraph(ctx.user.id);
      const existingPairs = new Set(graph.entanglements.map(link => [link.sourceId, link.targetId].sort((a, b) => a - b).join(":")));
      const concepts = graph.concepts.map(concept => ({ id: concept.id, title: concept.title, description: concept.description, category: concept.category, tags: concept.tags }));
      const result = await ai.discoverHiddenConnections(concepts, existingPairs);
      const insightId = await db.saveInsight(ctx.user.id, "connection", result);
      return { ...result, insightId };
    }),
    extractConcepts: protectedProcedure.input(z.object({ text: z.string().trim().min(20).max(12000) })).mutation(async ({ ctx, input }) => {
      const result = await ai.extractConceptsFromText(input.text);
      const insightId = await db.saveInsight(ctx.user.id, "extraction", result);
      return { ...result, insightId };
    }),
    exploreSuperposition: protectedProcedure.input(z.object({ conceptIds: z.array(z.number().int().positive()).min(2).max(6), question: z.string().trim().max(800) })).mutation(async ({ ctx, input }) => {
      const graph = await db.getGraph(ctx.user.id);
      const selected = graph.concepts.filter(concept => input.conceptIds.includes(concept.id)).map(concept => ({ id: concept.id, title: concept.title, description: concept.description, category: concept.category, tags: concept.tags }));
      if (selected.length < 2) throw new Error("Select at least two concepts from your graph.");
      const result = await ai.exploreSuperposition(selected, input.question);
      const insightId = await db.saveInsight(ctx.user.id, "superposition", { selectedIds: input.conceptIds, ...result });
      return { ...result, insightId };
    }),
    recordInsightFeedback: protectedProcedure.input(z.object({ insightId: z.number().int().positive(), status: z.enum(["accepted", "rejected"]) })).mutation(({ ctx, input }) => db.updateInsightStatus(ctx.user.id, input.insightId, input.status)),
  }),
});

export type AppRouter = typeof appRouter;
