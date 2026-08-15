import { useMemo, useState } from "react";
import { CirclePlus, Link2, Search, Sparkles, Wand2, X } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import AppHeader from "@/components/AppHeader";
import ConceptEditor, { type ConceptEditorValues, type RelatedEntanglement } from "@/components/ConceptEditor";
import GraphCanvas from "@/components/GraphCanvas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import type { ConceptCategory, GraphConcept, GraphEntanglement } from "@/lib/graph";
import { categoryMeta } from "@/lib/graph";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { HoldButton, WordReveal } from "@/components/Immersive";

export default function Workspace() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const graphQuery = trpc.graph.get.useQuery(undefined, { enabled: isAuthenticated });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [newConceptOpen, setNewConceptOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<Set<ConceptCategory>>(new Set());
  const [minimumStrength, setMinimumStrength] = useState(0);
  const [linkingFromId, setLinkingFromId] = useState<number | null>(null);
  const [entanglementTargetId, setEntanglementTargetId] = useState<number | null>(null);
  const [relationship, setRelationship] = useState("relates to");
  const [strength, setStrength] = useState(65);
  const [editingEntanglement, setEditingEntanglement] = useState<GraphEntanglement | null>(null);

  const invalidate = () => utils.graph.get.invalidate();
  const createConcept = trpc.graph.createConcept.useMutation({ onSuccess: data => { invalidate(); setSelectedId(data.id); setNewConceptOpen(false); toast.success("Concept added to your field"); }, onError: error => toast.error(error.message) });
  const updateConcept = trpc.graph.updateConcept.useMutation({ onSuccess: invalidate, onError: error => toast.error(error.message) });
  const deleteConcept = trpc.graph.deleteConcept.useMutation({ onSuccess: () => { invalidate(); setSelectedId(null); toast.success("Concept removed"); }, onError: error => toast.error(error.message) });
  const savePositions = trpc.graph.savePositions.useMutation();
  const createEntanglement = trpc.graph.createEntanglement.useMutation({ onSuccess: () => { invalidate(); setLinkingFromId(null); setEntanglementTargetId(null); toast.success("Entanglement created"); }, onError: error => toast.error(error.message) });
  const updateEntanglement = trpc.graph.updateEntanglement.useMutation({ onSuccess: () => { invalidate(); setEditingEntanglement(null); toast.success("Entanglement updated"); }, onError: error => toast.error(error.message) });
  const deleteEntanglement = trpc.graph.deleteEntanglement.useMutation({ onSuccess: () => { invalidate(); setEditingEntanglement(null); toast.success("Entanglement removed"); }, onError: error => toast.error(error.message) });

  const concepts = (graphQuery.data?.concepts ?? []) as GraphConcept[];
  const entanglements = (graphQuery.data?.entanglements ?? []) as GraphEntanglement[];
  const selected = concepts.find(concept => concept.id === selectedId) ?? null;
  const selectedEntanglements: RelatedEntanglement[] = selected ? entanglements.filter(link => link.sourceId === selected.id || link.targetId === selected.id).map(link => ({ id: link.id, relationship: link.relationship, strength: link.strength, otherTitle: concepts.find(concept => concept.id === (link.sourceId === selected.id ? link.targetId : link.sourceId))?.title ?? "Untitled concept" })) : [];
  const activeFilter = Boolean(query || categories.size || minimumStrength);
  const highlightedIds = useMemo(() => {
    if (!activeFilter) return new Set(concepts.map(concept => concept.id));
    const result = new Set<number>();
    const normalized = query.trim().toLowerCase();
    concepts.forEach(concept => {
      const textMatch = !normalized || [concept.title, concept.description ?? "", ...concept.tags].join(" ").toLowerCase().includes(normalized);
      const categoryMatch = !categories.size || categories.has(concept.category);
      if (textMatch && categoryMatch) result.add(concept.id);
    });
    if (minimumStrength) entanglements.filter(link => link.strength >= minimumStrength).forEach(link => { result.add(link.sourceId); result.add(link.targetId); });
    return result;
  }, [activeFilter, categories, concepts, entanglements, minimumStrength, query]);
  const dimmedIds = useMemo(() => new Set(concepts.filter(concept => !highlightedIds.has(concept.id)).map(concept => concept.id)), [concepts, highlightedIds]);

  const toggleCategory = (category: ConceptCategory) => setCategories(previous => {
    const next = new Set(previous);
    if (next.has(category)) next.delete(category); else next.add(category);
    return next;
  });
  const saveConcept = (values: ConceptEditorValues, concept?: GraphConcept | null) => {
    if (concept) updateConcept.mutate({ id: concept.id, data: values });
    else createConcept.mutate({ ...values, positionX: 500 + Math.round(Math.random() * 150 - 75), positionY: 340 + Math.round(Math.random() * 120 - 60) });
  };
  const selectForEntanglement = (id: number) => {
    if (!linkingFromId) { setLinkingFromId(id); setSelectedId(id); toast.message("Now select a second concept to create an Entanglement."); }
    else if (linkingFromId !== id) { setEntanglementTargetId(id); setRelationship("relates to"); setStrength(65); }
  };
  const submitEntanglement = () => {
    if (!linkingFromId || !entanglementTargetId) return;
    createEntanglement.mutate({ sourceId: linkingFromId, targetId: entanglementTargetId, relationship, strength });
  };

  if (loading) return <div className="page-loader">Preparing your cognitive field…</div>;
  if (!isAuthenticated) return <div className="auth-gate"><div className="auth-orb" /><p className="eyebrow">Your private field</p><h1><WordReveal>Sign in to map what you know.</WordReveal></h1><p>Concepts and Entanglements are kept in a graph only you can access.</p><HoldButton className="primary-action" onComplete={() => startLogin()}>Hold to enter your map</HoldButton></div>;
  if (graphQuery.isError) return <div className="app-page"><AppHeader /><div className="ai-empty"><Sparkles size={22} /><h3>Your field could not be loaded.</h3><p>{graphQuery.error.message}</p><Button className="primary-action" onClick={() => graphQuery.refetch()}>Try again</Button></div></div>;

  return (
    <div className="app-page field-instrument-page">
      <AppHeader />
      <main className="workspace-main">
        <section className="workspace-toolbar staged-panel">
          <div className="workspace-title"><p className="eyebrow">Your cognitive field</p><h1><WordReveal>Map the unseen connections.</WordReveal></h1></div>
          <div className="toolbar-actions"><Button variant="outline" className={linkingFromId ? "entangle-button is-active" : "entangle-button"} onClick={() => { setLinkingFromId(null); setEntanglementTargetId(null); if (!linkingFromId) toast.message("Select two concepts to create an Entanglement."); else toast.message("Entanglement creation cancelled."); }}><Link2 size={16} /> {linkingFromId ? "Cancel linking" : "Create Entanglement"}</Button><Button className="primary-action" onClick={() => setNewConceptOpen(true)}><CirclePlus size={16} /> Add concept</Button></div>
        </section>
        <section className="workspace-layout staged-panel">
          <aside className="filter-panel">
            <div className="search-field"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search your graph" />{query && <button type="button" onClick={() => setQuery("")}><X size={13} /></button>}</div>
            <div className="filter-block"><div className="filter-title"><span>Concept types</span><small>{categories.size || "All"}</small></div><div className="category-filters">{(Object.keys(categoryMeta) as ConceptCategory[]).map(category => <button type="button" key={category} onClick={() => toggleCategory(category)} className={categories.has(category) ? "category-filter selected" : "category-filter"} style={{ "--category": categoryMeta[category].color } as React.CSSProperties}><i /> {categoryMeta[category].label}</button>)}</div></div>
            <div className="filter-block"><div className="filter-title"><span>Entanglement strength</span><small>{minimumStrength ? `${minimumStrength}+` : "Any"}</small></div><input type="range" className="confidence-range" min="0" max="100" step="10" value={minimumStrength} onChange={event => setMinimumStrength(Number(event.target.value))} /></div>
            <div className="field-stats"><div><strong>{concepts.length}</strong><span>Concepts</span></div><div><strong>{entanglements.length}</strong><span>Entanglements</span></div></div>
            <div className="side-cta"><Sparkles size={18} /><p>Ready for a new perspective?</p><button type="button" onClick={() => navigate("/discover")}>Discover hidden links</button></div>
          </aside>
          <div className="graph-stage"><GraphCanvas concepts={concepts} entanglements={entanglements} selectedId={selectedId} emphasizedIds={highlightedIds} dimmedIds={dimmedIds} linkingFromId={linkingFromId} onSelect={setSelectedId} onConceptTarget={selectForEntanglement} onSavePositions={positions => savePositions.mutate({ positions })} /></div>
          <ConceptEditor concept={selected} onSave={values => saveConcept(values, selected)} onDelete={selected ? () => deleteConcept.mutate({ id: selected.id }) : undefined} onClose={() => setSelectedId(null)} isSaving={updateConcept.isPending} relatedEntanglements={selectedEntanglements} onEditEntanglement={item => { const target = entanglements.find(link => link.id === item.id) ?? null; setEditingEntanglement(target); }} />
        </section>
        <div className="workspace-bottom-hints"><button type="button" onClick={() => navigate("/extract")}><Wand2 size={15} /> Paste a resume to seed your graph</button><span>Graph positions persist when you drag a concept.</span></div>
      </main>
      <Dialog open={newConceptOpen} onOpenChange={setNewConceptOpen}><DialogContent className="concept-dialog"><DialogHeader><DialogTitle>Add a concept</DialogTitle><DialogDescription>Give a skill, interest, project, or idea a place in your field.</DialogDescription></DialogHeader><ConceptEditor concept={null} onSave={values => saveConcept(values)} onClose={() => setNewConceptOpen(false)} isSaving={createConcept.isPending} /></DialogContent></Dialog>
      <Dialog open={Boolean(entanglementTargetId)} onOpenChange={open => { if (!open) { setEntanglementTargetId(null); setLinkingFromId(null); } }}><DialogContent className="entanglement-dialog"><DialogHeader><DialogTitle>Name this Entanglement</DialogTitle><DialogDescription>Make the relationship legible now; you can always refine it later.</DialogDescription></DialogHeader><div className="entanglement-pair"><span>{concepts.find(concept => concept.id === linkingFromId)?.title}</span><Link2 size={17} /><span>{concepts.find(concept => concept.id === entanglementTargetId)?.title}</span></div><div className="form-field"><Label htmlFor="relationship">Relationship</Label><Input id="relationship" value={relationship} maxLength={120} onChange={event => setRelationship(event.target.value)} /></div><div className="form-field"><div className="range-label"><Label htmlFor="strength">Strength</Label><span>{strength}%</span></div><input id="strength" className="confidence-range" type="range" min="1" max="100" value={strength} onChange={event => setStrength(Number(event.target.value))} /></div><Button onClick={submitEntanglement} disabled={createEntanglement.isPending} className="primary-action">{createEntanglement.isPending ? "Creating…" : "Create Entanglement"}</Button></DialogContent></Dialog>
      <Dialog open={Boolean(editingEntanglement)} onOpenChange={open => !open && setEditingEntanglement(null)}><DialogContent className="entanglement-dialog"><DialogHeader><DialogTitle>Manage Entanglement</DialogTitle><DialogDescription>Adjust its label or strength, or remove it from your field.</DialogDescription></DialogHeader><div className="entanglement-pair"><span>{concepts.find(concept => concept.id === editingEntanglement?.sourceId)?.title}</span><Link2 size={17} /><span>{concepts.find(concept => concept.id === editingEntanglement?.targetId)?.title}</span></div><div className="form-field"><Label htmlFor="edit-relationship">Relationship</Label><Input id="edit-relationship" value={editingEntanglement?.relationship ?? ""} maxLength={120} onChange={event => setEditingEntanglement(current => current ? { ...current, relationship: event.target.value } : current)} /></div><div className="form-field"><div className="range-label"><Label htmlFor="edit-strength">Strength</Label><span>{editingEntanglement?.strength ?? 0}%</span></div><input id="edit-strength" className="confidence-range" type="range" min="1" max="100" value={editingEntanglement?.strength ?? 1} onChange={event => setEditingEntanglement(current => current ? { ...current, strength: Number(event.target.value) } : current)} /></div><div className="entanglement-manage-actions"><Button variant="outline" className="danger-button" onClick={() => editingEntanglement && deleteEntanglement.mutate({ id: editingEntanglement.id })}>Delete</Button><Button className="primary-action" disabled={updateEntanglement.isPending} onClick={() => editingEntanglement && updateEntanglement.mutate({ id: editingEntanglement.id, data: { relationship: editingEntanglement.relationship, strength: editingEntanglement.strength } })}>Save Entanglement</Button></div></DialogContent></Dialog>
    </div>
  );
}
