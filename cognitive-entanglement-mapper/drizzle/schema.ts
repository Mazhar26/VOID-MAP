import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const conceptCategories = ["skill", "interest", "project", "idea"] as const;
export const insightKinds = ["connection", "extraction", "superposition"] as const;
export const insightStatuses = ["pending", "accepted", "rejected"] as const;

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const concepts = mysqlTable(
  "concepts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description"),
    category: mysqlEnum("category", conceptCategories).notNull().default("idea"),
    confidence: int("confidence").notNull().default(70),
    tags: text("tags").notNull(),
    urls: text("urls").notNull(),
    positionX: int("positionX").notNull().default(0),
    positionY: int("positionY").notNull().default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("concepts_user_updated_idx").on(table.userId, table.updatedAt)],
);

export const entanglements = mysqlTable(
  "entanglements",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    sourceId: int("sourceId").notNull(),
    targetId: int("targetId").notNull(),
    relationship: varchar("relationship", { length: 120 }).notNull().default("relates to"),
    strength: int("strength").notNull().default(60),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("entanglements_user_idx").on(table.userId),
    index("entanglements_source_idx").on(table.sourceId),
    index("entanglements_target_idx").on(table.targetId),
  ],
);

export const aiInsights = mysqlTable(
  "aiInsights",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    kind: mysqlEnum("kind", insightKinds).notNull(),
    status: mysqlEnum("status", insightStatuses).notNull().default("pending"),
    payload: text("payload").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("ai_insights_user_kind_idx").on(table.userId, table.kind)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Concept = typeof concepts.$inferSelect;
export type Entanglement = typeof entanglements.$inferSelect;
