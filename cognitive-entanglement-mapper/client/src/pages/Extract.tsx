import { useState, type CSSProperties } from "react";
import { Check, FileText, Sparkles, Wand2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { categoryMeta, type ConceptCategory } from "@/lib/graph";
import { toast } from "sonner";
import { HoldButton, WordReveal } from "@/components/Immersive";

type Extracted = { title: string; description: string; category: ConceptCategory; confidence: number; tags: string[] };

export default function Extract() {
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const [text, setText] = useState("");
  const [concepts, setConcepts] = useState<Extracted[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const extract = trpc.ai.extractConcepts.useMutation({ onSuccess: result => { setConcepts(result.concepts); setSelected(new Set(result.concepts.map((_, index) => index))); toast.success(`${result.concepts.length} concepts found`); }, onError: error => toast.error(error.message) });
  const create = trpc.graph.createConcept.useMutation();
  const importSelected = async () => {
    const chosen = concepts.filter((_, index) => selected.has(index));
    if (!chosen.length) return;
    try {
      await Promise.all(chosen.map((concept, index) => create.mutateAsync({ ...concept, positionX: 420 + (index % 3) * 120, positionY: 240 + Math.floor(index / 3) * 105 })));
      await utils.graph.get.invalidate();
      toast.success(`${chosen.length} concepts added to your graph`);
      setConcepts([]); setSelected(new Set());
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to add all concepts."); }
  };
  const toggle = (index: number) => setSelected(previous => { const next = new Set(previous); if (next.has(index)) next.delete(index); else next.add(index); return next; });
  if (loading) return <div className="page-loader">Preparing extraction…</div>;
  if (!isAuthenticated) return <div className="auth-gate"><p className="eyebrow">Private import</p><h1><WordReveal>Turn a story into a field.</WordReveal></h1><p>Sign in to extract concepts from your resume, bio, project write-up, or free text.</p><HoldButton className="primary-action" onComplete={() => startLogin()}>Hold to enter your map</HoldButton></div>;
  return <div className="app-page field-instrument-page"><AppHeader /><main className="ai-main"><section className="ai-intro extract-intro"><div><p className="eyebrow">Skill extraction</p><h1><WordReveal>Start with what you’ve already said.</WordReveal></h1><p>Paste source text and turn its explicit skills, interests, projects, and ideas into editable graph concepts.</p></div><FileText className="hero-line-icon" size={105} strokeWidth={.7} /></section><section className="extract-layout"><div className="extract-input"><div className="panel-heading"><Wand2 size={18} /><div><h2>Source text</h2><p>Resume, bio, notes, or any text you own.</p></div></div><Textarea value={text} onChange={event => setText(event.target.value)} rows={16} placeholder="I’m a product designer who builds research-backed digital systems…" /><div className="extract-footer"><span>{text.length.toLocaleString()} / 12,000</span><Button onClick={() => extract.mutate({ text })} disabled={text.trim().length < 20 || extract.isPending} className="primary-action"><Sparkles size={15} /> {extract.isPending ? "Extracting…" : "Extract concepts"}</Button></div></div><div className="extraction-results"><div className="panel-heading"><Sparkles size={18} /><div><h2>Potential concepts</h2><p>Select what belongs in your field.</p></div></div>{!concepts.length && <div className="result-empty"><Wand2 size={22} /><p>Extracted concepts will appear here for your review.</p></div>}{concepts.map((concept, index) => <button type="button" key={`${concept.title}-${index}`} className={selected.has(index) ? "extracted-concept checked" : "extracted-concept"} style={{ "--concept-delay": `${index * 70}ms` } as CSSProperties} onClick={() => toggle(index)}><span className="extracted-check">{selected.has(index) && <Check size={14} />}</span><div><div className="extracted-heading"><strong>{concept.title}</strong><span style={{ color: categoryMeta[concept.category].color }}>{categoryMeta[concept.category].label}</span></div><p>{concept.description}</p><small>{concept.confidence}% confidence · {concept.tags.join(" · ")}</small></div></button>)}{concepts.length > 0 && <Button className="primary-action import-button" disabled={!selected.size || create.isPending} onClick={importSelected}>{create.isPending ? "Adding concepts…" : `Add ${selected.size} to my graph`}</Button>}</div></section></main></div>;
}
