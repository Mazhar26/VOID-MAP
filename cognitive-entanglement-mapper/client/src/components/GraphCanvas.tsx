import * as d3 from "d3";
import { MouseEvent, PointerEvent, WheelEvent, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minus, Move, Plus } from "lucide-react";
import type { GraphConcept, GraphEntanglement } from "@/lib/graph";
import { categoryMeta } from "@/lib/graph";

type LayoutNode = GraphConcept & { x: number; y: number; vx?: number; vy?: number };
type Transform = { x: number; y: number; k: number };
type Gesture =
  | { kind: "pan"; startX: number; startY: number; originX: number; originY: number }
  | { kind: "node"; id: number }
  | null;

const width = 1000;
const height = 680;

export default function GraphCanvas({
  concepts,
  entanglements,
  selectedId,
  emphasizedIds,
  dimmedIds,
  linkingFromId,
  onSelect,
  onConceptTarget,
  onSavePositions,
}: {
  concepts: GraphConcept[];
  entanglements: GraphEntanglement[];
  selectedId: number | null;
  emphasizedIds: Set<number>;
  dimmedIds: Set<number>;
  linkingFromId: number | null;
  onSelect: (id: number) => void;
  onConceptTarget: (id: number) => void;
  onSavePositions: (positions: Array<{ id: number; positionX: number; positionY: number }>) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<LayoutNode[]>([]);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 });
  const [gesture, setGesture] = useState<Gesture>(null);

  useEffect(() => {
    const nextNodes: LayoutNode[] = concepts.map((concept, index) => ({
      ...concept,
      x: concept.positionX || 500 + Math.cos(index * 1.8) * (150 + (index % 3) * 35),
      y: concept.positionY || 340 + Math.sin(index * 1.8) * (120 + (index % 4) * 22),
    }));
    if (!nextNodes.length) {
      setNodes([]);
      return;
    }
    const links = entanglements.map(link => ({ source: link.sourceId, target: link.targetId, strength: link.strength }));
    const simulation = d3
      .forceSimulation<LayoutNode>(nextNodes)
      .force("link", d3.forceLink<LayoutNode, { source: number; target: number; strength: number }>(links).id(node => node.id).distance(link => 165 - link.strength * 0.65).strength(0.32))
      .force("charge", d3.forceManyBody().strength(-580))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(56))
      .alpha(0.9)
      .alphaDecay(0.036)
      .on("tick", () => setNodes(nextNodes.map(node => ({ ...node }))));
    return () => {
      simulation.stop();
    };
  }, [concepts, entanglements]);

  const byId = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes]);

  const graphPoint = (event: PointerEvent<SVGSVGElement> | WheelEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const y = ((event.clientY - rect.top) / rect.height) * height;
    return { x: (x - transform.x) / transform.k, y: (y - transform.y) / transform.k };
  };

  const saveCurrentPositions = (currentNodes: LayoutNode[]) => {
    onSavePositions(currentNodes.map(node => ({ id: node.id, positionX: Math.round(node.x), positionY: Math.round(node.y) })));
  };

  const beginNodeGesture = (event: PointerEvent<SVGGElement>, id: number) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setGesture({ kind: "node", id });
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    const target = event.target as Element;
    if (target.closest("[data-graph-node]")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setGesture({ kind: "pan", startX: event.clientX, startY: event.clientY, originX: transform.x, originY: transform.y });
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!gesture) return;
    if (gesture.kind === "pan") {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTransform(previous => ({
        ...previous,
        x: gesture.originX + ((event.clientX - gesture.startX) / rect.width) * width,
        y: gesture.originY + ((event.clientY - gesture.startY) / rect.height) * height,
      }));
      return;
    }
    const point = graphPoint(event);
    setNodes(current => current.map(node => (node.id === gesture.id ? { ...node, x: point.x, y: point.y } : node)));
  };

  const handlePointerUp = () => {
    if (gesture?.kind === "node") saveCurrentPositions(nodes);
    setGesture(null);
  };

  const handleWheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const point = graphPoint(event);
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    setTransform(previous => {
      const nextK = Math.min(2.4, Math.max(0.55, previous.k * factor));
      return { k: nextK, x: previous.x + point.x * (previous.k - nextK), y: previous.y + point.y * (previous.k - nextK) };
    });
  };

  const zoom = (factor: number) => setTransform(previous => ({ ...previous, k: Math.min(2.4, Math.max(0.55, previous.k * factor)) }));
  const reset = () => setTransform({ x: 0, y: 0, k: 1 });

  const handleNodeClick = (event: MouseEvent<SVGGElement>, id: number) => {
    event.stopPropagation();
    if (linkingFromId && linkingFromId !== id) onConceptTarget(id);
    else onSelect(id);
  };

  return (
    <div className="graph-canvas-shell">
      <div className="canvas-atmosphere" />
      <div className="canvas-grid-label">KNOWLEDGE FIELD · LIVE</div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="graph-svg"
        aria-label="Interactive knowledge graph"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      >
        <defs>
          <pattern id="graph-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,.045)" strokeWidth="1" />
          </pattern>
          <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect width={width} height={height} fill="url(#graph-grid)" />
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {entanglements.map(link => {
            const source = byId.get(link.sourceId);
            const target = byId.get(link.targetId);
            if (!source || !target) return null;
            const isMuted = dimmedIds.has(link.sourceId) || dimmedIds.has(link.targetId);
            const midpointX = (source.x + target.x) / 2;
            const midpointY = (source.y + target.y) / 2;
            return (
              <g key={link.id} opacity={isMuted ? 0.11 : 0.64}>
                <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="rgba(201,232,255,.66)" strokeWidth={1 + link.strength / 44} />
                <rect x={midpointX - 31} y={midpointY - 9} width="62" height="18" rx="9" fill="rgba(8, 13, 25, .72)" />
                <text x={midpointX} y={midpointY + 3} textAnchor="middle" className="graph-link-label">{link.relationship}</text>
              </g>
            );
          })}
          {nodes.map(node => {
            const meta = categoryMeta[node.category];
            const isSelected = selectedId === node.id || linkingFromId === node.id;
            const isMuted = dimmedIds.has(node.id);
            const isEmphasized = emphasizedIds.has(node.id);
            return (
              <g
                data-graph-node
                key={node.id}
                transform={`translate(${node.x} ${node.y})`}
                onPointerDown={event => beginNodeGesture(event, node.id)}
                onClick={event => handleNodeClick(event, node.id)}
                className="graph-node"
                opacity={isMuted ? 0.24 : 1}
                tabIndex={0}
                role="button"
                aria-label={`Concept: ${node.title}`}
              >
                {(isSelected || isEmphasized) && <circle r="42" fill="none" stroke={meta.color} strokeWidth="1" opacity="0.6" filter="url(#node-glow)" />}
                <circle r={isSelected ? 29 : 26} fill={meta.accent} stroke={meta.color} strokeWidth={isSelected ? 2.2 : 1.3} />
                <circle r="8" fill={meta.color} />
                <text y="47" textAnchor="middle" className="graph-node-label">{node.title.length > 20 ? `${node.title.slice(0, 20)}…` : node.title}</text>
              </g>
            );
          })}
        </g>
      </svg>
      {!concepts.length && (
        <div className="graph-empty-state">
          <div className="empty-orbit"><span /></div>
          <h3>Your field is open</h3>
          <p>Create a first concept or extract one from your resume to begin mapping your entanglements.</p>
        </div>
      )}
      <div className="canvas-help"><Move size={14} /> Drag nodes · Scroll to zoom · Click the field to pan</div>
      <div className="canvas-controls" aria-label="Canvas zoom controls">
        <button type="button" onClick={() => zoom(1.12)} aria-label="Zoom in"><Plus size={16} /></button>
        <button type="button" onClick={() => zoom(0.88)} aria-label="Zoom out"><Minus size={16} /></button>
        <button type="button" onClick={reset} aria-label="Reset view"><Maximize2 size={15} /></button>
      </div>
    </div>
  );
}
