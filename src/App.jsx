import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── Constants ───
const NODE_TYPES = [
  { value: "host", label: "Host", color: "#4FC3F7" },
  { value: "user", label: "User", color: "#81C784" },
  { value: "ip", label: "IP Address", color: "#FFB74D" },
  { value: "domain", label: "Domain", color: "#BA68C8" },
  { value: "file", label: "File", color: "#E57373" },
  { value: "process", label: "Process", color: "#FF8A65" },
  { value: "email", label: "Email Address", color: "#4DB6AC" },
  { value: "registry", label: "Registry Key", color: "#A1887F" },
  { value: "custom", label: "Custom", color: "#90A4AE" },
];

const getNodeColor = (type) =>
  NODE_TYPES.find((t) => t.value === type)?.color || "#90A4AE";

const genId = () => Math.random().toString(36).substr(2, 9);

const STORAGE_KEY = "investigation-graph-data";

// ─── Force Simulation (simple spring-based) ───
function useForceLayout(nodes, edges, positions, setPositions, graphWidth, graphHeight) {
  const animRef = useRef(null);
  const runningRef = useRef(false);
  const iterRef = useRef(0);

  const runSimulation = useCallback(() => {
    if (!nodes.length) return;
    runningRef.current = true;
    iterRef.current = 0;

    const pos = { ...positions };
    nodes.forEach((n) => {
      if (!pos[n.id]) {
        pos[n.id] = {
          x: graphWidth / 2 + (Math.random() - 0.5) * 400,
          y: graphHeight / 2 + (Math.random() - 0.5) * 400,
          vx: 0,
          vy: 0,
          pinned: false,
        };
      }
    });

    const step = () => {
      iterRef.current++;
      if (iterRef.current > 300 || !runningRef.current) {
        runningRef.current = false;
        return;
      }
      const alpha = Math.max(0.01, 1 - iterRef.current / 300);
      const newPos = { ...pos };

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = newPos[nodes[i].id];
          const b = newPos[nodes[j].id];
          if (!a || !b) continue;
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          let force = (800 / (dist * dist)) * alpha;
          if (!a.pinned) { a.x -= (dx / dist) * force; a.y -= (dy / dist) * force; }
          if (!b.pinned) { b.x += (dx / dist) * force; b.y += (dy / dist) * force; }
        }
      }

      edges.forEach((e) => {
        const a = newPos[e.source];
        const b = newPos[e.target];
        if (!a || !b) return;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        let force = ((dist - 150) * 0.05) * alpha;
        if (!a.pinned) { a.x += (dx / dist) * force; a.y += (dy / dist) * force; }
        if (!b.pinned) { b.x -= (dx / dist) * force; b.y -= (dy / dist) * force; }
      });

      nodes.forEach((n) => {
        const p = newPos[n.id];
        if (!p || p.pinned) return;
        p.x += (graphWidth / 2 - p.x) * 0.01 * alpha;
        p.y += (graphHeight / 2 - p.y) * 0.01 * alpha;
      });

      Object.keys(newPos).forEach((k) => {
        pos[k] = { ...newPos[k] };
      });
      setPositions({ ...pos });
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  }, [nodes, edges, positions, setPositions, graphWidth, graphHeight]);

  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return { runSimulation, stopSimulation: () => { runningRef.current = false; } };
}

// ─── Arrow Marker Definitions ───
function SvgDefs() {
  return (
    <defs>
      <marker id="arrow-uni" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse" fill="#9E9E9E">
        <path d="M 0 0 L 10 5 L 0 10 z" />
      </marker>
      <marker id="arrow-bi-end" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto" fill="#9E9E9E">
        <path d="M 0 0 L 10 5 L 0 10 z" />
      </marker>
      <marker id="arrow-bi-start" viewBox="0 0 10 10" refX="-18" refY="5" markerWidth="6" markerHeight="6" orient="auto" fill="#9E9E9E">
        <path d="M 10 0 L 0 5 L 10 10 z" />
      </marker>
    </defs>
  );
}

// ─── Modal Component ───
function Modal({ title, onClose, children, width = 420 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#1E1E2E", border: "1px solid #333", borderRadius: 12, padding: 24, width, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: "#E0E0E0", fontSize: 16, fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 20, padding: 4 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Form Elements ───
const inputStyle = { width: "100%", padding: "8px 12px", background: "#2A2A3C", border: "1px solid #444", borderRadius: 6, color: "#E0E0E0", fontSize: 13, outline: "none", boxSizing: "border-box" };
const selectStyle = { ...inputStyle, cursor: "pointer" };
const btnPrimary = { padding: "8px 16px", background: "#4FC3F7", color: "#111", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 };
const btnSecondary = { padding: "8px 16px", background: "#333", color: "#ccc", border: "1px solid #555", borderRadius: 6, cursor: "pointer", fontSize: 13 };
const btnDanger = { padding: "8px 16px", background: "#c0392b", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 };
const labelStyle = { display: "block", color: "#999", fontSize: 12, marginBottom: 4, marginTop: 12 };

// ─── Main App ───
export default function InvestigationGraph() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [findings, setFindings] = useState([]);
  const [positions, setPositions] = useState({});
  const [view, setView] = useState("graph");
  const [loaded, setLoaded] = useState(false);

  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [showAddNode, setShowAddNode] = useState(false);
  const [showAddEdge, setShowAddEdge] = useState(false);
  const [showAddFinding, setShowAddFinding] = useState(false);
  const [showFindings, setShowFindings] = useState(false);
  const [showFindingsOnTimeline, setShowFindingsOnTimeline] = useState(false);
  const [edgeSourceId, setEdgeSourceId] = useState(null);
  const [editingFinding, setEditingFinding] = useState(null);

  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const graphWidth = 2000;
  const graphHeight = 2000;

  const { runSimulation } = useForceLayout(nodes, edges, positions, setPositions, graphWidth, graphHeight);

  // ─── Persistence via localStorage ───
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setNodes(parsed.nodes || []);
        setEdges(parsed.edges || []);
        setFindings(parsed.findings || []);
        setPositions(parsed.positions || {});
      }
    } catch (e) {
      console.log("No saved data found");
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges, findings, positions }));
      } catch (e) {
        console.error("Save failed:", e);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [nodes, edges, findings, positions, loaded]);

  // ─── Node CRUD ───
  const addNode = (node) => {
    const newNode = { ...node, id: genId() };
    setNodes((prev) => [...prev, newNode]);
    setPositions((prev) => ({
      ...prev,
      [newNode.id]: {
        x: graphWidth / 2 + (Math.random() - 0.5) * 200,
        y: graphHeight / 2 + (Math.random() - 0.5) * 200,
        vx: 0, vy: 0, pinned: false,
      },
    }));
    setTimeout(runSimulation, 100);
  };

  const updateNode = (id, updates) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  };

  const deleteNode = (id) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    setPositions((prev) => { const p = { ...prev }; delete p[id]; return p; });
    setSelectedNode(null);
  };

  // ─── Edge CRUD ───
  const addEdge = (edge) => {
    setEdges((prev) => [...prev, { ...edge, id: genId() }]);
    setTimeout(runSimulation, 100);
  };

  const updateEdge = (id, updates) => {
    setEdges((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const deleteEdge = (id) => {
    setEdges((prev) => prev.filter((e) => e.id !== id));
    setSelectedEdge(null);
  };

  // ─── Finding CRUD ───
  const addFinding = (finding) => {
    setFindings((prev) => [...prev, { ...finding, id: genId() }]);
  };

  const updateFinding = (id, updates) => {
    setFindings((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const deleteFinding = (id) => {
    setFindings((prev) => prev.filter((f) => f.id !== id));
    setEditingFinding(null);
  };

  // ─── Import / Export ───
  const handleExport = () => {
    const data = JSON.stringify({ nodes, edges, findings, positions }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `investigation-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.nodes) setNodes(data.nodes);
          if (data.edges) setEdges(data.edges);
          if (data.findings) setFindings(data.findings);
          if (data.positions) setPositions(data.positions);
        } catch (err) {
          alert("Invalid JSON file");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClearAll = () => {
    if (confirm("Clear all investigation data? This cannot be undone.")) {
      setNodes([]);
      setEdges([]);
      setFindings([]);
      setPositions({});
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  };

  // ─── Graph Mouse Handlers ───
  const handleSvgMouseDown = (e) => {
    if (e.target === svgRef.current || e.target.tagName === "rect") {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  };

  const handleSvgMouseMove = (e) => {
    if (isPanning) {
      setPan({
        x: panStart.current.panX + (e.clientX - panStart.current.x),
        y: panStart.current.panY + (e.clientY - panStart.current.y),
      });
    }
    if (dragging) {
      const svg = svgRef.current;
      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      setPositions((prev) => ({
        ...prev,
        [dragging]: { ...prev[dragging], x, y, pinned: true },
      }));
    }
  };

  const handleSvgMouseUp = () => {
    setIsPanning(false);
    setDragging(null);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.min(3, Math.max(0.2, z * delta)));
  };

  const handleNodeClick = (nodeId) => {
    if (edgeSourceId) {
      if (edgeSourceId !== nodeId) {
        setShowAddEdge({ source: edgeSourceId, target: nodeId });
      }
      setEdgeSourceId(null);
    } else {
      setSelectedNode(nodeId);
      setSelectedEdge(null);
    }
  };

  const handleEdgeClick = (edgeId, e) => {
    e.stopPropagation();
    setSelectedEdge(edgeId);
    setSelectedNode(null);
  };

  // ─── Timeline data ───
  const timelineItems = useMemo(() => {
    const items = [];

    edges.forEach((e) => {
      if (e.timestamp) {
        const srcNode = nodes.find((n) => n.id === e.source);
        const tgtNode = nodes.find((n) => n.id === e.target);
        if (srcNode && tgtNode) {
          const arrow = e.directionality === "bi" ? "↔" : e.directionality === "none" ? "—" : "→";
          items.push({
            type: "edge",
            timestamp: e.timestamp,
            sourceType: srcNode.type,
            targetType: tgtNode.type,
            sourceLabel: srcNode.label,
            targetLabel: tgtNode.label,
            edgeLabel: e.label,
            arrow,
          });
        }
      }
    });

    nodes.forEach((n) => {
      if (n.timestamp) {
        items.push({
          type: "node",
          timestamp: n.timestamp,
          label: n.label,
          nodeType: n.type,
          notes: n.notes,
        });
      }
    });

    if (showFindingsOnTimeline) {
      findings.forEach((f) => {
        if (f.timestamp) {
          items.push({
            type: "finding",
            timestamp: f.timestamp,
            label: f.text,
          });
        }
      });
    }

    items.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return items;
  }, [nodes, edges, findings, showFindingsOnTimeline]);

  if (!loaded) {
    return (
      <div style={{ background: "#14141F", color: "#E0E0E0", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ background: "#14141F", color: "#E0E0E0", height: "100vh", display: "flex", flexDirection: "column", fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace", fontSize: 13, overflow: "hidden", userSelect: "none" }}>
      {/* ─── Top Bar ─── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #2A2A3C", background: "#1A1A28", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#4FC3F7", letterSpacing: 1 }}>⬡ BreadCrumbs</span>
          <div style={{ display: "flex", gap: 2, background: "#222236", borderRadius: 6, padding: 2 }}>
            <button onClick={() => setView("graph")} style={{ padding: "6px 14px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: view === "graph" ? "#4FC3F7" : "transparent", color: view === "graph" ? "#111" : "#888", fontFamily: "inherit" }}>Graph</button>
            <button onClick={() => setView("timeline")} style={{ padding: "6px 14px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: view === "timeline" ? "#4FC3F7" : "transparent", color: view === "timeline" ? "#111" : "#888", fontFamily: "inherit" }}>Timeline</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: "#555", fontSize: 11 }}>{nodes.length} nodes · {edges.length} edges</span>
          <button onClick={handleImport} style={{ ...btnSecondary, fontSize: 11, padding: "5px 10px", fontFamily: "inherit" }}>Import</button>
          <button onClick={handleExport} style={{ ...btnSecondary, fontSize: 11, padding: "5px 10px", fontFamily: "inherit" }}>Export</button>
          <button onClick={handleClearAll} style={{ ...btnSecondary, fontSize: 11, padding: "5px 10px", borderColor: "#6b3030", color: "#e57373", fontFamily: "inherit" }}>Clear</button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {view === "graph" && (
          <>
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 12, left: 12, zIndex: 10, display: "flex", gap: 6 }}>
                <button onClick={() => setShowAddNode(true)} style={{ ...btnPrimary, fontSize: 11, padding: "6px 12px", fontFamily: "inherit" }}>+ Node</button>
                <button onClick={() => {
                  if (nodes.length < 2) { alert("Add at least 2 nodes first."); return; }
                  setEdgeSourceId("__picking__");
                }} style={{ ...btnSecondary, fontSize: 11, padding: "6px 12px", fontFamily: "inherit" }}>+ Edge</button>
                <button onClick={() => setShowFindings(!showFindings)} style={{ ...btnSecondary, fontSize: 11, padding: "6px 12px", fontFamily: "inherit", background: showFindings ? "#333" : "transparent" }}>Findings {findings.length > 0 && `(${findings.length})`}</button>
                <button onClick={runSimulation} style={{ ...btnSecondary, fontSize: 11, padding: "6px 12px", fontFamily: "inherit" }}>Re-layout</button>
              </div>

              {edgeSourceId && (
                <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 10, background: "#FFB74D", color: "#111", padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                  {edgeSourceId === "__picking__" ? "Click SOURCE node..." : "Now click TARGET node..."}
                  <button onClick={() => setEdgeSourceId(null)} style={{ marginLeft: 12, background: "none", border: "none", cursor: "pointer", fontWeight: 700, color: "#333" }}>Cancel</button>
                </div>
              )}

              <svg
                ref={svgRef}
                style={{ width: "100%", height: "100%", cursor: isPanning ? "grabbing" : dragging ? "grabbing" : "grab" }}
                onMouseDown={handleSvgMouseDown}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onMouseLeave={handleSvgMouseUp}
                onWheel={handleWheel}
              >
                <rect width="100%" height="100%" fill="#14141F" />
                <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E1E2E" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect x="-2000" y="-2000" width="6000" height="6000" fill="url(#grid)" />
                  <SvgDefs />

                  {edges.map((edge) => {
                    const sp = positions[edge.source];
                    const tp = positions[edge.target];
                    if (!sp || !tp) return null;
                    const mx = (sp.x + tp.x) / 2;
                    const my = (sp.y + tp.y) / 2;
                    const markerEnd = edge.directionality === "none" ? undefined : "url(#arrow-uni)";
                    const markerStart = edge.directionality === "bi" ? "url(#arrow-bi-start)" : undefined;
                    const isSelected = selectedEdge === edge.id;
                    return (
                      <g key={edge.id} onClick={(e) => handleEdgeClick(edge.id, e)} style={{ cursor: "pointer" }}>
                        <line x1={sp.x} y1={sp.y} x2={tp.x} y2={tp.y} stroke={isSelected ? "#FFB74D" : "#555"} strokeWidth={isSelected ? 2.5 : 1.5} markerEnd={markerEnd} markerStart={markerStart} />
                        <line x1={sp.x} y1={sp.y} x2={tp.x} y2={tp.y} stroke="transparent" strokeWidth={12} />
                        <text x={mx} y={my - 8} textAnchor="middle" fill={isSelected ? "#FFB74D" : "#888"} fontSize={10} fontFamily="inherit">{edge.label}</text>
                        {edge.timestamp && <text x={mx} y={my + 6} textAnchor="middle" fill="#555" fontSize={8} fontFamily="inherit">{edge.timestamp}</text>}
                      </g>
                    );
                  })}

                  {nodes.map((node) => {
                    const pos = positions[node.id];
                    if (!pos) return null;
                    const color = getNodeColor(node.type);
                    const isSelected = selectedNode === node.id;
                    const isEdgeSource = edgeSourceId === node.id;
                    return (
                      <g
                        key={node.id}
                        transform={`translate(${pos.x},${pos.y})`}
                        style={{ cursor: edgeSourceId ? "crosshair" : "pointer" }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          if (edgeSourceId === "__picking__") {
                            setEdgeSourceId(node.id);
                            return;
                          }
                          if (edgeSourceId && edgeSourceId !== "__picking__") {
                            handleNodeClick(node.id);
                            return;
                          }
                          setDragging(node.id);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!edgeSourceId) handleNodeClick(node.id);
                        }}
                      >
                        <circle r={isSelected ? 20 : 16} fill={color + "22"} stroke={isSelected ? "#fff" : isEdgeSource ? "#FFB74D" : color} strokeWidth={isSelected ? 2.5 : 1.5} />
                        <circle r={6} fill={color} />
                        <text y={-24} textAnchor="middle" fill="#E0E0E0" fontSize={11} fontWeight={600} fontFamily="inherit">{node.label}</text>
                        <text y={30} textAnchor="middle" fill="#666" fontSize={9} fontFamily="inherit">{NODE_TYPES.find(t => t.value === node.type)?.label}</text>
                      </g>
                    );
                  })}
                </g>
              </svg>

              <div style={{ position: "absolute", bottom: 12, right: 12, color: "#444", fontSize: 11 }}>{Math.round(zoom * 100)}%</div>
            </div>

            {selectedNode && (() => {
              const node = nodes.find((n) => n.id === selectedNode);
              if (!node) return null;
              const connEdges = edges.filter((e) => e.source === node.id || e.target === node.id);
              return (
                <div style={{ width: 300, borderLeft: "1px solid #2A2A3C", background: "#1A1A28", padding: 16, overflowY: "auto", flexShrink: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ margin: 0, color: getNodeColor(node.type), fontSize: 14 }}>Node Details</h3>
                    <button onClick={() => setSelectedNode(null)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 16 }}>✕</button>
                  </div>
                  <label style={labelStyle}>Type</label>
                  <select value={node.type} onChange={(e) => updateNode(node.id, { type: e.target.value })} style={{ ...selectStyle, fontFamily: "inherit" }}>
                    {NODE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <label style={labelStyle}>Label</label>
                  <input value={node.label} onChange={(e) => updateNode(node.id, { label: e.target.value })} style={{ ...inputStyle, fontFamily: "inherit" }} />
                  <label style={labelStyle}>Timestamp (optional)</label>
                  <input value={node.timestamp || ""} onChange={(e) => updateNode(node.id, { timestamp: e.target.value })} placeholder="YYYY-MM-DD HH:MM:SS" style={{ ...inputStyle, fontFamily: "inherit" }} />
                  <label style={labelStyle}>Notes</label>
                  <textarea value={node.notes || ""} onChange={(e) => updateNode(node.id, { notes: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
                  {connEdges.length > 0 && (
                    <>
                      <label style={{ ...labelStyle, marginTop: 20 }}>Connected Edges ({connEdges.length})</label>
                      {connEdges.map((e) => {
                        const other = nodes.find((n) => n.id === (e.source === node.id ? e.target : e.source));
                        const direction = e.source === node.id ? "→" : "←";
                        return (
                          <div key={e.id} onClick={() => { setSelectedEdge(e.id); setSelectedNode(null); }} style={{ padding: "6px 8px", margin: "4px 0", background: "#222236", borderRadius: 4, cursor: "pointer", fontSize: 11, color: "#aaa" }}>
                            {direction} {e.label} — {other?.label || "?"}
                          </div>
                        );
                      })}
                    </>
                  )}
                  <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
                    <button onClick={() => deleteNode(node.id)} style={{ ...btnDanger, fontSize: 11, fontFamily: "inherit" }}>Delete Node</button>
                  </div>
                </div>
              );
            })()}

            {selectedEdge && (() => {
              const edge = edges.find((e) => e.id === selectedEdge);
              if (!edge) return null;
              const srcNode = nodes.find((n) => n.id === edge.source);
              const tgtNode = nodes.find((n) => n.id === edge.target);
              return (
                <div style={{ width: 300, borderLeft: "1px solid #2A2A3C", background: "#1A1A28", padding: 16, overflowY: "auto", flexShrink: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ margin: 0, color: "#FFB74D", fontSize: 14 }}>Edge Details</h3>
                    <button onClick={() => setSelectedEdge(null)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 16 }}>✕</button>
                  </div>
                  <label style={labelStyle}>Source</label>
                  <div style={{ padding: "6px 10px", background: "#222236", borderRadius: 4, color: getNodeColor(srcNode?.type), fontSize: 12, marginBottom: 4 }}>{srcNode?.label || "?"}</div>
                  <label style={labelStyle}>Target</label>
                  <div style={{ padding: "6px 10px", background: "#222236", borderRadius: 4, color: getNodeColor(tgtNode?.type), fontSize: 12, marginBottom: 4 }}>{tgtNode?.label || "?"}</div>
                  <label style={labelStyle}>Relationship Label</label>
                  <input value={edge.label} onChange={(e) => updateEdge(edge.id, { label: e.target.value })} style={{ ...inputStyle, fontFamily: "inherit" }} />
                  <label style={labelStyle}>Timestamp</label>
                  <input value={edge.timestamp || ""} onChange={(e) => updateEdge(edge.id, { timestamp: e.target.value })} placeholder="YYYY-MM-DD HH:MM:SS" style={{ ...inputStyle, fontFamily: "inherit" }} />
                  <label style={labelStyle}>Directionality</label>
                  <select value={edge.directionality || "uni"} onChange={(e) => updateEdge(edge.id, { directionality: e.target.value })} style={{ ...selectStyle, fontFamily: "inherit" }}>
                    <option value="uni">Unidirectional →</option>
                    <option value="bi">Bidirectional ↔</option>
                    <option value="none">Non-directional —</option>
                  </select>
                  <div style={{ marginTop: 20 }}>
                    <button onClick={() => deleteEdge(edge.id)} style={{ ...btnDanger, fontSize: 11, fontFamily: "inherit" }}>Delete Edge</button>
                  </div>
                </div>
              );
            })()}

            {showFindings && !selectedNode && !selectedEdge && (
              <div style={{ width: 300, borderLeft: "1px solid #2A2A3C", background: "#1A1A28", padding: 16, overflowY: "auto", flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ margin: 0, color: "#90A4AE", fontSize: 14 }}>Notable Findings</h3>
                  <button onClick={() => setShowFindings(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 16 }}>✕</button>
                </div>
                <button onClick={() => setShowAddFinding(true)} style={{ ...btnPrimary, fontSize: 11, width: "100%", marginBottom: 12, fontFamily: "inherit" }}>+ Add Finding</button>
                {findings.length === 0 && <p style={{ color: "#555", fontSize: 12, textAlign: "center", marginTop: 20 }}>No findings yet.</p>}
                {findings.map((f) => (
                  <div key={f.id} style={{ padding: 10, margin: "6px 0", background: "#222236", borderRadius: 6, borderLeft: "3px solid #90A4AE" }}>
                    <div style={{ fontSize: 12, color: "#ccc", marginBottom: 4 }}>{f.text}</div>
                    {f.timestamp && <div style={{ fontSize: 10, color: "#666" }}>{f.timestamp}</div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button onClick={() => setEditingFinding(f)} style={{ background: "none", border: "none", color: "#4FC3F7", cursor: "pointer", fontSize: 11, padding: 0 }}>Edit</button>
                      <button onClick={() => deleteFinding(f.id)} style={{ background: "none", border: "none", color: "#E57373", cursor: "pointer", fontSize: 11, padding: 0 }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {view === "timeline" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 16, color: "#E0E0E0" }}>Event Timeline</h2>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#888" }}>
                <input type="checkbox" checked={showFindingsOnTimeline} onChange={(e) => setShowFindingsOnTimeline(e.target.checked)} style={{ accentColor: "#4FC3F7" }} />
                Show Notable Findings
              </label>
            </div>

            {timelineItems.length === 0 && (
              <div style={{ textAlign: "center", color: "#555", marginTop: 60, fontSize: 13 }}>
                No timestamped events yet. Add timestamps to nodes and edges to populate the timeline.
              </div>
            )}

            <div style={{ position: "relative", paddingLeft: 32 }}>
              {timelineItems.length > 0 && (
                <div style={{ position: "absolute", left: 10, top: 0, bottom: 0, width: 2, background: "#2A2A3C" }} />
              )}

              {timelineItems.map((item, i) => (
                <div key={i} style={{ position: "relative", marginBottom: 16, paddingLeft: 20 }}>
                  <div style={{
                    position: "absolute", left: -26, top: 6, width: 10, height: 10, borderRadius: "50%",
                    background: item.type === "finding" ? "#90A4AE" : item.type === "edge" ? "#FFB74D" : getNodeColor(item.nodeType),
                    border: "2px solid #14141F",
                  }} />
                  <div style={{
                    padding: 12, background: item.type === "finding" ? "#1E1E2E" : "#1A1A28",
                    borderRadius: 8, border: `1px solid ${item.type === "finding" ? "#333" : "#2A2A3C"}`,
                    opacity: item.type === "finding" ? 0.7 : 1,
                  }}>
                    <div style={{ fontSize: 10, color: "#666", marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>{item.timestamp}</div>
                    {item.type === "edge" && (
                      <div style={{ fontSize: 12, color: "#E0E0E0" }}>
                        <span style={{ color: getNodeColor(item.sourceType), fontWeight: 600 }}>{item.sourceLabel}</span>
                        <span style={{ color: "#888" }}> {item.arrow} {item.edgeLabel} {item.arrow} </span>
                        <span style={{ color: getNodeColor(item.targetType), fontWeight: 600 }}>{item.targetLabel}</span>
                      </div>
                    )}
                    {item.type === "node" && (
                      <div style={{ fontSize: 12 }}>
                        <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: 3, background: getNodeColor(item.nodeType) + "22", color: getNodeColor(item.nodeType), fontSize: 10, marginRight: 6 }}>{item.nodeType}</span>
                        <span style={{ color: "#E0E0E0" }}>{item.label}</span>
                        {item.notes && <div style={{ color: "#777", fontSize: 11, marginTop: 4 }}>{item.notes}</div>}
                      </div>
                    )}
                    {item.type === "finding" && (
                      <div style={{ fontSize: 12, color: "#999", fontStyle: "italic" }}>📝 {item.label}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAddNode && <AddNodeModal onAdd={(n) => { addNode(n); setShowAddNode(false); }} onClose={() => setShowAddNode(false)} />}
      {typeof showAddEdge === "object" && showAddEdge && (
        <AddEdgeModal source={showAddEdge.source} target={showAddEdge.target} nodes={nodes} onAdd={(e) => { addEdge(e); setShowAddEdge(false); }} onClose={() => setShowAddEdge(false)} />
      )}
      {showAddFinding && <AddFindingModal onAdd={(f) => { addFinding(f); setShowAddFinding(false); }} onClose={() => setShowAddFinding(false)} />}
      {editingFinding && (
        <EditFindingModal finding={editingFinding} onSave={(updates) => { updateFinding(editingFinding.id, updates); setEditingFinding(null); }} onClose={() => setEditingFinding(null)} />
      )}
    </div>
  );
}

// ─── Add Node Modal ───
function AddNodeModal({ onAdd, onClose }) {
  const [type, setType] = useState("host");
  const [label, setLabel] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <Modal title="Add Node" onClose={onClose}>
      <label style={labelStyle}>Type</label>
      <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...selectStyle, fontFamily: "inherit" }}>
        {NODE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <label style={labelStyle}>Label</label>
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g., 192.168.1.50" style={{ ...inputStyle, fontFamily: "inherit" }} autoFocus />
      <label style={labelStyle}>Timestamp (optional)</label>
      <input value={timestamp} onChange={(e) => setTimestamp(e.target.value)} placeholder="YYYY-MM-DD HH:MM:SS" style={{ ...inputStyle, fontFamily: "inherit" }} />
      <label style={labelStyle}>Notes (optional)</label>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
      <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ ...btnSecondary, fontFamily: "inherit" }}>Cancel</button>
        <button onClick={() => { if (!label.trim()) return; onAdd({ type, label: label.trim(), timestamp: timestamp || null, notes: notes || null }); }} style={{ ...btnPrimary, fontFamily: "inherit", opacity: label.trim() ? 1 : 0.4 }}>Add Node</button>
      </div>
    </Modal>
  );
}

// ─── Add Edge Modal ───
function AddEdgeModal({ source, target, nodes, onAdd, onClose }) {
  const [label, setLabel] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [directionality, setDirectionality] = useState("uni");
  const srcNode = nodes.find((n) => n.id === source);
  const tgtNode = nodes.find((n) => n.id === target);

  return (
    <Modal title="Add Edge" onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ color: getNodeColor(srcNode?.type), fontWeight: 600, fontSize: 13 }}>{srcNode?.label}</span>
        <span style={{ color: "#666" }}>→</span>
        <span style={{ color: getNodeColor(tgtNode?.type), fontWeight: 600, fontSize: 13 }}>{tgtNode?.label}</span>
      </div>
      <label style={labelStyle}>Relationship Label</label>
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g., executed, connected to" style={{ ...inputStyle, fontFamily: "inherit" }} autoFocus />
      <label style={labelStyle}>Timestamp</label>
      <input value={timestamp} onChange={(e) => setTimestamp(e.target.value)} placeholder="YYYY-MM-DD HH:MM:SS" style={{ ...inputStyle, fontFamily: "inherit" }} />
      <label style={labelStyle}>Directionality</label>
      <select value={directionality} onChange={(e) => setDirectionality(e.target.value)} style={{ ...selectStyle, fontFamily: "inherit" }}>
        <option value="uni">Unidirectional →</option>
        <option value="bi">Bidirectional ↔</option>
        <option value="none">Non-directional —</option>
      </select>
      <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ ...btnSecondary, fontFamily: "inherit" }}>Cancel</button>
        <button onClick={() => { if (!label.trim()) return; onAdd({ source, target, label: label.trim(), timestamp: timestamp || null, directionality }); }} style={{ ...btnPrimary, fontFamily: "inherit", opacity: label.trim() ? 1 : 0.4 }}>Add Edge</button>
      </div>
    </Modal>
  );
}

// ─── Add Finding Modal ───
function AddFindingModal({ onAdd, onClose }) {
  const [text, setText] = useState("");
  const [timestamp, setTimestamp] = useState("");

  return (
    <Modal title="Add Notable Finding" onClose={onClose}>
      <label style={labelStyle}>Description</label>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="What did you observe?" style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} autoFocus />
      <label style={labelStyle}>Timestamp (optional)</label>
      <input value={timestamp} onChange={(e) => setTimestamp(e.target.value)} placeholder="YYYY-MM-DD HH:MM:SS" style={{ ...inputStyle, fontFamily: "inherit" }} />
      <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ ...btnSecondary, fontFamily: "inherit" }}>Cancel</button>
        <button onClick={() => { if (!text.trim()) return; onAdd({ text: text.trim(), timestamp: timestamp || null }); }} style={{ ...btnPrimary, fontFamily: "inherit", opacity: text.trim() ? 1 : 0.4 }}>Add Finding</button>
      </div>
    </Modal>
  );
}

// ─── Edit Finding Modal ───
function EditFindingModal({ finding, onSave, onClose }) {
  const [text, setText] = useState(finding.text);
  const [timestamp, setTimestamp] = useState(finding.timestamp || "");

  return (
    <Modal title="Edit Finding" onClose={onClose}>
      <label style={labelStyle}>Description</label>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} autoFocus />
      <label style={labelStyle}>Timestamp (optional)</label>
      <input value={timestamp} onChange={(e) => setTimestamp(e.target.value)} placeholder="YYYY-MM-DD HH:MM:SS" style={{ ...inputStyle, fontFamily: "inherit" }} />
      <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ ...btnSecondary, fontFamily: "inherit" }}>Cancel</button>
        <button onClick={() => { if (!text.trim()) return; onSave({ text: text.trim(), timestamp: timestamp || null }); }} style={{ ...btnPrimary, fontFamily: "inherit" }}>Save</button>
      </div>
    </Modal>
  );
}
