import { ArrowDown, ArrowUpRight, Circle, Link2, Orbit, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { useLocation } from "wouter";
import { BurnTransition, HoldButton, WordReveal } from "@/components/Immersive";

const phases = [
  { value: "99", label: "Signal density", note: "Your field is ready to be mapped." },
  { value: "72", label: "Active concepts", note: "Ideas begin to find their neighbors." },
  { value: "41", label: "Open Entanglements", note: "The useful questions live between domains." },
  { value: "16", label: "Possible paths", note: "A small move can change the field." },
];

const fieldNodes = [
  { label: "skills", x: 33, y: 33, tone: "mint" },
  { label: "ideas", x: 64, y: 24, tone: "violet" },
  { label: "projects", x: 75, y: 58, tone: "yellow" },
  { label: "interests", x: 27, y: 68, tone: "blue" },
  { label: "you", x: 51, y: 52, tone: "white" },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const phase = phases[phaseIndex];
  const enter = () => isAuthenticated ? navigate("/app") : startLogin();

  useEffect(() => {
    const onScroll = () => {
      const next = Math.min(phases.length - 1, Math.floor(window.scrollY / Math.max(1, window.innerHeight * .7)));
      setPhaseIndex(next);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return <div className="zero-inspired-page">
    <section className="zero-field-hero" aria-label="Entangle interactive field preview">
      <div className="zero-field-glow" />
      <header className="zero-header"><button type="button" className="zero-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><Orbit size={19} /><span>ENTANGLE</span><small>/ COGNITIVE FIELD</small></button><div className="zero-header-meta"><span>01</span><span>MAP / EXPLORE / DECIDE</span><button type="button" onClick={enter}>{isAuthenticated ? "OPEN FIELD" : "SIGN IN"} <ArrowUpRight size={13} /></button></div></header>
      <div className="zero-axis zero-axis-top"><span>0123456789</span><span>FIELD / {phase.label.toUpperCase()}</span></div>
      <div className="zero-axis zero-axis-bottom"><span>-100 BZ</span><span>-75 BZ</span><span>-50 BZ</span><span>-25 BZ</span><span>0 BZ</span></div>
      <div className="zero-hero-copy"><p className="zero-kicker"><Circle size={7} fill="currentColor" /> COGNITIVE ENTANGLEMENT MAPPER</p><h1><WordReveal>Make the between visible.</WordReveal></h1><p className="zero-description">A living map for the skills, interests, projects, and ideas that shape what comes next.</p><HoldButton className="zero-primary" onComplete={() => { document.querySelector(".zero-story")?.scrollIntoView({ behavior: "smooth" }); }}>{isAuthenticated ? "OPEN YOUR FIELD" : "HOLD TO BEGIN"} <ArrowUpRight size={15} /></HoldButton></div>
      <div className="zero-number" aria-live="polite">{phase.value}<small>{phase.note}</small></div>
      <div className="zero-graph-preview">{fieldNodes.map((node, index) => <div key={node.label} className={`zero-node zero-node-${index} tone-${node.tone}`} style={{ left: `${node.x}%`, top: `${node.y}%` }}><i /><span>{node.label}</span></div>)}<svg viewBox="0 0 1000 680" preserveAspectRatio="none" aria-hidden="true"><path d="M330 224 C470 270 520 310 640 166 M640 166 C760 250 730 360 750 394 M330 224 C310 390 260 410 270 462 M270 462 C430 460 490 390 510 353 M510 353 C620 380 695 440 750 394" /><path d="M330 224 C510 190 700 260 750 394" className="soft-path" /></svg></div>
      <div className="zero-scroll-cue"><ArrowDown size={15} /><span>SCROLL</span><small>TO MOVE THROUGH THE FIELD</small></div>
      <div className="zero-degree"><span>degree</span><strong>{String(phaseIndex).padStart(2, "0")}</strong></div>
    </section>
    <section className="zero-story"><div className="zero-story-label">02 / THE FIELD</div><div className="zero-story-copy"><p className="zero-kicker"><Sparkles size={13} /> NOT A DATABASE</p><h2>Knowledge is not a list.<br /><em>It is a shape.</em></h2><p>Entangle gives the shape somewhere to move. Place a concept, name an Entanglement, and watch your field become more legible over time.</p><button type="button" className="zero-text-action" onClick={enter}>Enter the instrument <ArrowUpRight size={14} /></button></div><div className="zero-story-index">/ 02</div></section>\n    <BurnTransition />\n    <section className="zero-method"><div className="zero-method-header"><span>03 / HOW IT WORKS</span><h2>One field.<br /><em>Many directions.</em></h2></div><div className="zero-method-grid"><article><strong>01</strong><Link2 size={22} /><h3>Place signals</h3><p>Give your skills, interests, projects, and ideas a position in the field.</p></article><article><strong>02</strong><Circle size={22} /><h3>Name relationships</h3><p>Connect concepts with Entanglements that carry meaning and strength.</p></article><article><strong>03</strong><Orbit size={22} /><h3>Move through possibility</h3><p>Use AI discovery and Superposition to explore what is not obvious yet.</p></article></div></section>\n    <BurnTransition />\n    <section className="zero-final"><p className="zero-kicker">04 / BEGIN</p><h2>What is<br /><em>already connected?</em></h2><button type="button" className="zero-primary" onClick={enter}>{isAuthenticated ? "RETURN TO YOUR FIELD" : "CREATE YOUR FIELD"} <ArrowUpRight size={15} /></button></section>
    <footer className="zero-footer"><span>ENTANGLE / 2026</span><span>PRIVATE COGNITIVE MAPPING</span><span>SKILLS · IDEAS · PROJECTS · INTERESTS</span></footer>
  </div>;
}
