import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';

function buildAdjacency(edges) {
  const map = new Map();
  edges.forEach((edge) => {
    if (!map.has(edge.source)) map.set(edge.source, new Set());
    if (!map.has(edge.target)) map.set(edge.target, new Set());
    map.get(edge.source).add(edge.target);
    map.get(edge.target).add(edge.source);
  });
  return map;
}

function computeHighlightSet(selectedNodeId, edges) {
  if (!selectedNodeId) return new Set();
  const adjacency = buildAdjacency(edges);
  const first = adjacency.get(selectedNodeId) || new Set();
  const second = new Set();
  first.forEach((nodeId) => {
    (adjacency.get(nodeId) || []).forEach((next) => {
      if (next !== selectedNodeId && !first.has(next)) second.add(next);
    });
  });
  return new Set([selectedNodeId, ...first, ...second]);
}

function computeFocusSet(selectedNodeId, edges) {
  if (!selectedNodeId) return new Set();
  const adjacency = buildAdjacency(edges);
  const first = adjacency.get(selectedNodeId) || new Set();
  return new Set([selectedNodeId, ...first]);
}

function inRange(node, timeRange) {
  if (timeRange === 'all') return true;
  const now = Date.now();
  const ts = Number(node.lastVisitedAt || node.lastSeen || 0);
  if (!ts) return false;
  if (timeRange === 'week') return now - ts <= 7 * 24 * 60 * 60 * 1000;
  if (timeRange === 'month') return now - ts <= 30 * 24 * 60 * 60 * 1000;
  return true;
}

export default function GraphCanvas({
  graph,
  filters,
  query,
  selectedNodeId,
  pulseRef,
  onSelectNode,
  showEmpty,
}) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const viewportRef = useRef({ x: 0, y: 0, zoom: 1 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, moved: false });
  const simulationNodesRef = useRef([]);
  const redrawRef = useRef(() => {});
  const dragThreshold = 5;
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;

    const updateSize = () => {
      const width = Math.max(120, Math.floor(wrapper.clientWidth || 0));
      const height = Math.max(220, Math.floor(wrapper.clientHeight || 0));
      setCanvasSize((prev) => {
        if (prev.width === width && prev.height === height) return prev;
        return { width, height };
      });
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize);
      return () => {
        window.removeEventListener('resize', updateSize);
      };
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(wrapper);

    return () => {
      observer.disconnect();
    };
  }, []);

  const filteredGraph = useMemo(() => {
    const minWeight = Number(filters.minWeight || 0);
    const minConfidence = Number(filters.minConfidence || 0);
    const domainFilter = String(filters.domain || 'all').toLowerCase();
    const rangeFilter = filters.dateRange || filters.timeRange || 'all';
    const queryLower = String(query || '').toLowerCase().trim();

    const nodes = (graph.nodes || []).filter((node) => {
      const typeOk = filters.nodeType === 'all' || node.type === filters.nodeType;
      const weightOk = (node.visitCount || 0) >= minWeight;
      const confidenceOk = Number(node.confidence || 0) >= minConfidence;
      const domainOk = domainFilter === 'all' || String(node.domain || '').toLowerCase() === domainFilter;
      const aiOk = !filters.onlyAiGenerated || Boolean(node.aiGenerated);
      const timeOk = inRange(node, rangeFilter);
      const queryOk = !queryLower || `${node.title || ''} ${node.url || ''}`.toLowerCase().includes(queryLower);
      return typeOk && weightOk && confidenceOk && domainOk && aiOk && timeOk && queryOk;
    });

    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = (graph.edges || []).filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));

    return { nodes, edges };
  }, [graph, filters, query]);

  const highlightSet = useMemo(
    () => (filters.highlightMode ? computeHighlightSet(selectedNodeId, filteredGraph.edges) : new Set()),
    [filters.highlightMode, selectedNodeId, filteredGraph.edges]
  );

  const focusSet = useMemo(
    () => (filters.focusMode ? computeFocusSet(selectedNodeId, filteredGraph.edges) : new Set()),
    [filters.focusMode, selectedNodeId, filteredGraph.edges]
  );

  function clampZoom(value) {
    return Math.max(0.6, Math.min(2.4, value));
  }

  function getCanvasPointFromEvent(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const viewport = viewportRef.current;
    return {
      x: (event.clientX - rect.left - viewport.x) / viewport.zoom,
      y: (event.clientY - rect.top - viewport.y) / viewport.zoom,
    };
  }

  function zoomViewport(nextZoom, focalPoint) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const viewport = viewportRef.current;
    const rect = canvas.getBoundingClientRect();
    const targetZoom = clampZoom(nextZoom);
    const anchor = focalPoint || { x: rect.width / 2, y: rect.height / 2 };
    const worldX = (anchor.x - viewport.x) / viewport.zoom;
    const worldY = (anchor.y - viewport.y) / viewport.zoom;

    viewport.zoom = targetZoom;
    viewport.x = anchor.x - worldX * targetZoom;
    viewport.y = anchor.y - worldY * targetZoom;
    redrawRef.current();
  }

  function handleZoomIn() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    zoomViewport(viewportRef.current.zoom * 1.15, { x: rect.width / 2, y: rect.height / 2 });
  }

  function handleZoomOut() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    zoomViewport(viewportRef.current.zoom / 1.15, { x: rect.width / 2, y: rect.height / 2 });
  }

  function handleResetView() {
    viewportRef.current = { x: 0, y: 0, zoom: 1 };
    redrawRef.current();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !filteredGraph.nodes.length) return;

    const width = canvasSize.width || 480;
    const height = canvasSize.height || 360;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const nodes = filteredGraph.nodes.map((node) => ({ ...node }));
    const links = filteredGraph.edges.map((edge) => ({
      ...edge,
      source: edge.source,
      target: edge.target,
    }));

    let rafId = 0;
    const drawGraph = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        context.clearRect(0, 0, width, height);

        const viewport = viewportRef.current;
        context.save();
        context.translate(viewport.x, viewport.y);
        context.scale(viewport.zoom, viewport.zoom);

        const now = Date.now();
        const focusActive = Boolean(filters.focusMode && selectedNodeId && focusSet.size);
        const highlightActive = Boolean(filters.highlightMode && selectedNodeId && highlightSet.size);
        context.lineCap = 'round';

        links.forEach((link) => {
          const edgeId = `${link.source.id} -> ${link.target.id}`;
          const pulse = pulseRef.current.get(edgeId);
          const age = pulse ? now - pulse.startedAt : null;
          const pulseActive = typeof age === 'number' && age <= 2000;
          const pulseIntensity = pulseActive ? 1 - age / 2000 : 0;
          if (typeof age === 'number' && age > 2200) {
            pulseRef.current.delete(edgeId);
          }

          const sourceFocused = focusSet.has(link.source.id);
          const targetFocused = focusSet.has(link.target.id);
          const sourceHighlighted = highlightSet.has(link.source.id);
          const targetHighlighted = highlightSet.has(link.target.id);
          const focusedEdge = focusActive
            ? sourceFocused && targetFocused
            : !highlightActive || sourceHighlighted || targetHighlighted;

          context.beginPath();
          context.strokeStyle = pulse?.isNew
            ? `rgba(77, 255, 180, ${0.25 + pulseIntensity * 0.65})`
            : focusedEdge
              ? `rgba(74, 158, 255, ${0.14 + pulseIntensity * 0.45})`
              : focusActive
                ? 'rgba(42, 42, 58, 0.08)'
                : 'rgba(42, 42, 58, 0.2)';
          context.lineWidth = pulseActive ? 1 + pulseIntensity * 2.4 : focusedEdge ? 1.2 : focusActive ? 0.6 : 0.8;
          context.moveTo(link.source.x, link.source.y);
          context.lineTo(link.target.x, link.target.y);
          context.stroke();
        });

        nodes.forEach((node) => {
          const radius = 6 + Math.min(18, (node.weight || node.visitCount || 1) * 2);
          const highlighted = highlightSet.has(node.id);
          const focused = focusSet.has(node.id);
          const muted = focusActive
            ? !focused
            : highlightActive && !highlighted;
          const selected = selectedNodeId === node.id;

          let color = '#4A9EFF';
          if (node.type === 'entity') color = '#9B6FFF';
          if (node.type === 'claim') color = '#FFB347';

          context.beginPath();
          context.globalAlpha = muted ? (focusActive ? 0.14 : 0.22) : 1;
          context.fillStyle = selected ? '#4DFFB4' : color;
          context.shadowColor = selected ? 'rgba(77,255,180,0.6)' : focusActive && focused ? 'rgba(74,158,255,0.36)' : 'rgba(74,158,255,0.28)';
          context.shadowBlur = selected ? 16 : focusActive && focused ? 10 : 8;
          context.arc(node.x, node.y, radius, 0, Math.PI * 2);
          context.fill();
        });

        context.globalAlpha = 1;
        context.shadowBlur = 0;
        context.restore();
      });
    };

    redrawRef.current = drawGraph;

    const simulation = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance((d) => 85 / Math.max(0.25, d.strength || 0.4)).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d) => 6 + Math.min(24, (d.weight || d.visitCount || 1) * 2) + 8));
    simulation.alphaMin(0.03);
    simulation.alphaDecay(0.045);

    simulationNodesRef.current = nodes;

    simulation.on('tick', drawGraph);
    drawGraph();

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      simulation.stop();
      context.clearRect(0, 0, width, height);
      redrawRef.current = () => {};
    };
  }, [filteredGraph, selectedNodeId, pulseRef, filters.highlightMode, filters.focusMode, highlightSet, focusSet, canvasSize.width, canvasSize.height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    function getCanvasPoint(event) {
      return getCanvasPointFromEvent(canvas, event);
    }

    function onWheel(event) {
      event.preventDefault();
      const delta = Math.sign(event.deltaY);
      zoomViewport(viewportRef.current.zoom - delta * 0.1, {
        x: event.offsetX,
        y: event.offsetY,
      });
    }

    function onMouseDown(event) {
      dragRef.current.dragging = true;
      dragRef.current.startX = event.clientX;
      dragRef.current.startY = event.clientY;
      dragRef.current.moved = false;
    }

    function onMouseMove(event) {
      if (!dragRef.current.dragging) return;
      const deltaX = event.clientX - dragRef.current.startX;
      const deltaY = event.clientY - dragRef.current.startY;

      if (!dragRef.current.moved && Math.hypot(deltaX, deltaY) < dragThreshold) {
        return;
      }

      dragRef.current.moved = true;
      const viewport = viewportRef.current;
      viewport.x += deltaX;
      viewport.y += deltaY;
      dragRef.current.startX = event.clientX;
      dragRef.current.startY = event.clientY;
      redrawRef.current();
    }

    function onMouseUp(event) {
      const moved = dragRef.current.moved;
      dragRef.current.dragging = false;
      dragRef.current.moved = false;

      if (moved) return;

      const point = getCanvasPoint(event);
      let nearest = null;
      let nearestDistance = Infinity;

      for (const node of simulationNodesRef.current) {
        const distance = Math.hypot((node.x || 0) - point.x, (node.y || 0) - point.y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = node;
        }
      }

      if (nearest && nearestDistance <= 24) {
        onSelectNode(nearest.id);
      }
    }

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onSelectNode]);

  return (
    <section className="graph-stage" aria-label="Knowledge graph canvas" ref={wrapperRef}>
      <div className="canvas-bg" aria-hidden="true" />
      <div className="canvas-grid" aria-hidden="true" />
      <div className="graph-toolbar" aria-label="Graph zoom controls">
        <button type="button" className="graph-toolbar-btn" onClick={handleZoomOut} aria-label="Zoom out">−</button>
        <button type="button" className="graph-toolbar-btn" onClick={handleResetView} aria-label="Reset zoom">100%</button>
        <button type="button" className="graph-toolbar-btn" onClick={handleZoomIn} aria-label="Zoom in">+</button>
      </div>
      {showEmpty && (
        <div className="empty-state">
          <div className="empty-node-cluster">
            <div className="empty-node-core" />
            <div className="empty-ring ring-1" />
            <div className="empty-ring ring-2" />
            <div className="empty-ring ring-3" />
            <div className="ghost-node ghost-1" />
            <div className="ghost-node ghost-2" />
            <div className="ghost-node ghost-3" />
          </div>
          <p className="empty-title">Browse the web. Loom is listening.</p>
          <p className="empty-subtitle">Your graph grows without manual effort.</p>
        </div>
      )}
      <canvas id="loom-graph-canvas" ref={canvasRef} className="graph-renderer" />
    </section>
  );
}
