import React, { useState, useMemo } from 'react';
import { ActiveTab } from '../Header';
import { MetricDefinition } from '../../types/metrics';
import { MetricCard } from '../MetricCard';
import { clusteringMetricsList, mockClusteringDataset } from '../../data/clusteringMockData';
import {
  Network,
  Sparkles,
  Search,
  Download,
  Filter,
  Sliders,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

interface ClusteringViewProps {
  activeTab: ActiveTab;
  searchQuery: string;
  onInspectMetric: (metric: MetricDefinition) => void;
}

export const ClusteringView: React.FC<ClusteringViewProps> = ({
  activeTab,
  searchQuery,
  onInspectMetric,
}) => {
  // Playground interactive state
  const [clusterCount, setClusterCount] = useState<number>(3); // k = 2, 3, 4
  const [separationFactor, setSeparationFactor] = useState<number>(1.0); // 0.6 (crowded) to 1.4 (spaced)
  const [injectOutlier, setInjectOutlier] = useState<boolean>(true);

  // Table filters
  const [tableSearch, setTableSearch] = useState('');
  const [clusterFilter, setClusterFilter] = useState<string>('all');
  const [qualityFilter, setQualityFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Colors per cluster
  const clusterColors = [
    { name: 'Cluster 0 (Enterprise)', bg: 'rgba(99, 102, 241, 0.2)', border: '#6366f1', text: '#818cf8', fill: '#6366f1' },
    { name: 'Cluster 1 (Growth)', bg: 'rgba(16, 185, 129, 0.2)', border: '#10b981', text: '#34d399', fill: '#10b981' },
    { name: 'Cluster 2 (Dormant)', bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b', text: '#fbbf24', fill: '#f59e0b' },
    { name: 'Cluster 3 (Testing)', bg: 'rgba(244, 63, 94, 0.2)', border: '#f43f5e', text: '#fb7185', fill: '#f43f5e' },
  ];

  // Dynamically simulated 2D points: K-Means is run for the selected K and every metric
  // is computed from the resulting labels, so all of them respond to K and separation.
  const simulation = useMemo(() => {
    // 3 nominal centroid centers at separation 1.0
    const rawCentroids = [
      { x: 7.8, y: 8.0 },
      { x: 3.0, y: 5.5 },
      { x: 6.6, y: 2.2 },
    ];

    const meanCenter = { x: 5.0, y: 5.0 };
    const scaledCentroids = rawCentroids.map((c) => ({
      x: meanCenter.x + (c.x - meanCenter.x) * separationFactor,
      y: meanCenter.y + (c.y - meanCenter.y) * separationFactor,
    }));

    // Base geometry: each sample sits around its natural (scaled) centroid
    const base = mockClusteringDataset.map((sample) => {
      const c = scaledCentroids[sample.assignedCluster];
      return {
        x: c.x + (sample.x - rawCentroids[sample.assignedCluster].x) * 0.8,
        y: c.y + (sample.y - rawCentroids[sample.assignedCluster].y) * 0.8,
      };
    });
    const n = base.length;
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y);

    // Deterministic K-Means: farthest-point initialisation + Lloyd iterations
    let cents = [base[0]];
    while (cents.length < clusterCount) {
      let best = 0;
      let bestD = -1;
      base.forEach((p, i) => {
        const d = Math.min(...cents.map((c) => dist(p, c)));
        if (d > bestD) { bestD = d; best = i; }
      });
      cents.push({ ...base[best] });
    }
    let labels = new Array<number>(n).fill(0);
    for (let iter = 0; iter < 50; iter++) {
      labels = base.map((p) => {
        let bi = 0;
        cents.forEach((c, ci) => { if (dist(p, c) < dist(p, cents[bi])) bi = ci; });
        return bi;
      });
      cents = cents.map((c, ci) => {
        const m = base.filter((_, i) => labels[i] === ci);
        return m.length
          ? { x: m.reduce((a, p) => a + p.x, 0) / m.length, y: m.reduce((a, p) => a + p.y, 0) / m.length }
          : c;
      });
    }

    // Order clusters by centroid position so colours stay stable across K
    const order = cents.map((_, i) => i).sort((a, b) => (cents[b].x + cents[b].y) - (cents[a].x + cents[a].y));
    const remap = new Map(order.map((old, i) => [old, i]));
    labels = labels.map((l) => remap.get(l)!);

    // Outlier injection: sample 23 is moved next to cluster 1's area but keeps its original label
    const coords = base.map((p) => ({ ...p }));
    if (injectOutlier) {
      const target = scaledCentroids[1];
      coords[23] = { x: target.x + 0.3, y: target.y + 0.2 };
    }

    // Recompute centroids from final labels
    const centroids = Array.from({ length: clusterCount }, (_, ci) => {
      const m = coords.filter((_, i) => labels[i] === ci);
      return m.length
        ? { x: m.reduce((a, p) => a + p.x, 0) / m.length, y: m.reduce((a, p) => a + p.y, 0) / m.length }
        : { x: meanCenter.x, y: meanCenter.y };
    });

    // Per-point silhouette
    const neighbors: number[] = [];
    const sils = coords.map((p, i) => {
      const own = labels[i];
      const ownMembers = coords.filter((_, j) => labels[j] === own && j !== i);
      let b = Infinity;
      let nn = own;
      for (let ci = 0; ci < clusterCount; ci++) {
        if (ci === own) continue;
        const m = coords.filter((_, j) => labels[j] === ci);
        if (m.length === 0) continue;
        const d = m.reduce((s, q) => s + dist(p, q), 0) / m.length;
        if (d < b) { b = d; nn = ci; }
      }
      neighbors.push(nn);
      if (ownMembers.length === 0 || !isFinite(b)) return 0;
      const a = ownMembers.reduce((s, q) => s + dist(p, q), 0) / ownMembers.length;
      return (b - a) / Math.max(a, b);
    });

    const points = mockClusteringDataset.map((sample, i) => ({
      ...sample,
      x: coords[i].x,
      y: coords[i].y,
      assignedCluster: labels[i],
      silhouetteScore: sils[i],
      nearestNeighborCluster: neighbors[i],
      distanceToCentroid: dist(coords[i], centroids[labels[i]]),
      dynamicSil: sils[i],
    }));

    // Cluster-level quantities
    const scatter = centroids.map((c, ci) => {
      const m = coords.filter((_, i) => labels[i] === ci);
      return m.length ? m.reduce((s, p) => s + dist(p, c), 0) / m.length : 0;
    });
    const wcss = coords.reduce((s, p, i) => s + dist(p, centroids[labels[i]]) ** 2, 0);
    const overall = { x: coords.reduce((a, p) => a + p.x, 0) / n, y: coords.reduce((a, p) => a + p.y, 0) / n };
    const sizes = centroids.map((_, ci) => labels.filter((l) => l === ci).length);
    const bcss = centroids.reduce((s, c, ci) => s + sizes[ci] * dist(c, overall) ** 2, 0);

    const avgSil = sils.reduce((a, b) => a + b, 0) / n;
    const dbi =
      centroids.reduce((s, _, i) => {
        let worst = 0;
        centroids.forEach((__, j) => {
          if (i !== j) worst = Math.max(worst, (scatter[i] + scatter[j]) / Math.max(1e-9, dist(centroids[i], centroids[j])));
        });
        return s + worst;
      }, 0) / clusterCount;
    const ch = wcss > 0 ? Math.round((bcss / (clusterCount - 1)) / (wcss / (n - clusterCount))) : 0;

    return { points, centroids, avgSil, dbi, ch, wcss };
  }, [clusterCount, separationFactor, injectOutlier]);

  // Reset stale cluster filter when K shrinks
  React.useEffect(() => {
    if (clusterFilter !== 'all' && Number(clusterFilter) >= clusterCount) {
      setClusterFilter('all');
      setCurrentPage(1);
    }
  }, [clusterCount, clusterFilter]);

  // SVG 2D Scatter plot dimensions
  const svgW = 420;
  const svgH = 300;
  const mapX = (x: number) => 30 + (x / 10) * (svgW - 50);
  const mapY = (y: number) => svgH - 25 - (y / 10) * (svgH - 45);

  // Filtered dataset table
  const filteredDataset = useMemo(() => {
    return simulation.points.filter((sample) => {
      const matchesSearch =
        tableSearch === '' ||
        sample.id.toLowerCase().includes(tableSearch.toLowerCase()) ||
        sample.pointName.toLowerCase().includes(tableSearch.toLowerCase());

      const matchesCluster =
        clusterFilter === 'all' || sample.assignedCluster.toString() === clusterFilter;

      const matchesQuality =
        qualityFilter === 'all' ||
        (qualityFilter === 'high' && sample.silhouetteScore >= 0.75) ||
        (qualityFilter === 'med' && sample.silhouetteScore >= 0.2 && sample.silhouetteScore < 0.75) ||
        (qualityFilter === 'negative' && sample.silhouetteScore < 0);

      return matchesSearch && matchesCluster && matchesQuality;
    });
  }, [simulation, tableSearch, clusterFilter, qualityFilter]);

  const totalPages = Math.ceil(filteredDataset.length / pageSize) || 1;
  const paginatedDataset = filteredDataset.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const exportCSV = () => {
    const headers = ['ID', 'Point Name', 'Coord X', 'Coord Y', 'Assigned Cluster', 'True Cluster', 'Silhouette Score', 'Nearest Neighbor Cluster', 'Dist to Centroid'];
    const rows = filteredDataset.map((s) => [
      s.id,
      `"${s.pointName}"`,
      s.x,
      s.y,
      s.assignedCluster,
      s.trueCluster,
      s.silhouetteScore,
      s.nearestNeighborCluster,
      s.distanceToCentroid,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'clustering_evaluation_dataset.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Top cards show live values from the playground simulation
  const liveValues: Record<string, { value: number; formattedValue: string; interpretation: string }> = {
    silhouette: {
      value: simulation.avgSil,
      formattedValue: simulation.avgSil.toFixed(3),
      interpretation: `Live mean silhouette for K = ${clusterCount}.`,
    },
    'davies-bouldin': {
      value: simulation.dbi,
      formattedValue: simulation.dbi.toFixed(3),
      interpretation: `Live Davies-Bouldin index for K = ${clusterCount}.`,
    },
    'calinski-harabasz': {
      value: simulation.ch,
      formattedValue: String(simulation.ch),
      interpretation: `Live variance ratio for K = ${clusterCount}.`,
    },
    inertia: {
      value: simulation.wcss,
      formattedValue: simulation.wcss.toFixed(1),
      interpretation: `Live within-cluster sum of squares for K = ${clusterCount}.`,
    },
  };

  const filteredMetrics = clusteringMetricsList
    .map((m) => ({ ...m, ...liveValues[m.id] }))
    .filter((m) =>
    searchQuery === ''
      ? true
      : m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.shortName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* TAB 1: METRICS & PLAYGROUND */}
      {activeTab === 'playground' && (
        <>
          {/* Top Metric Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-indigo-400" />
                Unsupervised Clustering Metrics
              </h3>
              <span className="text-[11px] text-slate-500">
                Click any metric card for mathematical derivation &amp; code
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {filteredMetrics.map((metric) => (
                <MetricCard
                  key={metric.id}
                  metric={metric}
                  onInspect={() => onInspectMetric(metric)}
                />
              ))}
            </div>
          </div>

          {/* Interactive Clustering & Silhouette Canvas */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  Interactive 2D Cluster Separation &amp; Silhouette Playground
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Tune cluster count $K$ and spatial separation factor to observe how intra-vs-inter cluster cohesion changes silhouette scores.
                </p>
              </div>

              {/* Misclustered Outlier Toggle */}
              <button
                onClick={() => setInjectOutlier(!injectOutlier)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
                  injectOutlier
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Inject Misclustered Outlier (s &lt; 0)</span>
              </button>
            </div>

            {/* Playground Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Cluster Count (K):</span>
                  <span className="font-mono text-indigo-400 font-bold">K = {clusterCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  {[2, 3, 4].map((k) => (
                    <button
                      key={k}
                      onClick={() => setClusterCount(k)}
                      className={`flex-1 py-1 text-xs rounded border transition-colors cursor-pointer ${
                        clusterCount === k
                          ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/60 font-semibold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      K = {k}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Inter-Cluster Separation:</span>
                  <span className="font-mono text-indigo-400 font-bold">
                    {separationFactor < 0.9 ? 'Overlapping' : separationFactor > 1.1 ? 'Distinct' : 'Balanced'} ({separationFactor.toFixed(2)}x)
                  </span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="1.4"
                  step="0.05"
                  value={separationFactor}
                  onChange={(e) => setSeparationFactor(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Split Visualizer: 2D Spatial Scatter + Silhouette Bar Plot */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: 2D Scatter Canvas (7 cols) */}
              <div className="lg:col-span-7 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium text-slate-300">
                    2D Embedding Feature Space (PCA / t-SNE Projection)
                  </span>
                  <div className="flex items-center gap-2 text-[10px]">
                    {clusterColors.slice(0, clusterCount).map((c, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: c.border }} />
                        <span className="text-slate-400">C{i}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="relative w-full flex items-center justify-center">
                  <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-64 select-none">
                    {/* Grid */}
                    {[2, 4, 6, 8].map((g) => (
                      <g key={g}>
                        <line x1={mapX(g)} y1={mapY(10)} x2={mapX(g)} y2={mapY(0)} stroke="#1e293b" strokeDasharray="3 3" />
                        <line x1={mapX(0)} y1={mapY(g)} x2={mapX(10)} y2={mapY(g)} stroke="#1e293b" strokeDasharray="3 3" />
                      </g>
                    ))}

                    {/* Centroid Crosshairs & Radii */}
                    {simulation.centroids.map((c, idx) => {
                      const cx = mapX(c.x);
                      const cy = mapY(c.y);
                      const col = clusterColors[idx];
                      return (
                        <g key={idx}>
                          <circle cx={cx} cy={cy} r="40" fill={col.bg} stroke={col.border} strokeWidth="1" strokeDasharray="4 4" />
                          <circle cx={cx} cy={cy} r="5" fill={col.fill} />
                          <line x1={cx - 8} y1={cy} x2={cx + 8} y2={cy} stroke="#fff" strokeWidth="1.5" />
                          <line x1={cx} y1={cy - 8} x2={cx} y2={cy + 8} stroke="#fff" strokeWidth="1.5" />
                          <text x={cx + 10} y={cy - 5} fill={col.text} fontSize="10" fontWeight="bold">
                            μ{idx}
                          </text>
                        </g>
                      );
                    })}

                    {/* Individual Samples */}
                    {simulation.points.map((pt) => {
                      const cx = mapX(pt.x);
                      const cy = mapY(pt.y);
                      const col = clusterColors[pt.assignedCluster];
                      const isNegative = pt.dynamicSil < 0;

                      return (
                        <g key={pt.id}>
                          {isNegative && (
                            <circle cx={cx} cy={cy} r="8" fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="2 2" />
                          )}
                          <circle cx={cx} cy={cy} r="4" fill={col.fill} stroke={isNegative ? '#f43f5e' : '#0f172a'} strokeWidth="1" />
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Right: Silhouette Coefficients Spectrum (5 cols) */}
              <div className="lg:col-span-5 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-semibold text-slate-300">
                    Silhouette Spectrum per Sample s(i)
                  </span>
                  <span className="text-[10px] text-indigo-400 font-mono">
                    b(i) - a(i) / max(a, b)
                  </span>
                </div>

                {/* Silhouette bars */}
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {simulation.points.map((pt) => {
                    const col = clusterColors[pt.assignedCluster];
                    const isNeg = pt.dynamicSil < 0;
                    const barWidth = Math.abs(pt.dynamicSil) * 100;

                    return (
                      <div key={pt.id} className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="w-10 text-slate-500 shrink-0 truncate">{pt.id}</span>
                        <div className="flex-1 bg-slate-900 h-2.5 rounded overflow-hidden flex items-center">
                          <div
                            className="h-full rounded transition-all"
                            style={{
                              width: `${Math.min(100, barWidth)}%`,
                              backgroundColor: isNeg ? '#f43f5e' : col.border,
                            }}
                          />
                        </div>
                        <span
                          className={`w-10 text-right tabular-nums font-semibold shrink-0 ${
                            isNeg ? 'text-rose-400' : 'text-slate-300'
                          }`}
                        >
                          {pt.dynamicSil.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Explanatory note */}
                <div className="p-3 bg-slate-900/60 rounded border border-slate-800/80 text-[11px] text-slate-400 space-y-1 mt-2">
                  <div className="flex items-center gap-1.5 text-indigo-300 font-medium">
                    <Sparkles className="w-3 h-3 shrink-0" />
                    <span>Understanding Negative Silhouette</span>
                  </div>
                  <p className="leading-relaxed">
                    When <strong className="text-rose-400">s(i) &lt; 0</strong>, the distance to the neighboring cluster $b(i)$ is smaller than the distance to its assigned peers $a(i)$. That means the point was assigned to the wrong cluster.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: MOCK DATASET TABLE */}
      {activeTab === 'dataset' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Network className="w-4 h-4 text-indigo-400" />
                Customer Account Cluster Embeddings Dataset
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-dimensional customer profiles evaluated with silhouette coefficients and nearest-neighbor cluster distances.
              </p>
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => {
                  setTableSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search account name or ID..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={clusterFilter}
                onChange={(e) => {
                  setClusterFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Assigned Clusters</option>
                {Array.from({ length: clusterCount }, (_, i) => (
                  <option key={i} value={String(i)}>
                    Cluster {i}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={qualityFilter}
                onChange={(e) => {
                  setQualityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Silhouette Quality</option>
                <option value="high">High Cohesion (s ≥ 0.75)</option>
                <option value="med">Moderate / Boundary (0.2 ≤ s &lt; 0.75)</option>
                <option value="negative">Misclustered Outliers (s &lt; 0)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Point ID</th>
                  <th className="py-2.5 px-3">Account Profile</th>
                  <th className="py-2.5 px-3">Coord (X, Y)</th>
                  <th className="py-2.5 px-3">Assigned</th>
                  <th className="py-2.5 px-3">Silhouette s(i)</th>
                  <th className="py-2.5 px-3">Nearest Cluster</th>
                  <th className="py-2.5 px-3">Centroid Dist</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                {paginatedDataset.map((sample) => {
                  const isNeg = sample.silhouetteScore < 0;
                  return (
                    <tr key={sample.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                        {sample.id}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-200">
                        {sample.pointName}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        ({sample.x.toFixed(1)}, {sample.y.toFixed(1)})
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-semibold border"
                          style={{
                            backgroundColor: clusterColors[sample.assignedCluster].bg,
                            borderColor: clusterColors[sample.assignedCluster].border,
                            color: clusterColors[sample.assignedCluster].text,
                          }}
                        >
                          Cluster {sample.assignedCluster}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold">
                        <span className={isNeg ? 'text-rose-400 font-bold' : sample.silhouetteScore >= 0.75 ? 'text-emerald-400' : 'text-slate-300'}>
                          {sample.silhouetteScore.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        Cluster {sample.nearestNeighborCluster}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {sample.distanceToCentroid.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                {paginatedDataset.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No clustering samples match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            <span>
              Showing {paginatedDataset.length} of {filteredDataset.length} accounts
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-slate-800 bg-slate-950 disabled:opacity-40 hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-2 font-mono text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-slate-800 bg-slate-950 disabled:opacity-40 hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
