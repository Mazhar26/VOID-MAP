import { invokeLLM } from "./_core/llm";

export type InsightConcept = {
  id: number;
  title: string;
  description: string | null;
  category: "skill" | "interest" | "project" | "idea";
  tags: string[];
};

export type ConnectionSuggestion = {
  sourceId: number;
  targetId: number;
  relationship: string;
  confidence: number;
  explanation: string;
};

export type ExtractedConcept = {
  title: string;
  description: string;
  category: "skill" | "interest" | "project" | "idea";
  confidence: number;
  tags: string[];
};

export type SuperpositionPath = {
  title: string;
  summary: string;
  momentum: string;
  risks: string[];
  tradeoffs: string[];
  nextSteps: string[];
};

function contentToString(content: unknown) {
  if (typeof content === "string") return content;
  return "";
}

function safeJson<T>(content: string): T | null {
  try {
    return JSON.parse(content) as T;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

export async function discoverHiddenConnections(concepts: InsightConcept[], existingPairs: Set<string>) {
  const candidates = concepts.filter(concept => concept.title.trim());
  if (candidates.length < 2) return { suggestions: [] as ConnectionSuggestion[], source: "heuristic" as const };
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a precise systems-thinking assistant. Find 1–4 non-obvious, defensible cross-domain links in a personal knowledge graph. Do not invent achievements or claim certainty. Return only JSON." },
        { role: "user", content: `Concepts: ${JSON.stringify(candidates)}. Existing undirected Entanglements: ${JSON.stringify(Array.from(existingPairs))}. Propose only new pairs, favoring different categories. Every confidence is an integer from 1 to 100.` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "connection_suggestions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    sourceId: { type: "integer" },
                    targetId: { type: "integer" },
                    relationship: { type: "string" },
                    confidence: { type: "integer" },
                    explanation: { type: "string" },
                  },
                  required: ["sourceId", "targetId", "relationship", "confidence", "explanation"],
                  additionalProperties: false,
                },
              },
            },
            required: ["suggestions"],
            additionalProperties: false,
          },
        },
      },
    });
    const parsed = safeJson<{ suggestions: ConnectionSuggestion[] }>(contentToString(response.choices[0]?.message.content));
    const validIds = new Set(candidates.map(concept => concept.id));
    const suggestions = (parsed?.suggestions ?? []).filter(suggestion => {
      const key = [suggestion.sourceId, suggestion.targetId].sort((a, b) => a - b).join(":");
      return validIds.has(suggestion.sourceId) && validIds.has(suggestion.targetId) && suggestion.sourceId !== suggestion.targetId && !existingPairs.has(key);
    }).slice(0, 4).map(suggestion => ({ ...suggestion, confidence: Math.max(1, Math.min(100, Math.round(suggestion.confidence))) }));
    if (suggestions.length) return { suggestions, source: "ai" as const };
  } catch (error) {
    console.warn("[AI] Hidden connection generation unavailable", error);
  }
  const fallback: ConnectionSuggestion[] = [];
  for (let index = 0; index < candidates.length - 1 && fallback.length < 3; index += 1) {
    const source = candidates[index];
    const target = candidates.slice(index + 1).find(item => {
      const key = [source.id, item.id].sort((a, b) => a - b).join(":");
      return source.category !== item.category && !existingPairs.has(key);
    });
    if (target) fallback.push({ sourceId: source.id, targetId: target.id, relationship: "may inform", confidence: 58, explanation: `${source.title} and ${target.title} sit in different areas of your map; consider whether methods, audiences, or constraints from one can sharpen the other.` });
  }
  return { suggestions: fallback, source: "heuristic" as const };
}

export async function extractConceptsFromText(text: string) {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You extract concise personal knowledge-graph concepts from supplied text. Return 3–12 concepts only when evidenced by the text. Never infer sensitive traits. Return only JSON." },
        { role: "user", content: `Extract skills, interests, projects, and ideas from: ${text.slice(0, 12000)}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "extracted_concepts",
          strict: true,
          schema: {
            type: "object",
            properties: {
              concepts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    category: { type: "string", enum: ["skill", "interest", "project", "idea"] },
                    confidence: { type: "integer" },
                    tags: { type: "array", items: { type: "string" } },
                  },
                  required: ["title", "description", "category", "confidence", "tags"],
                  additionalProperties: false,
                },
              },
            },
            required: ["concepts"],
            additionalProperties: false,
          },
        },
      },
    });
    const parsed = safeJson<{ concepts: ExtractedConcept[] }>(contentToString(response.choices[0]?.message.content));
    const concepts = (parsed?.concepts ?? []).filter(concept => concept.title.trim()).slice(0, 12).map(concept => ({ ...concept, confidence: Math.max(1, Math.min(100, Math.round(concept.confidence))), tags: concept.tags.slice(0, 8) }));
    if (concepts.length) return { concepts, source: "ai" as const };
  } catch (error) {
    console.warn("[AI] Skill extraction unavailable", error);
  }
  const terms = Array.from(new Set((text.match(/[A-Za-z][A-Za-z+#.-]{2,}/g) ?? []).map(term => term.toLowerCase()))).slice(0, 8);
  return {
    concepts: terms.map(term => ({ title: term.replace(/\b\w/g, (character: string) => character.toUpperCase()), description: "Imported from your supplied text. Refine this concept before relying on it.", category: "skill" as const, confidence: 45, tags: ["imported"] })),
    source: "heuristic" as const,
  };
}

export async function exploreSuperposition(selected: InsightConcept[], question: string) {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You help a person explore a decision in Superposition. Produce 2–4 plausible branches based only on the selected concepts and their question. Avoid predictions or definitive advice. Identify trade-offs and small reversible next steps. Return only JSON." },
        { role: "user", content: `Selected concepts: ${JSON.stringify(selected)}. Decision question: ${question || "Explore the opportunity in the selected concepts."}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "superposition_paths",
          strict: true,
          schema: {
            type: "object",
            properties: {
              paths: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    summary: { type: "string" },
                    momentum: { type: "string" },
                    risks: { type: "array", items: { type: "string" } },
                    tradeoffs: { type: "array", items: { type: "string" } },
                    nextSteps: { type: "array", items: { type: "string" } },
                  },
                  required: ["title", "summary", "momentum", "risks", "tradeoffs", "nextSteps"],
                  additionalProperties: false,
                },
              },
            },
            required: ["paths"],
            additionalProperties: false,
          },
        },
      },
    });
    const parsed = safeJson<{ paths: SuperpositionPath[] }>(contentToString(response.choices[0]?.message.content));
    if (parsed?.paths?.length) return { paths: parsed.paths.slice(0, 4), source: "ai" as const };
  } catch (error) {
    console.warn("[AI] Superposition analysis unavailable", error);
  }
  const labels = selected.map(concept => concept.title).join(" + ");
  return {
    paths: [
      { title: "Focused convergence", summary: `Test one concrete intersection of ${labels}.`, momentum: "Clarity grows quickly through a narrow prototype.", risks: ["May exclude useful alternatives early"], tradeoffs: ["Depth over breadth"], nextSteps: ["Define a two-week experiment", "Choose one observable learning signal"] },
      { title: "Parallel probes", summary: `Run small, low-commitment experiments around ${labels}.`, momentum: "Keeps options open while producing comparative evidence.", risks: ["Attention can fragment"], tradeoffs: ["Discovery over speed"], nextSteps: ["Set a time budget per probe", "Review results against the decision question"] },
    ],
    source: "heuristic" as const,
  };
}
