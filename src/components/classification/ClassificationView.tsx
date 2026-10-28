import React, { useState, useMemo } from 'react';
import { MetricDefinition, ClassificationSample } from '../../types/metrics';
import { classificationMetricsList, mockClassificationSamples } from '../../data/mockData';
import {
  computeConfusionMatrix,
  computeClassificationMetrics,
  computeROCCurve,
  computePrecisionRecallCurve,
  computeLogLoss,
} from '../../utils/calculations';
import { MetricCard } from '../MetricCard';
import { ActiveTab } from '../Header';
import { Sliders, Search, Filter, RotateCcw } from 'lucide-react';

interface ClassificationViewProps {
  activeTab: ActiveTab;
  searchQuery: string;
  onInspectMetric: (metric: MetricDefinition) => void;
}

export const ClassificationView: React.FC<ClassificationViewProps> = ({
  activeTab,
  searchQuery,
  onInspectMetric,
}) => {
  const [threshold, setThreshold] = useState<number>(0.5);
  
  // Table filters for the Mock Dataset Table tab
  const [tableFilter, setTableFilter] = useState<'all' | 'tp' | 'fp' | 'fn' | 'tn'>('all');
  const [correctnessFilter, setCorrectnessFilter] = useState<'all' | 'correct' | 'misclassified'>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'uncertain'>('all');
  const [tableSearch, setTableSearch] = useState('');

  // Dynamic calculations based on active threshold
  const confusionMatrix = useMemo(() => {
    return computeConfusionMatrix(mockClassificationSamples, threshold);
  }, [threshold]);

  const liveMetrics = useMemo(() => {
    return computeClassificationMetrics(confusionMatrix);
  }, [confusionMatrix]);

  const logLossVal = useMemo(() => {
    return computeLogLoss(mockClassificationSamples);
  }, []);

  const rocData = useMemo(() => {
    return computeROCCurve(mockClassificationSamples);
  }, []);

  const prData = useMemo(() => {
    return computePrecisionRecallCurve(mockClassificationSamples);
  }, []);

  // Current operating point on ROC
  const currentFpr = confusionMatrix.tn + confusionMatrix.fp > 0
    ? confusionMatrix.fp / (confusionMatrix.tn + confusionMatrix.fp)
    : 0;
  const currentTpr = confusionMatrix.tp + confusionMatrix.fn > 0
    ? confusionMatrix.tp / (confusionMatrix.tp + confusionMatrix.fn)
    : 0;
  const currentPrecision = confusionMatrix.tp + confusionMatrix.fp > 0
    ? confusionMatrix.tp / (confusionMatrix.tp + confusionMatrix.fp)
    : 1;

  // Filtered metrics for global search
  const filteredMetrics = useMemo(() => {
    if (!searchQuery) return classificationMetricsList;
    const q = searchQuery.toLowerCase();
    return classificationMetricsList.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.shortName.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Evaluated samples for the table
  const evaluatedSamples = useMemo(() => {
    return mockClassificationSamples.map((s) => {
      const pred = s.predictedProbability >= threshold ? 1 : 0;
      let quadrant: 'tp' | 'fp' | 'fn' | 'tn';
      if (s.trueLabel === 1 && pred === 1) quadrant = 'tp';
      else if (s.trueLabel === 0 && pred === 1) quadrant = 'fp';
      else if (s.trueLabel === 1 && pred === 0) quadrant = 'fn';
      else quadrant = 'tn';

      const eps = 1e-15;
      const p = Math.max(eps, Math.min(1 - eps, s.predictedProbability));
      const sampleLoss = s.trueLabel === 1 ? -Math.log(p) : -Math.log(1 - p);

      return {
        ...s,
        predLabel: pred,
        quadrant,
        sampleLoss,
      };
    });
  }, [threshold]);

  // Multi-condition table filtering
  const filteredTableSamples = useMemo(() => {
    return evaluatedSamples.filter((s) => {
      // 1. Quadrant filter
      const matchesQuadrant = tableFilter === 'all' || s.quadrant === tableFilter;
      
      // 2. Correctness filter
      const isCorrect = s.trueLabel === s.predLabel;
      const matchesCorrectness =
        correctnessFilter === 'all' ||
        (correctnessFilter === 'correct' && isCorrect) ||
        (correctnessFilter === 'misclassified' && !isCorrect);

      // 3. Confidence filter
      const isHighConf = s.predictedProbability >= 0.8 || s.predictedProbability <= 0.2;
      const isUncertain = s.predictedProbability >= 0.4 && s.predictedProbability <= 0.6;
      const matchesConfidence =
        confidenceFilter === 'all' ||
        (confidenceFilter === 'high' && isHighConf) ||
        (confidenceFilter === 'uncertain' && isUncertain);

      // 4. Text search filter
      const matchesSearch =
        tableSearch === '' ||
        s.sampleName.toLowerCase().includes(tableSearch.toLowerCase()) ||
        s.featureSummary.toLowerCase().includes(tableSearch.toLowerCase());

      return matchesQuadrant && matchesCorrectness && matchesConfidence && matchesSearch;
    });
  }, [evaluatedSamples, tableFilter, correctnessFilter, confidenceFilter, tableSearch]);

  const handleResetFilters = () => {
    setTableFilter('all');
    setCorrectnessFilter('all');
    setConfidenceFilter('all');
    setTableSearch('');
  };

  // Dynamic overrides map
  const metricOverrides: Record<string, string> = {
    accuracy: `${(liveMetrics.accuracy * 100).toFixed(1)}%`,
    precision: `${(liveMetrics.precision * 100).toFixed(1)}%`,
    recall: `${(liveMetrics.recall * 100).toFixed(1)}%`,
    specificity: `${(liveMetrics.specificity * 100).toFixed(1)}%`,
    f1: liveMetrics.f1.toFixed(3),
    mcc: `${liveMetrics.mcc >= 0 ? '+' : ''}${liveMetrics.mcc.toFixed(3)}`,
    log_loss: logLossVal.toFixed(3),
    roc_auc: rocData.auc.toFixed(3),
  };

  return (
    <div className="space-y-6">
      {/* 1. MERGED METRICS & INTERACTIVE PLAYGROUND TAB */}
      {activeTab === 'playground' && (
        <div className="space-y-6">
          {/* Interactive Threshold Control Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-200">
                  Decision Threshold Calibration Slider:
                </span>
                <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-950/70 border border-indigo-800 px-2 py-0.5 rounded tabular-nums">
                  t = {threshold.toFixed(2)}
                </span>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-3">
                <span>Adjust slider to observe live TP/FP tradeoff &amp; curve shifts</span>
                <button
                  onClick={() => setThreshold(0.5)}
                  className="text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                >
                  Reset to 0.50
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[11px] font-mono text-slate-500">0.05</span>
              <input
                type="range"
                min={0.05}
                max={0.95}
                step={0.01}
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-850 rounded-lg"
              />
              <span className="text-[11px] font-mono text-slate-500">0.95</span>
            </div>
          </div>

          {/* Real-time recalculated metrics cards & formula methods */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Classification Metrics &amp; Live Formulas (t = {threshold.toFixed(2)})
              </h3>
              <span className="text-[11px] text-slate-400">
                Click &quot;Method&quot; on any card for mathematical derivation &amp; formulas
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

          {/* Interactive Visualizations: Confusion Matrix + ROC + PR Curves */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 1. Confusion Matrix Heatmap */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-200">
                    Interactive Confusion Matrix
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Total: {confusionMatrix.total}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Quadrant allocation of predictions against true binary clinical conditions.
                </p>

                {/* 2x2 Matrix Grid */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  {/* True Positive */}
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-lg flex flex-col justify-center">
                    <span className="text-[11px] text-emerald-400 font-medium">True Positive (TP)</span>
                    <span className="text-2xl font-bold font-mono text-emerald-200 tabular-nums my-1">
                      {confusionMatrix.tp}
                    </span>
                    <span className="text-[10px] text-emerald-500 font-mono">
                      {((confusionMatrix.tp / confusionMatrix.total) * 100).toFixed(0)}% of total
                    </span>
                  </div>

                  {/* False Positive (Type I Error) */}
                  <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-lg flex flex-col justify-center">
                    <span className="text-[11px] text-rose-400 font-medium">False Positive (FP)</span>
                    <span className="text-2xl font-bold font-mono text-rose-200 tabular-nums my-1">
                      {confusionMatrix.fp}
                    </span>
                    <span className="text-[10px] text-rose-400 font-mono">
                      Type I Error (False Alarm)
                    </span>
                  </div>

                  {/* False Negative (Type II Error) */}
                  <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-lg flex flex-col justify-center">
                    <span className="text-[11px] text-amber-400 font-medium">False Negative (FN)</span>
                    <span className="text-2xl font-bold font-mono text-amber-200 tabular-nums my-1">
                      {confusionMatrix.fn}
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">
                      Type II Error (Missed)
                    </span>
                  </div>

                  {/* True Negative */}
                  <div className="p-3 bg-sky-950/40 border border-sky-800/50 rounded-lg flex flex-col justify-center">
                    <span className="text-[11px] text-sky-400 font-medium">True Negative (TN)</span>
                    <span className="text-2xl font-bold font-mono text-sky-200 tabular-nums my-1">
                      {confusionMatrix.tn}
                    </span>
                    <span className="text-[10px] text-sky-500 font-mono">
                      {((confusionMatrix.tn / confusionMatrix.total) * 100).toFixed(0)}% of total
                    </span>
                  </div>
                </div>
              </div>

              {/* Matrix Derived Rate Breakdown */}
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] space-y-1.5 font-mono text-slate-400">
                <div className="flex justify-between">
                  <span>Sensitivity / Recall:</span>
                  <span className="text-emerald-400 font-semibold tabular-nums">
                    {(liveMetrics.recall * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Specificity (1 - FPR):</span>
                  <span className="text-sky-400 font-semibold tabular-nums">
                    {(liveMetrics.specificity * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Precision (PPV):</span>
                  <span className="text-indigo-400 font-semibold tabular-nums">
                    {(liveMetrics.precision * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* 2. ROC Curve SVG */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-200">
                    ROC Curve (TPR vs FPR)
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-400">
                    AUC = {rocData.auc.toFixed(3)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-2">
                  Discrimination curve. Orange circle shows operating point at t={threshold.toFixed(2)}.
                </p>

                {/* Responsive SVG ROC Curve */}
                <div className="relative w-full aspect-square max-h-56 bg-slate-950 rounded-lg border border-slate-800/80 p-2 flex items-center justify-center">
                  <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                    <line x1="20" y1="20" x2="180" y2="20" stroke="#1e293b" strokeDasharray="2,2" />
                    <line x1="20" y1="100" x2="180" y2="100" stroke="#1e293b" strokeDasharray="2,2" />
                    <line x1="20" y1="180" x2="180" y2="180" stroke="#334155" />
                    <line x1="20" y1="20" x2="20" y2="180" stroke="#334155" />
                    <line x1="100" y1="20" x2="100" y2="180" stroke="#1e293b" strokeDasharray="2,2" />
                    <line x1="180" y1="20" x2="180" y2="180" stroke="#1e293b" strokeDasharray="2,2" />

                    {/* Diagonal Chance Line */}
                    <line x1="20" y1="180" x2="180" y2="20" stroke="#475569" strokeDasharray="3,3" />

                    {/* Shaded AUC Polygon */}
                    <polygon
                      points={`20,180 ${rocData.points
                        .map((p) => `${20 + p.fpr * 160},${180 - p.tpr * 160}`)
                        .join(' ')} 180,180`}
                      fill="rgba(99, 102, 241, 0.15)"
                    />

                    {/* ROC Curve Path */}
                    <polyline
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="2.5"
                      points={rocData.points
                        .map((p) => `${20 + p.fpr * 160},${180 - p.tpr * 160}`)
                        .join(' ')}
                    />

                    {/* Current Operating Point Marker */}
                    <circle
                      cx={20 + currentFpr * 160}
                      cy={180 - currentTpr * 160}
                      r="5"
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
              </div>

              <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                <span>FPR (1 - Spec): {(currentFpr * 100).toFixed(1)}%</span>
                <span>TPR (Recall): {(currentTpr * 100).toFixed(1)}%</span>
              </div>
            </div>

            {/* 3. Precision-Recall Curve SVG */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-200">
                    Precision-Recall Curve
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    PR-AUC = {prData.auc.toFixed(3)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-2">
                  Evaluates positive predictive value across recall levels. Critical for imbalanced classes.
                </p>

                {/* Responsive SVG PR Curve */}
                <div className="relative w-full aspect-square max-h-56 bg-slate-950 rounded-lg border border-slate-800/80 p-2 flex items-center justify-center">
                  <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                    <line x1="20" y1="20" x2="180" y2="20" stroke="#1e293b" strokeDasharray="2,2" />
                    <line x1="20" y1="100" x2="180" y2="100" stroke="#1e293b" strokeDasharray="2,2" />
                    <line x1="20" y1="180" x2="180" y2="180" stroke="#334155" />
                    <line x1="20" y1="20" x2="20" y2="180" stroke="#334155" />

                    <polygon
                      points={`20,180 ${prData.points
                        .map((p) => `${20 + p.recall * 160},${180 - p.precision * 160}`)
                        .join(' ')} 180,180`}
                      fill="rgba(16, 185, 129, 0.15)"
                    />

                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      points={prData.points
                        .map((p) => `${20 + p.recall * 160},${180 - p.precision * 160}`)
                        .join(' ')}
                    />

                    <circle
                      cx={20 + currentTpr * 160}
                      cy={180 - currentPrecision * 160}
                      r="5"
                      fill="#ec4899"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
              </div>

              <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                <span>Recall: {(currentTpr * 100).toFixed(1)}%</span>
                <span>Precision: {(currentPrecision * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MOCK DATASET TABLE TAB (Dedicated Table with Multi-Condition Filters) */}
      {activeTab === 'dataset' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm space-y-4">
          {/* Header & Filter Controls Bar */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-slate-200">
                  Diagnostic Evaluation Dataset (20 Clinical Patient Records)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Filter by quadrant, accuracy, or confidence level to inspect individual predictions without duplicates.
                </p>
              </div>

              {/* Record count indicator & reset button */}
              <div className="flex items-center gap-2.5 text-xs">
                <span className="font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded">
                  Showing {filteredTableSamples.length} of {mockClassificationSamples.length} records
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
              {/* Filter 1: Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Filter by patient or symptom..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60"
                />
              </div>

              {/* Filter 2: Quadrant */}
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-md p-1">
                {(['all', 'tp', 'fp', 'fn', 'tn'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => setTableFilter(q)}
                    className={`flex-1 py-0.5 text-[10px] font-mono uppercase rounded transition-colors cursor-pointer text-center ${
                      tableFilter === q
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Filter 3: Correctness */}
              <select
                value={correctnessFilter}
                onChange={(e) => setCorrectnessFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Predictions</option>
                <option value="correct">Correct Only (TP &amp; TN)</option>
                <option value="misclassified">Misclassified Only (FP &amp; FN)</option>
              </select>

              {/* Filter 4: Confidence */}
              <select
                value={confidenceFilter}
                onChange={(e) => setConfidenceFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Probabilities</option>
                <option value="high">High Confidence (p ≥ 80% or ≤ 20%)</option>
                <option value="uncertain">Borderline Uncertain (40% - 60%)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] text-slate-400">
                  <th className="py-2.5 px-4 font-semibold">Sample ID &amp; Modality</th>
                  <th className="py-2.5 px-4 font-semibold">Clinical Findings</th>
                  <th className="py-2.5 px-4 font-semibold text-center">True Label (y)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Predicted Prob (p)</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Decision (t={threshold.toFixed(2)})</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Outcome Quadrant</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Sample Log-Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredTableSamples.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                      No matching records found. Try adjusting or resetting your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTableSamples.map((row) => {
                    const isCorrect = row.trueLabel === row.predLabel;
                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          !isCorrect ? 'bg-rose-950/10' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4 font-sans font-medium text-slate-200">
                          {row.sampleName}
                        </td>
                        <td className="py-2.5 px-4 font-sans text-slate-400 max-w-xs truncate">
                          {row.featureSummary}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.trueLabel === 1
                                ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {row.trueLabel === 1 ? 'Positive (1)' : 'Negative (0)'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-slate-200 font-semibold">
                          {(row.predictedProbability * 100).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.predLabel === 1
                                ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/60'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {row.predLabel === 1 ? 'Class 1' : 'Class 0'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold">
                          {row.quadrant === 'tp' && (
                            <span className="text-emerald-400">TP</span>
                          )}
                          {row.quadrant === 'tn' && (
                            <span className="text-sky-400">TN</span>
                          )}
                          {row.quadrant === 'fp' && (
                            <span className="text-rose-400">FP (Type I)</span>
                          )}
                          {row.quadrant === 'fn' && (
                            <span className="text-amber-400">FN (Type II)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-slate-400">
                          {row.sampleLoss.toFixed(4)}
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
