import { useState } from "react";
import { ArrowRight, BrainCircuit, Check, GitFork, Sparkles } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { categoryMeta, type GraphConcept } from "@/lib/graph";
import { toast } from "sonner";

type Path = { title: string; summary: string; momentum: string; risks: string[]; tradeoffs: string[]; nextSteps: string[] };

export default function Superposition() {
  const { isAuthenticated, loading } = useAuth();
  const graph = trpc.graph.get.useQuery(undefined, { enabled: isAuthenticated });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [question, setQuestion] = useState("");
  const [paths, setPaths] = useState<Path[]>([]);
  const explore = trpc.ai.exploreSuperposition.useMutation({ onSuccess: result => { setPaths(result.paths); toast.success("Superposition paths generated"); }, onError: error => toast.error(error.message) });
  const concepts = (graph.data?.concepts ?? []) as GraphConcept[];
  const toggle = (id: number) => setSelected(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else if (next.size < 6) next.add(id); else toast.message("Choose up to six concepts for a focused exploration."); return next; });
  if (loading) return <div className="page-loader">Opening the decision field…</div>;
  if (!isAuthenticated) return <div className="auth-gate"><p className="eyebrow">Decision exploration</p><h1>Hold more than one future.</h1><p>Sign in to compare paths across the concepts in your private cognitive field.</p><Button className="primary-action" onClick={() => startLogin()}>Enter your map</Button></div>;
  if (graph.isError) return <div className="app-page"><AppHeader /><div className="ai-empty"><Sparkles size={22} /><h3>Your graph could not be read.</h3><p>{graph.error.message}</p><Button className="primary-action" onClick={() => graph.refetch()}>Try again</Button></div></div>;
  return <div className="app-page field-instrument-page"><AppHeader /><main className="ai-main"><section className="ai-intro superposition-intro"><div><p className="eyebrow">Superposition explorer</p><h1>Let the paths stay <em>open.</em></h1><p>Place two or more concepts in Superposition, then inspect branching outcomes, trade-offs, and small next steps before you commit.</p></div><div className="superposition-symbol">Ψ</div></section><section className="superposition-layout"><div className="selection-panel"><div className="panel-heading"><BrainCircuit size={18} /><div><h2>Select concepts</h2><p>{selected.size} of 2–6 in Superposition</p></div></div><div className="concept-picker">{concepts.map(concept => <button type="button" key={concept.id} className={selected.has(concept.id) ? "picker-concept checked" : "picker-concept"} onClick={() => toggle(concept.id)}><i style={{ background: categoryMeta[concept.category].color }} /> <span>{concept.title}</span>{selected.has(concept.id) && <Check size={15} />}</button>)}</div>{!concepts.length && <p className="ai-empty">Build your map before using Superposition.</p>}<div className="form-field question-field"><label htmlFor="decision-question">Decision question <small>optional</small></label><Input id="decision-question" value={question} onChange={event => setQuestion(event.target.value)} placeholder="What could connect these ideas next?" /></div><Button className="primary-action explore-button" disabled={selected.size < 2 || explore.isPending} onClick={() => explore.mutate({ conceptIds: Array.from(selected), question })}><GitFork size={15} /> {explore.isPending ? "Exploring paths…" : "Explore Superposition"}</Button></div><div className="paths-panel"><div className="panel-heading"><Sparkles size={18} /><div><h2>Possible paths</h2><p>Not predictions. Structured prompts for better thinking.</p></div></div>{!paths.length && <div className="result-empty"><GitFork size={22} /><p>Select two or more concepts, then examine their possible intersections.</p></div>}<div className="path-list">{paths.map((path, index) => <article key={path.title} className="path-card"><div className="path-index">0{index + 1}</div><div className="path-content"><h3>{path.title}</h3><p>{path.summary}</p><div className="momentum-line"><ArrowRight size={14} /><span>{path.momentum}</span></div><div className="path-columns"><div><small>Trade-offs</small>{path.tradeoffs.map(item => <span key={item}>{item}</span>)}</div><div><small>Watch for</small>{path.risks.map(item => <span key={item}>{item}</span>)}</div></div><div className="next-step"><small>Small next move</small>{path.nextSteps.slice(0, 2).map(item => <span key={item}>{item}</span>)}</div></div></article>)}</div></div></section></main></div>;
}
