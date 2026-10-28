import React, { useState, useMemo } from 'react';
import { MetricDefinition, SegmentationClassRow } from '../../types/metrics';
import { segmentationMetricsList, mockSegmentationClasses } from '../../data/mockData';
import { computeSegmentationMetricsFromCounts, computeEllipseBoundaryIoU } from '../../utils/calculations';
import { MetricCard } from '../MetricCard';
import { ActiveTab } from '../Header';
import { Layers, Search, RotateCcw } from 'lucide-react';

interface SegmentationViewProps {
  activeTab: ActiveTab;
  searchQuery: string;
  onInspectMetric: (metric: MetricDefinition) => void;
}

export const SegmentationView: React.FC<SegmentationViewProps> = ({
  activeTab,
  searchQuery,
  onInspectMetric,
}) => {
  // Interactive mask parameters
  const [maskOffsetX, setMaskOffsetX] = useState<number>(0);
  const [maskOffsetY, setMaskOffsetY] = useState<number>(0);
  const [maskScale, setMaskScale] = useState<number>(1.0);

  // Table filters for the Mock Dataset Table tab
  const [tableSearch, setTableSearch] = useState('');
  const [classTypeFilter, setClassTypeFilter] = useState<'all' | 'infra' | 'dynamic' | 'nature'>('all');
  const [performanceFilter, setPerformanceFilter] = useState<'all' | 'high' | 'challenging'>('all');
  const [sortBy, setSortBy] = useState<'iou_desc' | 'dice_desc' | 'weight_desc' | 'id'>('iou_desc');

  // Approximate simulated pixel counts based on offset & scale
  const simulatedCounts = useMemo(() => {
    const baseArea = 10000;
    const dist = Math.sqrt(maskOffsetX * maskOffsetX + maskOffsetY * maskOffsetY);
    const overlapRatio = Math.max(0, 1 - dist / 60) * Math.min(1.0, 1 / maskScale);
    const intersection = Math.round(baseArea * Math.max(0.05, overlapRatio));
    const predArea = Math.round(baseArea * maskScale);
    const union = baseArea + predArea - intersection;
    const totalImagePixels = 50000;

    const metrics = computeSegmentationMetricsFromCounts(
      intersection,
      union,
      baseArea,
      predArea,
      totalImagePixels
    );

    // Same ellipses as drawn on the canvas
    const boundaryIou = computeEllipseBoundaryIoU(
      { cx: 160, cy: 110, rx: 65, ry: 45 },
      { cx: 160 + maskOffsetX, cy: 110 + maskOffsetY, rx: 65 * maskScale, ry: 45 * maskScale },
      3
    );

    return {
      intersection,
      union,
      gtArea: baseArea,
      predArea,
      boundaryIou,
      ...metrics,
    };
  }, [maskOffsetX, maskOffsetY, maskScale]);

  // Filtered metrics for search
  const filteredMetrics = useMemo(() => {
    if (!searchQuery) return segmentationMetricsList;
    const q = searchQuery.toLowerCase();
    return segmentationMetricsList.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.shortName.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Filtered classes for table
  const filteredTableClasses = useMemo(() => {
    return mockSegmentationClasses
      .filter((row) => {
        // 1. Class type filter
        let matchesType = true;
        if (classTypeFilter === 'infra') {
          matchesType = row.className.includes('Road') || row.className.includes('Sidewalk');
        } else if (classTypeFilter === 'dynamic') {
          matchesType = row.className.includes('Vehicles') || row.className.includes('Pedestrians');
        } else if (classTypeFilter === 'nature') {
          matchesType = row.className.includes('Vegetation');
        }

        // 2. Performance filter
        const matchesPerf =
          performanceFilter === 'all' ||
          (performanceFilter === 'high' && row.iou >= 0.7) ||
          (performanceFilter === 'challenging' && row.iou < 0.7);

        // 3. Search
        const matchesSearch =
          tableSearch === '' || row.className.toLowerCase().includes(tableSearch.toLowerCase());

        return matchesType && matchesPerf && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'iou_desc') return b.iou - a.iou;
        if (sortBy === 'dice_desc') return b.dice - a.dice;
        if (sortBy === 'weight_desc') return b.weight - a.weight;
        return a.classId - b.classId;
      });
  }, [classTypeFilter, performanceFilter, tableSearch, sortBy]);

  const handleResetFilters = () => {
    setTableSearch('');
    setClassTypeFilter('all');
    setPerformanceFilter('all');
    setSortBy('iou_desc');
  };

  const metricOverrides: Record<string, string> = {
    miou: `${(simulatedCounts.iou * 100).toFixed(1)}%`,
    dice: simulatedCounts.dice.toFixed(3),
    pixel_accuracy: `${(simulatedCounts.pixelAccuracy * 100).toFixed(1)}%`,
    boundary_iou: `${simulatedCounts.boundaryIou.toFixed(3)} (d=3px)`,
  };

  return (
    <div className="space-y-6">
      {/* 1. MERGED METRICS & INTERACTIVE PLAYGROUND TAB */}
      {activeTab === 'playground' && (
        <div className="space-y-6">
          {/* Interactive Mask Playground */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-semibold text-slate-200">
                    Interactive Segmentation Mask &amp; Dice vs IoU Simulator
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tweak predicted mask alignment and scaling to inspect pixel intersection, Dice (F1), and Jaccard Index (IoU).
                </p>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
                  <span className="text-slate-400 mr-2">IoU (Jaccard):</span>
                  <span className="text-purple-400 font-bold tabular-nums">
                    {(simulatedCounts.iou * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
                  <span className="text-slate-400 mr-2">Dice (DSC):</span>
                  <span className="text-emerald-400 font-bold tabular-nums">
                    {simulatedCounts.dice.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2D Canvas & Sliders */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
              {/* Visual Mask Canvas (7 cols) */}
              <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[260px]">
                <svg
                  viewBox="0 0 320 220"
                  className="w-full max-w-sm h-52 bg-slate-950/80 rounded-lg border border-slate-800/60"
                >
                  {/* Ground Truth Contour */}
                  <ellipse
                    cx="160"
                    cy="110"
                    rx="65"
                    ry="45"
                    fill="rgba(6, 182, 212, 0.15)"
                    stroke="#06b6d4"
                    strokeWidth="2"
                    strokeDasharray="4,2"
                  />
                  <text x="105" y="55" fill="#06b6d4" fontSize="10" fontFamily="monospace">
                    Ground Truth Mask
                  </text>

                  {/* Model Predicted Contour */}
                  <ellipse
                    cx={160 + maskOffsetX}
                    cy={110 + maskOffsetY}
                    rx={65 * maskScale}
                    ry={45 * maskScale}
                    fill="rgba(168, 85, 247, 0.2)"
                    stroke="#a855f7"
                    strokeWidth="2"
                  />
                  <text
                    x={140 + maskOffsetX}
                    y={175 + maskOffsetY}
                    fill="#a855f7"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    Predicted Mask
                  </text>

                  {/* Overlap Center Hint */}
                  <circle
                    cx={160 + maskOffsetX / 2}
                    cy={110 + maskOffsetY / 2}
                    r="4"
                    fill="#10b981"
                  />
                </svg>

                {/* Color Legend */}
                <div className="mt-3 flex items-center justify-center gap-4 text-[11px] font-mono text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <span className="w-2.5 h-2.5 bg-cyan-500/20 border border-cyan-400 rounded-xs inline-block"></span>
                    GT Mask Area
                  </span>
                  <span className="flex items-center gap-1.5 text-purple-400">
                    <span className="w-2.5 h-2.5 bg-purple-500/30 border border-purple-400 rounded-xs inline-block"></span>
                    Pred Mask Area
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block"></span>
                    Intersection (TP)
                  </span>
                </div>
              </div>

              {/* Mask Transformation Sliders (5 cols) */}
              <div className="lg:col-span-5 space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                    <span>Horizontal Offset (X):</span>
                    <span className="text-purple-400 font-bold">
                      {maskOffsetX > 0 ? `+${maskOffsetX}` : maskOffsetX}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-40}
                    max={40}
                    value={maskOffsetX}
                    onChange={(e) => setMaskOffsetX(parseInt(e.target.value))}
                    className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                    <span>Vertical Offset (Y):</span>
                    <span className="text-purple-400 font-bold">
                      {maskOffsetY > 0 ? `+${maskOffsetY}` : maskOffsetY}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-30}
                    max={30}
                    value={maskOffsetY}
                    onChange={(e) => setMaskOffsetY(parseInt(e.target.value))}
                    className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                    <span>Mask Scale (Size Factor):</span>
                    <span className="text-purple-400 font-bold">{maskScale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.7}
                    max={1.3}
                    step={0.05}
                    value={maskScale}
                    onChange={(e) => setMaskScale(parseFloat(e.target.value))}
                    className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                  />
                </div>

                {/* Math Conversion Callout */}
                <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
                  <div className="text-slate-300">
                    Mathematical Invariant:{' '}
                    <span className="text-emerald-400 font-bold">DSC = 2·IoU / (1 + IoU)</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Because DSC adds intersection twice to the numerator, Dice score is always numerically ≥ IoU!
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dice vs IoU Curve & Paradox Guide */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Curve */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-200">
                    Mathematical Function: Dice vs IoU (DSC = 2·IoU / (1 + IoU))
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">DSC ≥ IoU</span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Orange dot tracks the live simulated state. Notice Dice is strictly higher except at 0 and 1.
                </p>

                <div className="relative w-full aspect-square max-h-56 bg-slate-950 rounded-lg border border-slate-800/80 p-2 flex items-center justify-center">
                  <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                    <line x1="20" y1="20" x2="180" y2="20" stroke="#1e293b" strokeDasharray="2,2" />
                    <line x1="20" y1="100" x2="180" y2="100" stroke="#1e293b" strokeDasharray="2,2" />
                    <line x1="20" y1="180" x2="180" y2="180" stroke="#334155" />
                    <line x1="20" y1="20" x2="20" y2="180" stroke="#334155" />

                    {/* Diagonal Reference Line (y = x) */}
                    <line x1="20" y1="180" x2="180" y2="20" stroke="#475569" strokeDasharray="3,3" />

                    {/* Theoretical Curve: y = 2x / (1 + x) */}
                    <path
                      d={Array.from({ length: 41 }, (_, i) => {
                        const x = i / 40;
                        const y = (2 * x) / (1 + x);
                        const px = 20 + x * 160;
                        const py = 180 - y * 160;
                        return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                    />

                    {/* Live Coordinate Marker */}
                    <circle
                      cx={20 + simulatedCounts.iou * 160}
                      cy={180 - simulatedCounts.dice * 160}
                      r="5"
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
              </div>

              <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                <span>X: Jaccard (IoU) = {(simulatedCounts.iou * 100).toFixed(1)}%</span>
                <span>Y: Dice (F1) = {(simulatedCounts.dice * 100).toFixed(1)}%</span>
              </div>
            </div>

            {/* Class Imbalance Paradox Guide */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200 block mb-1">
                  The Segmentation Imbalance Paradox: Why Pixel Accuracy Fails
                </span>
                <p className="text-[11px] text-slate-400 mb-3">
                  Understanding why mIoU is universally preferred over global Pixel Accuracy in production models:
                </p>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                    <div className="font-semibold text-rose-300 mb-1">
                      The Flaw in Global Pixel Accuracy:
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      In street scenes, Road and Sky make up &gt;75% of pixels. A naive model that classifies every pixel as &quot;Road&quot; achieves 85%+ pixel accuracy while failing completely on critical pedestrians.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                    <div className="font-semibold text-emerald-300 mb-1">
                      The Solution: Mean IoU (mIoU / Macro Average):
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      mIoU computes IoU independently for each class and averages the scores with equal weight. Small objects have equal influence on mIoU as huge road surfaces.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
                Biomedical standard: Dice | Autonomous driving standard: mIoU
              </div>
            </div>
          </div>

          {/* Evaluated Metric Cards & Formula Methods */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Semantic Segmentation Metrics &amp; Formulas
              </h3>
              <span className="text-[11px] text-slate-400">
                Click &quot;Method&quot; on any card to view detailed formula breakdown, worked examples, and guidance
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {filteredMetrics.map((m) => (
                <MetricCard
                  key={m.id}
                  metric={m}
                  onInspect={onInspectMetric}
                  overrideValue={metricOverrides[m.id]}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. MOCK DATASET TABLE TAB (Dedicated Table with Multi-Condition Filters) */}
      {activeTab === 'dataset' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm space-y-4">
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-slate-200">
                  Cityscapes Autonomous Driving Multi-Class Segmentation Evaluation Table
                </h3>
                <p className="text-[11px] text-slate-400">
                  Filter by semantic category, segmentation quality threshold, or sort by IoU.
                </p>
              </div>

              <div className="flex items-center gap-2.5 text-xs">
                <span className="font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded">
                  Showing {filteredTableClasses.length} of {mockSegmentationClasses.length} classes
                </span>
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              </div>
            </div>

            {/* Filter Controls Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Filter by class name..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60"
                />
              </div>

              {/* Class Category Filter */}
              <select
                value={classTypeFilter}
                onChange={(e) => setClassTypeFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Semantic Groups</option>
                <option value="infra">Static Infrastructure (Road, Sidewalk)</option>
                <option value="dynamic">Dynamic Objects (Vehicles, Pedestrians)</option>
                <option value="nature">Natural Scenery (Trees / Vegetation)</option>
              </select>

              {/* Performance Filter */}
              <select
                value={performanceFilter}
                onChange={(e) => setPerformanceFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Performance Levels</option>
                <option value="high">High Accuracy (IoU ≥ 70%)</option>
                <option value="challenging">Challenging / Low (IoU &lt; 70%)</option>
              </select>

              {/* Sort Order */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="iou_desc">Sort: Highest IoU First</option>
                <option value="dice_desc">Sort: Highest Dice First</option>
                <option value="weight_desc">Sort: Highest Area Weight</option>
                <option value="id">Sort: Class ID</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] text-slate-400">
                  <th className="py-2.5 px-4 font-semibold">Semantic Class</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Ground Truth Pixels</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Predicted Pixels</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Intersection (TP)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Union Area</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Class IoU</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Class Dice (DSC)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Pixel Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredTableClasses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                      No matching classes found. Try adjusting or resetting your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTableClasses.map((row) => (
                    <tr key={row.classId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-200 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: row.color }}
                        ></span>
                        <span>{row.className}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-slate-400">
                        {row.groundTruthPixels.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-slate-400">
                        {row.predictedPixels.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-slate-300">
                        {row.intersectionPixels.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-slate-400">
                        {row.unionPixels.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-purple-400 font-bold">
                        {(row.iou * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-emerald-400 font-semibold">
                        {row.dice.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-sky-400">
                        {(row.pixelAccuracy * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
