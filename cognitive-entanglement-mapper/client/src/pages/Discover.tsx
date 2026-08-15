import { useState } from "react";
import { Check, CircleDashed, Link2, Sparkles, X } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import type { GraphConcept } from "@/lib/graph";
import { toast } from "sonner";
import { HoldButton, WordReveal } from "@/components/Immersive";

type Suggestion = { sourceId: number; targetId: number; relationship: string; confidence: number; explanation: string };

export default function Discover() {
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const graph = trpc.graph.get.useQuery(undefined, { enabled: isAuthenticated });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [insightId, setInsightId] = useState<number | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const discover = trpc.ai.discoverEntanglements.useMutation({ onSuccess: result => { setSuggestions(result.suggestions); setInsightId(result.insightId); if (!result.suggestions.length) toast.message("Your current field has no unlinked concept pairs to surface yet."); }, onError: error => toast.error(error.message) });
  const create = trpc.graph.createEntanglement.useMutation({ onSuccess: () => utils.graph.get.invalidate(), onError: error => toast.error(error.message) });
  const feedback = trpc.ai.recordInsightFeedback.useMutation();
  const concepts = (graph.data?.concepts ?? []) as GraphConcept[];
  const titleFor = (id: number) => concepts.find(concept => concept.id === id)?.title ?? "Unknown concept";
  const suggestionKey = (suggestion: Suggestion) => `${suggestion.sourceId}:${suggestion.targetId}`;
  const act = async (suggestion: Suggestion, accepted: boolean) => {
    const key = suggestionKey(suggestion);
    try {
      if (accepted) await create.mutateAsync({ sourceId: suggestion.sourceId, targetId: suggestion.targetId, relationship: suggestion.relationship, strength: suggestion.confidence });
      if (insightId) await feedback.mutateAsync({ insightId, status: accepted ? "accepted" : "rejected" });
      setCompletedIds(previous => new Set(previous).add(key));
      toast.success(accepted ? "Entanglement accepted into your graph" : "Suggestion set aside");
    } catch { /* individual mutations display their own error state */ }
  };

  if (loading) return <div className="page-loader">Reading the field…</div>;
  if (!isAuthenticated) return <div className="auth-gate"><p className="eyebrow">Private discovery</p><h1><WordReveal>Find the bridges you might miss.</WordReveal></h1><p>Sign in to analyze the ideas, interests, skills, and projects in your own cognitive field.</p><HoldButton className="primary-action" onComplete={() => startLogin()}>Hold to enter your map</HoldButton></div>;
  if (graph.isError) return <div className="app-page"><AppHeader /><div className="ai-empty"><Sparkles size={22} /><h3>Your graph could not be read.</h3><p>{graph.error.message}</p><Button className="primary-action" onClick={() => graph.refetch()}>Try again</Button></div></div>;

  return <div className="app-page field-instrument-page"><AppHeader /><main className="ai-main"><section className="ai-intro discovery-intro"><div><p className="eyebrow">AI pattern recognition</p><h1><WordReveal>Look between the known.</WordReveal></h1><p>Analyze your map for plausible cross-domain Entanglements. Every suggestion is a prompt for thought, not a claim of fact.</p></div><div className="analysis-orb"><CircleDashed size={74} /><span>{concepts.length}<small>concepts</small></span></div></section><section className="ai-workbench"><div className="analysis-callout"><Sparkles size={19} /><div><strong>Find hidden Entanglements</strong><p>We look for under-connected pairs in different areas of your graph, then provide a confidence score and rationale.</p></div><Button onClick={() => discover.mutate()} disabled={discover.isPending || concepts.length < 2} className="primary-action">{discover.isPending ? "Analyzing field…" : "Analyze my graph"}</Button></div>{concepts.length < 2 && <p className="ai-empty">Add at least two concepts to use discovery.</p>}<div className="suggestion-grid">{suggestions.map(suggestion => { const done = completedIds.has(suggestionKey(suggestion)); return <article key={suggestionKey(suggestion)} style={{ "--suggestion-delay": `${suggestions.indexOf(suggestion) * 80}ms` } as React.CSSProperties} className={done ? "suggestion-card is-done" : "suggestion-card stagger-suggestion"}><div className="suggestion-top"><span className="confidence-chip">{suggestion.confidence}% confidence</span>{done && <Check size={16} color="#a9f593" />}</div><div className="suggestion-pair"><span>{titleFor(suggestion.sourceId)}</span><Link2 size={16} /><span>{titleFor(suggestion.targetId)}</span></div><p className="relationship-label">{suggestion.relationship}</p><p className="suggestion-explanation">{suggestion.explanation}</p>{!done && <div className="suggestion-actions"><Button size="sm" variant="outline" onClick={() => act(suggestion, false)}><X size={14} /> Set aside</Button><Button size="sm" className="primary-action" onClick={() => act(suggestion, true)} disabled={create.isPending}><Check size={14} /> Accept Entanglement</Button></div>}</article>})}</div>{!suggestions.length && !discover.isPending && concepts.length >= 2 && <div className="ai-empty"><Sparkles size={20} /><h3>Give your field a new angle.</h3><p>Run an analysis to surface potential bridges across your existing concepts.</p></div>}</section></main></div>;
}
