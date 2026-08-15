import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowUpRight, Menu, Moon, X } from "lucide-react";
import { Link, useLocation } from "wouter";

const unlockKey = "entangle-page-unlock-seen";
export const getWordRevealDelay = (index: number) => `${Math.max(0, index) * 55}ms`;
export const getHoldDuration = (duration: number) => Math.max(250, duration);

export function PageUnlock({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || window.sessionStorage.getItem(unlockKey)) return;
    setVisible(true);
    const timer = window.setTimeout(() => { window.sessionStorage.setItem(unlockKey, "1"); setVisible(false); }, 2500);
    return () => window.clearTimeout(timer);
  }, []);
  return <>{children}<div className={`page-unlock ${visible ? "is-visible" : ""}`} aria-hidden={!visible}><div className="unlock-inner"><span className="unlock-mark">◌</span><span className="unlock-brand">ENTANGLE</span><span className="unlock-tagline">make the between visible</span></div></div></>;
}

export function HoldButton({ children, onComplete, className = "", duration = 1000, disabled = false }: { children: ReactNode; onComplete: () => void; className?: string; duration?: number; disabled?: boolean }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);
  const finish = () => { if (timer.current !== null) window.clearTimeout(timer.current); timer.current = null; setHolding(false); };
  const safeDuration = getHoldDuration(duration);
  const start = () => { if (disabled || holding || timer.current !== null) return; setHolding(true); timer.current = window.setTimeout(() => { finish(); onComplete(); }, safeDuration); };
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);
  return <button type="button" disabled={disabled} className={`hold-button ${holding ? "is-holding" : ""} ${className}`} onPointerDown={start} onPointerUp={finish} onPointerLeave={finish} onPointerCancel={finish} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); start(); } }} onKeyUp={event => { if (event.key === "Enter" || event.key === " ") finish(); }}><span className="hold-progress" style={{ "--hold-duration": `${safeDuration}ms` } as CSSProperties} /><span className="hold-label">{children}</span></button>;
}

export function WordReveal({ children, className = "" }: { children: string; className?: string }) {
  const words = children.split(" ");
  return <span className={`word-reveal ${className}`}>{words.map((word, index) => <span className="word-reveal-word" style={{ "--word-delay": getWordRevealDelay(index) } as CSSProperties} key={`${word}-${index}`}>{word}{index < words.length - 1 ? " " : ""}</span>)}</span>;
}

const menuLinks = [["/", "The field"], ["/app", "Your workspace"], ["/discover", "Discover"], ["/extract", "Extract"], ["/superposition", "Superposition"]] as const;
export function ExpandMenu() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  return <><button type="button" className="expand-menu-trigger" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? <X size={19} /> : <Menu size={19} />}<span>{open ? "CLOSE" : "MENU"}</span></button><div className={`expand-menu ${open ? "is-open" : ""}`} aria-hidden={!open}><div className="expand-menu-grid" /><div className="expand-menu-content"><div className="expand-menu-top"><span>ENTANGLE / COGNITIVE FIELD</span><span>00 — {location.toUpperCase()}</span></div><nav aria-label="Primary navigation">{menuLinks.map(([href, label], index) => <Link href={href} key={href} onClick={() => setOpen(false)}><span>0{index + 1}</span>{label}<ArrowUpRight size={22} /></Link>)}</nav><p className="expand-menu-footer">A private instrument for seeing what is already connected.</p></div></div></>;
}

export function AnimatedGradient({ children, className = "" }: { children: ReactNode; className?: string }) { return <div className={`animated-gradient ${className}`}><div className="ambient-orb ambient-orb-one" /><div className="ambient-orb ambient-orb-two" /><div className="ambient-orb ambient-orb-three" /><div className="ambient-grid" />{children}</div>; }
export function BurnTransition() { return <div className="burn-transition" aria-hidden="true" />; }
export function AmbientSoundToggle() {
  const [on, setOn] = useState(false);
  const audio = useRef<{ context: AudioContext; oscillator: OscillatorNode; gain: GainNode } | null>(null);
  const toggle = () => {
    if (on && audio.current) { audio.current.gain.gain.exponentialRampToValueAtTime(0.0001, audio.current.context.currentTime + 0.2); audio.current.oscillator.stop(audio.current.context.currentTime + 0.25); audio.current = null; setOn(false); return; }
    if (on) return;
    const context = new AudioContext(); const oscillator = context.createOscillator(); const gain = context.createGain();
    oscillator.type = "sine"; oscillator.frequency.value = 174; gain.gain.value = 0.018; oscillator.connect(gain).connect(context.destination); oscillator.start(); audio.current = { context, oscillator, gain }; setOn(true);
  };
  useEffect(() => () => { if (audio.current) { audio.current.oscillator.stop(); void audio.current.context.close(); } }, []);
  return <button type="button" className="sound-toggle" aria-pressed={on} onClick={toggle}><Moon size={13} /> AMBIENT {on ? "ON" : "OFF"}</button>;
}
