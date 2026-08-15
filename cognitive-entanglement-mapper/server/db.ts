import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  aiInsights,
  concepts,
  entanglements,
  InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

function decodeList(raw: string | null | undefined): string[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function encodeList(values: string[] | undefined) {
  return JSON.stringify((values ?? []).map(value => value.trim()).filter(Boolean).slice(0, 20));
}

export type GraphConceptInput = {
  title: string;
  description?: string | null;
  category: "skill" | "interest" | "project" | "idea";
  confidence: number;
  tags?: string[];
  urls?: string[];
  positionX?: number;
  positionY?: number;
};

export type GraphEntanglementInput = {
  sourceId: number;
  targetId: number;
  relationship: string;
  strength: number;
};

export async function getGraph(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("The graph database is currently unavailable.");
  const [graphConcepts, graphEntanglements] = await Promise.all([
    db.select().from(concepts).where(eq(concepts.userId, userId)).orderBy(desc(concepts.updatedAt)),
    db.select().from(entanglements).where(eq(entanglements.userId, userId)).orderBy(desc(entanglements.updatedAt)),
  ]);
  return {
    concepts: graphConcepts.map(concept => ({ ...concept, tags: decodeList(concept.tags), urls: decodeList(concept.urls) })),
    entanglements: graphEntanglements,
  };
}

export async function createConcept(userId: number, input: GraphConceptInput) {
  const db = await getDb();
  if (!db) throw new Error("The graph database is currently unavailable.");
  const result = await db.insert(concepts).values({
    userId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    category: input.category,
    confidence: input.confidence,
    tags: encodeList(input.tags),
    urls: encodeList(input.urls),
    positionX: input.positionX ?? 0,
    positionY: input.positionY ?? 0,
  });
  const id = Number(result[0].insertId);
  const created = await db.select().from(concepts).where(and(eq(concepts.id, id), eq(concepts.userId, userId))).limit(1);
  const concept = created[0];
  if (!concept) throw new Error("Unable to create the concept.");
  return { ...concept, tags: decodeList(concept.tags), urls: decodeList(concept.urls) };
}

export async function updateConcept(userId: number, id: number, input: Partial<GraphConceptInput>) {
  const db = await getDb();
  if (!db) throw new Error("The graph database is currently unavailable.");
  const existing = await db.select({ id: concepts.id }).from(concepts).where(and(eq(concepts.id, id), eq(concepts.userId, userId))).limit(1);
  if (!existing[0]) throw new Error("Concept not found.");

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined) patch.description = input.description?.trim() || null;
  if (input.category !== undefined) patch.category = input.category;
  if (input.confidence !== undefined) patch.confidence = input.confidence;
  if (input.tags !== undefined) patch.tags = encodeList(input.tags);
  if (input.urls !== undefined) patch.urls = encodeList(input.urls);
  if (input.positionX !== undefined) patch.positionX = input.positionX;
  if (input.positionY !== undefined) patch.positionY = input.positionY;
  if (Object.keys(patch).length) await db.update(concepts).set(patch).where(and(eq(concepts.id, id), eq(concepts.userId, userId)));

  const updated = await db.select().from(concepts).where(and(eq(concepts.id, id), eq(concepts.userId, userId))).limit(1);
  const concept = updated[0];
  if (!concept) throw new Error("Concept not found.");
  return { ...concept, tags: decodeList(concept.tags), urls: decodeList(concept.urls) };
}

export async function deleteConcept(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("The graph database is currently unavailable.");
  await db.delete(entanglements).where(and(eq(entanglements.userId, userId), inArray(entanglements.sourceId, [id])));
  await db.delete(entanglements).where(and(eq(entanglements.userId, userId), inArray(entanglements.targetId, [id])));
  await db.delete(concepts).where(and(eq(concepts.id, id), eq(concepts.userId, userId)));
  return { success: true };
}

export async function saveConceptPositions(userId: number, positions: Array<{ id: number; positionX: number; positionY: number }>) {
  const db = await getDb();
  if (!db) throw new Error("The graph database is currently unavailable.");
  await Promise.all(
    positions.map(position =>
      db.update(concepts).set({ positionX: position.positionX, positionY: position.positionY }).where(and(eq(concepts.id, position.id), eq(concepts.userId, userId))),
    ),
  );
  return { success: true };
}

export async function createEntanglement(userId: number, input: GraphEntanglementInput) {
  if (input.sourceId === input.targetId) throw new Error("An Entanglement needs two distinct concepts.");
  const db = await getDb();
  if (!db) throw new Error("The graph database is currently unavailable.");
  const ownedNodes = await db.select({ id: concepts.id }).from(concepts).where(and(eq(concepts.userId, userId), inArray(concepts.id, [input.sourceId, input.targetId])));
  if (ownedNodes.length !== 2) throw new Error("Both concepts must belong to your graph.");
  const result = await db.insert(entanglements).values({
    userId,
    sourceId: input.sourceId,
    targetId: input.targetId,
    relationship: input.relationship.trim() || "relates to",
    strength: input.strength,
  });
  const id = Number(result[0].insertId);
  const created = await db.select().from(entanglements).where(and(eq(entanglements.id, id), eq(entanglements.userId, userId))).limit(1);
  if (!created[0]) throw new Error("Unable to create the Entanglement.");
  return created[0];
}

export async function updateEntanglement(userId: number, id: number, input: Partial<Pick<GraphEntanglementInput, "relationship" | "strength">>) {
  const db = await getDb();
  if (!db) throw new Error("The graph database is currently unavailable.");
  const patch: Record<string, unknown> = {};
  if (input.relationship !== undefined) patch.relationship = input.relationship.trim() || "relates to";
  if (input.strength !== undefined) patch.strength = input.strength;
  if (Object.keys(patch).length) await db.update(entanglements).set(patch).where(and(eq(entanglements.id, id), eq(entanglements.userId, userId)));
  const updated = await db.select().from(entanglements).where(and(eq(entanglements.id, id), eq(entanglements.userId, userId))).limit(1);
  if (!updated[0]) throw new Error("Entanglement not found.");
  return updated[0];
}

export async function deleteEntanglement(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("The graph database is currently unavailable.");
  await db.delete(entanglements).where(and(eq(entanglements.id, id), eq(entanglements.userId, userId)));
  return { success: true };
}

export async function saveInsight(userId: number, kind: "connection" | "extraction" | "superposition", payload: unknown) {
  const db = await getDb();
  if (!db) throw new Error("The graph database is currently unavailable.");
  const result = await db.insert(aiInsights).values({ userId, kind, payload: JSON.stringify(payload) });
  return Number(result[0].insertId);
}

export async function updateInsightStatus(userId: number, id: number, status: "accepted" | "rejected") {
  const db = await getDb();
  if (!db) throw new Error("The graph database is currently unavailable.");
  await db.update(aiInsights).set({ status }).where(and(eq(aiInsights.id, id), eq(aiInsights.userId, userId)));
  return { success: true };
}
