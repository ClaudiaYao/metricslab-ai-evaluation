import React, { useState, useMemo } from 'react';
import { MetricDefinition, DetectionSample } from '../../types/metrics';
import { objectDetectionMetricsList, mockDetections } from '../../data/mockData';
import { computeBoxIoU, computeMeanAveragePrecision } from '../../utils/calculations';
import { MetricCard } from '../MetricCard';
import { ActiveTab } from '../Header';
import { Maximize2, Search, RotateCcw, Filter } from 'lucide-react';

interface ObjectDetectionViewProps {
  activeTab: ActiveTab;
  searchQuery: string;
  onInspectMetric: (metric: MetricDefinition) => void;
}

export const ObjectDetectionView: React.FC<ObjectDetectionViewProps> = ({
  activeTab,
  searchQuery,
  onInspectMetric,
}) => {
  // Interactive bounding box coordinates
  const gtBox = { x: 70, y: 50, w: 140, h: 130 };

  const [predBoxX, setPredBoxX] = useState<number>(85);
  const [predBoxY, setPredBoxY] = useState<number>(60);
  const [predBoxW, setPredBoxW] = useState<number>(135);
  const [predBoxH, setPredBoxH] = useState<number>(125);
  const [activeIouThreshold, setActiveIouThreshold] = useState<number>(0.5);

  // Table filters for the Mock Dataset Table tab
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'tp' | 'loc_fp' | 'bg_fp'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deduplicateByImage, setDeduplicateByImage] = useState<boolean>(false);

  const predBox = {
    x: predBoxX,
    y: predBoxY,
    w: predBoxW,
    h: predBoxH,
  };

  // Live IoU calculation
  const liveIoU = useMemo(() => {
    return computeBoxIoU(gtBox, predBox);
  }, [predBoxX, predBoxY, predBoxW, predBoxH]);

  // Evaluated mAP at selected IoU threshold
  const detectionEval = useMemo(() => {
    return computeMeanAveragePrecision(
      mockDetections.map((d) => ({
        confidence: d.confidence,
        iou: d.iouWithGroundTruth,
        isTrueClass: d.isTruePositive || d.iouWithGroundTruth > 0,
      })),
      activeIouThreshold
    );
  }, [activeIouThreshold]);

  // AP@0.50 and COCO-style mean AP over IoU 0.50:0.05:0.95, computed from the same detections
  const apSummary = useMemo(() => {
    const dets = mockDetections.map((d) => ({
      confidence: d.confidence,
      iou: d.iouWithGroundTruth,
      isTrueClass: d.isTruePositive || d.iouWithGroundTruth > 0,
    }));
    const thresholds = Array.from({ length: 10 }, (_, i) => 0.5 + i * 0.05);
    const aps = thresholds.map((t) => computeMeanAveragePrecision(dets, t).ap);
    return { ap50: aps[0], apCoco: aps.reduce((a, b) => a + b, 0) / aps.length };
  }, []);

  // Intersection coordinates for rendering
  const interX = Math.max(gtBox.x, predBox.x);
  const interY = Math.max(gtBox.y, predBox.y);
  const interX2 = Math.min(gtBox.x + gtBox.w, predBox.x + predBox.w);
  const interY2 = Math.min(gtBox.y + gtBox.h, predBox.y + predBox.h);
  const interW = Math.max(0, interX2 - interX);
  const interH = Math.max(0, interY2 - interY);

  // Filtered metrics for search
  const filteredMetrics = useMemo(() => {
    if (!searchQuery) return objectDetectionMetricsList;
    const q = searchQuery.toLowerCase();
    return objectDetectionMetricsList.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.shortName.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Multi-condition table filtering
  const filteredTableDetections = useMemo(() => {
    let list = [...mockDetections];

    // Optional deduplication: keep highest-confidence detection per image
    if (deduplicateByImage) {
      const seen = new Set<string>();
      const deduped: DetectionSample[] = [];
      // Sort by confidence desc first
      const sorted = [...list].sort((a, b) => b.confidence - a.confidence);
      for (const d of sorted) {
        const key = `${d.imageName}_${d.category}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(d);
        }
      }
      list = deduped;
    }

    return list.filter((d) => {
      const isTp = d.iouWithGroundTruth >= activeIouThreshold && d.isTruePositive;
      const isBgFp = d.iouWithGroundTruth === 0;
      const isLocFp = !isTp && !isBgFp;

      // 1. Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'tp' && isTp) ||
        (statusFilter === 'loc_fp' && isLocFp) ||
        (statusFilter === 'bg_fp' && isBgFp);

      // 2. Category filter
      const matchesCategory =
        categoryFilter === 'all' || d.category.toLowerCase() === categoryFilter.toLowerCase();

      // 3. Search filter
      const matchesSearch =
        tableSearch === '' ||
        d.id.toLowerCase().includes(tableSearch.toLowerCase()) ||
        d.imageName.toLowerCase().includes(tableSearch.toLowerCase()) ||
        d.category.toLowerCase().includes(tableSearch.toLowerCase());

      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [activeIouThreshold, statusFilter, categoryFilter, deduplicateByImage, tableSearch]);

  const handleResetFilters = () => {
    setTableSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setDeduplicateByImage(false);
  };

  const metricOverrides: Record<string, string> = {
    iou: liveIoU.iou.toFixed(3),
    ap_interpolated: detectionEval.ap.toFixed(3),
    map_50: `${(apSummary.ap50 * 100).toFixed(1)}%`,
    map_coco: `${(apSummary.apCoco * 100).toFixed(1)}%`,
  };

  return (
    <div className="space-y-6">
      {/* 1. MERGED METRICS & INTERACTIVE PLAYGROUND TAB */}
      {activeTab === 'playground' && (
        <div className="space-y-6">
          {/* Interactive Bounding Box & IoU Playground */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-semibold text-slate-200">
                    Live 2D Spatial IoU (Intersection over Union) Playground
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Drag sliders to adjust predicted box position and dimensions to observe live spatial intersection &amp; IoU score.
                </p>
              </div>

              {/* Current Live IoU Indicator */}
              <div className="flex items-center gap-3">
                <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-3 font-mono">
                  <span className="text-xs text-slate-400">Computed IoU:</span>
                  <span
                    className={`text-base font-bold tabular-nums ${
                      liveIoU.iou >= 0.75
                        ? 'text-emerald-400'
                        : liveIoU.iou >= 0.5
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {(liveIoU.iou * 100).toFixed(1)}%
                  </span>
                </div>

                <span
                  className={`text-[11px] font-medium px-2.5 py-1 rounded border ${
                    liveIoU.iou >= 0.75
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                      : liveIoU.iou >= 0.5
                      ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                      : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                  }`}
                >
                  {liveIoU.iou >= 0.75
                    ? 'COCO Strict TP (IoU ≥ 0.75)'
                    : liveIoU.iou >= 0.5
                    ? 'VOC TP (IoU ≥ 0.50)'
                    : 'Localization FP (IoU < 0.50)'}
                </span>
              </div>
            </div>

            {/* 2D Visualizer + Coordinate Sliders Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
              {/* Visual Canvas (7 cols) */}
              <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[260px] relative overflow-hidden">
                <svg
                  viewBox="0 0 300 240"
                  className="w-full max-w-sm h-56 border border-slate-800/60 bg-slate-950/90 rounded-lg"
                >
                  {/* Ground Truth Bounding Box (Green) */}
                  <rect
                    x={gtBox.x}
                    y={gtBox.y}
                    width={gtBox.w}
                    height={gtBox.h}
                    fill="rgba(16, 185, 129, 0.08)"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeDasharray="4,2"
                  />
                  <text
                    x={gtBox.x + 4}
                    y={gtBox.y + 14}
                    fill="#10b981"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    Ground Truth Box
                  </text>

                  {/* Predicted Bounding Box (Cyan) */}
                  <rect
                    x={predBox.x}
                    y={predBox.y}
                    width={predBox.w}
                    height={predBox.h}
                    fill="rgba(56, 189, 248, 0.08)"
                    stroke="#38bdf8"
                    strokeWidth="2"
                  />
                  <text
                    x={predBox.x + 4}
                    y={predBox.y + predBox.h - 6}
                    fill="#38bdf8"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    Detection Prediction
                  </text>

                  {/* Intersection Overlap Area */}
                  {interW > 0 && interH > 0 && (
                    <rect
                      x={interX}
                      y={interY}
                      width={interW}
                      height={interH}
                      fill="rgba(245, 158, 11, 0.45)"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                    />
                  )}
                </svg>

                <div className="mt-2 flex items-center justify-center gap-5 text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-3 h-0.5 bg-emerald-400 inline-block border-b border-dashed"></span>
                    GT: {gtBox.w}×{gtBox.h}
                  </span>
                  <span className="flex items-center gap-1.5 text-sky-400">
                    <span className="w-3 h-0.5 bg-sky-400 inline-block"></span>
                    Pred: {predBox.w}×{predBox.h}
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <span className="w-2.5 h-2.5 bg-amber-500/60 inline-block rounded-xs"></span>
                    Overlap: {interW * interH} px²
                  </span>
                </div>
              </div>

              {/* Coordinate Sliders (5 cols) */}
              <div className="lg:col-span-5 space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                    <span>Box X Offset:</span>
                    <span className="text-sky-400 font-bold">{predBoxX}px</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={150}
                    value={predBoxX}
                    onChange={(e) => setPredBoxX(parseInt(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                    <span>Box Y Offset:</span>
                    <span className="text-sky-400 font-bold">{predBoxY}px</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={120}
                    value={predBoxY}
                    onChange={(e) => setPredBoxY(parseInt(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                    <span>Box Width:</span>
                    <span className="text-sky-400 font-bold">{predBoxW}px</span>
                  </div>
                  <input
                    type="range"
                    min={80}
                    max={200}
                    value={predBoxW}
                    onChange={(e) => setPredBoxW(parseInt(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                    <span>Box Height:</span>
                    <span className="text-sky-400 font-bold">{predBoxH}px</span>
                  </div>
                  <input
                    type="range"
                    min={70}
                    max={180}
                    value={predBoxH}
                    onChange={(e) => setPredBoxH(parseInt(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                  />
                </div>

                <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400 space-y-1">
                  <div>Area(A ∩ B) = {liveIoU.intersectionArea.toLocaleString()} px²</div>
                  <div>Area(A ∪ B) = {liveIoU.unionArea.toLocaleString()} px²</div>
                  <div className="text-emerald-400 font-bold">
                    IoU = {liveIoU.intersectionArea} / {liveIoU.unionArea} = {liveIoU.iou.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PR Curve & Error Taxonomy Guides */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Precision-Recall Curve */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-200">
                    Precision-Recall Curve (IoU Threshold: {activeIouThreshold.toFixed(2)})
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    AP = {detectionEval.ap.toFixed(3)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  11-point interpolated precision area under the curve across ranked candidate detections.
                </p>

                {/* IoU Threshold Selector */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] text-slate-400">IoU Cutoff:</span>
                  {[0.5, 0.75].map((thresh) => (
                    <button
                      key={thresh}
                      onClick={() => setActiveIouThreshold(thresh)}
                      className={`px-2.5 py-0.5 text-xs font-mono rounded cursor-pointer transition-colors ${
                        activeIouThreshold === thresh
                          ? 'bg-amber-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      IoU ≥ {thresh.toFixed(2)}
                    </button>
                  ))}
                </div>

                <div className="relative w-full aspect-square max-h-56 bg-slate-950 rounded-lg border border-slate-800/80 p-2 flex items-center justify-center">
                  <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                    <line x1="20" y1="20" x2="180" y2="20" stroke="#1e293b" strokeDasharray="2,2" />
                    <line x1="20" y1="100" x2="180" y2="100" stroke="#1e293b" strokeDasharray="2,2" />
                    <line x1="20" y1="180" x2="180" y2="180" stroke="#334155" />
                    <line x1="20" y1="20" x2="20" y2="180" stroke="#334155" />

                    <polygon
                      points={`20,180 ${detectionEval.prCurve
                        .map((p) => `${20 + p.recall * 160},${180 - p.precision * 160}`)
                        .join(' ')} 180,180`}
                      fill="rgba(245, 158, 11, 0.15)"
                    />

                    <polyline
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      points={detectionEval.prCurve
                        .map((p) => `${20 + p.recall * 160},${180 - p.precision * 160}`)
                        .join(' ')}
                    />

                    {detectionEval.prCurve.map((p) => (
                      <circle
                        key={p.rank}
                        cx={20 + p.recall * 160}
                        cy={180 - p.precision * 160}
                        r="4"
                        fill="#ffffff"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                      />
                    ))}
                  </svg>
                </div>
              </div>

              <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                <span>X: Recall</span>
                <span>Y: Precision</span>
              </div>
            </div>

            {/* Error Taxonomy Guide */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200 block mb-1">
                  Object Detection Error Taxonomy (TIDE Framework)
                </span>
                <p className="text-[11px] text-slate-400 mb-3">
                  Why does a prediction fail? Understanding error categories is crucial for tuning object detectors.
                </p>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                    <div className="flex items-center justify-between font-semibold text-amber-300 mb-0.5">
                      <span>1. Localization Error (IoU &lt; Threshold)</span>
                      <span className="font-mono text-[10px]">0.1 ≤ IoU &lt; 0.5</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      The object was classified correctly, but the predicted bounding box is too loose, shifted, or cropped.
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                    <div className="flex items-center justify-between font-semibold text-rose-300 mb-0.5">
                      <span>2. Background False Positive</span>
                      <span className="font-mono text-[10px]">IoU = 0.00</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      The detector hallucinated an object where only background scenery exists.
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                    <div className="flex items-center justify-between font-semibold text-sky-300 mb-0.5">
                      <span>3. Classification Confusion</span>
                      <span className="font-mono text-[10px]">IoU ≥ 0.5 (Wrong Class)</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      The bounding box localized an object accurately, but confused the semantic class label.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
                Benchmark Standard: COCO averages AP over [0.50:0.05:0.95]
              </div>
            </div>
          </div>

          {/* Evaluated Metric Cards & Formula Methods */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Object Detection Metrics &amp; Formulas
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
                  Rank-Ordered Candidate Detections (Traffic Surveillance Benchmark)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Filter by category, detection status, or toggle deduplication per image frame.
                </p>
              </div>

              <div className="flex items-center gap-2.5 text-xs">
                <span className="font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded">
                  Showing {filteredTableDetections.length} of {mockDetections.length} detections
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
                  placeholder="Filter by image, category..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Detections</option>
                <option value="tp">True Positives Only (IoU ≥ {activeIouThreshold.toFixed(2)})</option>
                <option value="loc_fp">Localization False Positives</option>
                <option value="bg_fp">Background False Positives</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Object Categories</option>
                <option value="pedestrian">Pedestrian</option>
                <option value="sedan">Sedan</option>
                <option value="bicycle">Bicycle</option>
                <option value="bus">Bus</option>
                <option value="traffic light">Traffic Light</option>
                <option value="fire hydrant">Fire Hydrant</option>
              </select>

              {/* Deduplication Toggle */}
              <label className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deduplicateByImage}
                  onChange={(e) => setDeduplicateByImage(e.target.checked)}
                  className="accent-indigo-500"
                />
                <span className="truncate">Deduplicate per Image Target</span>
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] text-slate-400">
                  <th className="py-2.5 px-4 font-semibold">Detection ID</th>
                  <th className="py-2.5 px-4 font-semibold">Image Source</th>
                  <th className="py-2.5 px-4 font-semibold">Predicted Class</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Confidence</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Computed IoU</th>
                  <th className="py-2.5 px-4 font-semibold text-center">
                    Status (IoU ≥ {activeIouThreshold.toFixed(2)})
                  </th>
                  <th className="py-2.5 px-4 font-semibold text-right">Box [x, y, w, h]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredTableDetections.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                      No matching detections found. Try adjusting or resetting your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTableDetections.map((d) => {
                    const isTp = d.iouWithGroundTruth >= activeIouThreshold && d.isTruePositive;
                    return (
                      <tr
                        key={d.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          !isTp ? 'bg-rose-950/10' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4 font-sans font-medium text-slate-200">
                          {d.id}
                        </td>
                        <td className="py-2.5 px-4 font-sans text-slate-400">
                          {d.imageName}
                        </td>
                        <td className="py-2.5 px-4 font-sans text-slate-200 font-semibold">
                          {d.category}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-slate-200 font-semibold">
                          {(d.confidence * 100).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-indigo-300">
                          {d.iouWithGroundTruth > 0 ? d.iouWithGroundTruth.toFixed(3) : '0.000'}
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold">
                          {isTp ? (
                            <span className="text-emerald-400">True Positive (TP)</span>
                          ) : d.iouWithGroundTruth === 0 ? (
                            <span className="text-rose-400">Background FP</span>
                          ) : (
                            <span className="text-amber-400">Localization FP</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-slate-400">
                          [{d.boundingBox.join(', ')}]
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
