import { Activity, BrainCircuit, Compass, LogOut, Sparkles, Wand2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

const items = [
  { path: "/app", label: "Map", icon: Compass },
  { path: "/discover", label: "Discover", icon: Sparkles },
  { path: "/extract", label: "Extract", icon: Wand2 },
  { path: "/superposition", label: "Superposition", icon: BrainCircuit },
];

export default function AppHeader() {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  return (
    <header className="app-header field-header"><div className="field-header-line" aria-hidden="true" /><div className="field-header-coordinates">01 / FIELD ACTIVE</div>
      <button className="brand-mark" type="button" onClick={() => navigate("/app")} aria-label="Go to your map"><span className="brand-orbit" /><span>ENTANGLE</span></button>
      <nav className="app-nav" aria-label="Primary navigation">{items.map(item => { const Icon = item.icon; return <button key={item.path} type="button" className={location === item.path ? "active" : ""} onClick={() => navigate(item.path)}><Icon size={15} /> {item.label}</button>; })}</nav>
      <div className="header-right"><div className="signal-status"><Activity size={13} /> Graph active</div><button type="button" className="user-button" onClick={logout} title="Sign out"><span>{user?.name?.slice(0, 1).toUpperCase() || "U"}</span><LogOut size={14} /></button></div>
    </header>
  );
}
