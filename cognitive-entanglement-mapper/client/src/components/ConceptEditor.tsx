import { useEffect, useState } from "react";
import { ExternalLink, Link2, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { ConceptCategory, GraphConcept } from "@/lib/graph";
import { categoryMeta } from "@/lib/graph";

export type ConceptEditorValues = {
  title: string;
  description: string;
  category: ConceptCategory;
  confidence: number;
  tags: string[];
  urls: string[];
};

export type RelatedEntanglement = {
  id: number;
  otherTitle: string;
  relationship: string;
  strength: number;
};

const blankValues: ConceptEditorValues = { title: "", description: "", category: "idea", confidence: 70, tags: [], urls: [] };

export default function ConceptEditor({
  concept,
  onSave,
  onDelete,
  onClose,
  isSaving,
  relatedEntanglements = [],
  onEditEntanglement,
}: {
  concept: GraphConcept | null;
  onSave: (values: ConceptEditorValues) => void;
  onDelete?: () => void;
  onClose?: () => void;
  isSaving?: boolean;
  relatedEntanglements?: RelatedEntanglement[];
  onEditEntanglement?: (entanglement: RelatedEntanglement) => void;
}) {
  const [values, setValues] = useState<ConceptEditorValues>(blankValues);
  const [tagsInput, setTagsInput] = useState("");
  const [urlsInput, setUrlsInput] = useState("");

  useEffect(() => {
    const next = concept
      ? { title: concept.title, description: concept.description ?? "", category: concept.category, confidence: concept.confidence, tags: concept.tags, urls: concept.urls }
      : blankValues;
    setValues(next);
    setTagsInput(next.tags.join(", "));
    setUrlsInput(next.urls.join("\n"));
  }, [concept]);

  const set = <K extends keyof ConceptEditorValues>(key: K, value: ConceptEditorValues[K]) => setValues(previous => ({ ...previous, [key]: value }));
  const submit = () => {
    if (!values.title.trim()) return;
    onSave({
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
      tags: tagsInput.split(",").map(tag => tag.trim()).filter(Boolean),
      urls: urlsInput.split("\n").map(url => url.trim()).filter(Boolean),
    });
  };

  return (
    <aside className="detail-panel">
      <div className="detail-heading">
        <div><p className="eyebrow">{concept ? "Concept details" : "New concept"}</p><h2>{concept ? "Tune the signal" : "Place a signal"}</h2></div>
        {onClose && <button className="icon-button" type="button" onClick={onClose} aria-label="Close concept panel"><X size={18} /></button>}
      </div>
      <div className="editor-fields">
        <div className="form-field"><Label htmlFor="concept-title">Title</Label><Input id="concept-title" value={values.title} maxLength={180} onChange={event => set("title", event.target.value)} placeholder="e.g. Creative coding" /></div>
        <div className="form-field"><Label htmlFor="concept-description">Description</Label><Textarea id="concept-description" value={values.description} onChange={event => set("description", event.target.value)} placeholder="A short note on why this belongs in your map." rows={4} /></div>
        <div className="form-two-column">
          <div className="form-field"><Label htmlFor="concept-category">Category</Label><select id="concept-category" value={values.category} onChange={event => set("category", event.target.value as ConceptCategory)} className="field-select">{Object.entries(categoryMeta).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></div>
          <div className="form-field"><div className="range-label"><Label htmlFor="concept-confidence">Confidence</Label><span>{values.confidence}%</span></div><input id="concept-confidence" className="confidence-range" type="range" min="1" max="100" value={values.confidence} onChange={event => set("confidence", Number(event.target.value))} /></div>
        </div>
        <div className="form-field"><Label htmlFor="concept-tags">Tags</Label><Input id="concept-tags" value={tagsInput} onChange={event => setTagsInput(event.target.value)} placeholder="design, music, systems" /><p className="field-hint">Separate tags with commas.</p></div>
        <div className="form-field"><Label htmlFor="concept-urls">Related URLs</Label><Textarea id="concept-urls" value={urlsInput} onChange={event => setUrlsInput(event.target.value)} placeholder="https://example.com\nhttps://another.example" rows={3} /><p className="field-hint">One valid URL per line.</p></div>
      </div>
      {concept?.urls.length ? <div className="related-links">{concept.urls.slice(0, 2).map(url => <a key={url} href={url} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Open reference</a>)}</div> : null}
      {concept && relatedEntanglements.length ? <div className="related-entanglements"><div className="related-entanglements-title"><Link2 size={13} /> Entanglements</div>{relatedEntanglements.map(entanglement => <button key={entanglement.id} type="button" onClick={() => onEditEntanglement?.(entanglement)}><span><strong>{entanglement.relationship}</strong><small>with {entanglement.otherTitle}</small></span><em>{entanglement.strength}%</em></button>)}</div> : null}
      <div className="editor-actions">
        {concept && onDelete ? <Button variant="outline" className="danger-button" type="button" onClick={onDelete}><Trash2 size={15} /> Delete</Button> : <span />}
        <Button type="button" onClick={submit} disabled={!values.title.trim() || isSaving} className="primary-action"><Save size={15} /> {isSaving ? "Saving…" : concept ? "Save changes" : "Add concept"}</Button>
      </div>
    </aside>
  );
}
