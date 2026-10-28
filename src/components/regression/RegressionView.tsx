import React, { useState, useMemo } from 'react';
import { MetricDefinition, RegressionSample } from '../../types/metrics';
import { regressionMetricsList, mockRegressionSamples } from '../../data/mockData';
import { computeRegressionMetrics } from '../../utils/calculations';
import { MetricCard } from '../MetricCard';
import { ActiveTab } from '../Header';
import { Sliders, Flame, Search, RotateCcw } from 'lucide-react';

interface RegressionViewProps {
  activeTab: ActiveTab;
  searchQuery: string;
  onInspectMetric: (metric: MetricDefinition) => void;
}

export const RegressionView: React.FC<RegressionViewProps> = ({
  activeTab,
  searchQuery,
  onInspectMetric,
}) => {
  const [outlierMagnitude, setOutlierMagnitude] = useState<number>(0);
  const [huberDelta, setHuberDelta] = useState<number>(1.5);

  // Table filters for the Mock Dataset Table tab
  const [tableSearch, setTableSearch] = useState('');
  const [errorSeverityFilter, setErrorSeverityFilter] = useState<'all' | 'accurate' | 'moderate' | 'large'>('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'over' | 'under'>('all');
  const [sortBy, setSortBy] = useState<'id' | 'error_desc' | 'price_desc' | 'price_asc'>('error_desc');

  // Dynamically inject outlier into sample 0 if slider > 0
  const activeSamples: RegressionSample[] = useMemo(() => {
    return mockRegressionSamples.map((s, idx) => {
      if (idx === 0 && outlierMagnitude > 0) {
        return {
          ...s,
          predicted: s.actual + outlierMagnitude,
        };
      }
      return s;
    });
  }, [outlierMagnitude]);

  // Dynamic metrics calculation
  const calculatedMetrics = useMemo(() => {
    return computeRegressionMetrics(activeSamples, huberDelta, 4);
  }, [activeSamples, huberDelta]);

  // Filtered metrics for global search
  const filteredMetrics = useMemo(() => {
    if (!searchQuery) return regressionMetricsList;
    const q = searchQuery.toLowerCase();
    return regressionMetricsList.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.shortName.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Filtered samples for dataset table
  const filteredTableSamples = useMemo(() => {
    return activeSamples
      .filter((s) => {
        const residual = s.actual - s.predicted;
        const absErr = Math.abs(residual);

        // 1. Error magnitude filter
        const matchesSeverity =
          errorSeverityFilter === 'all' ||
          (errorSeverityFilter === 'accurate' && absErr <= 2.0) ||
          (errorSeverityFilter === 'moderate' && absErr > 2.0 && absErr <= 5.0) ||
          (errorSeverityFilter === 'large' && absErr > 5.0);

        // 2. Direction filter (over vs underpredicted)
        const matchesDirection =
          directionFilter === 'all' ||
          (directionFilter === 'over' && s.predicted > s.actual) ||
          (directionFilter === 'under' && s.predicted < s.actual);

        // 3. Search query
        const matchesSearch =
          tableSearch === '' ||
          s.id.toLowerCase().includes(tableSearch.toLowerCase()) ||
          s.featureInfo.toLowerCase().includes(tableSearch.toLowerCase());

        return matchesSeverity && matchesDirection && matchesSearch;
      })
      .sort((a, b) => {
        const errA = Math.abs(a.actual - a.predicted);
        const errB = Math.abs(b.actual - b.predicted);
        if (sortBy === 'error_desc') return errB - errA;
        if (sortBy === 'price_desc') return b.actual - a.actual;
        if (sortBy === 'price_asc') return a.actual - b.actual;
        return a.id.localeCompare(b.id);
      });
  }, [activeSamples, errorSeverityFilter, directionFilter, tableSearch, sortBy]);

  const handleResetFilters = () => {
    setTableSearch('');
    setErrorSeverityFilter('all');
    setDirectionFilter('all');
    setSortBy('error_desc');
  };

  const metricOverrides: Record<string, string> = {
    mse: calculatedMetrics.mse.toFixed(2),
    rmse: `${calculatedMetrics.rmse.toFixed(2)} units`,
    mae: `${calculatedMetrics.mae.toFixed(2)} units`,
    mape: `${calculatedMetrics.mape.toFixed(1)}%`,
    r2: calculatedMetrics.r2.toFixed(3),
    huber: calculatedMetrics.huberLoss.toFixed(2),
  };

  const minVal = 40;
  const maxVal = 240;
  const range = maxVal - minVal;

  return (
    <div className="space-y-6">
      {/* 1. MERGED METRICS & INTERACTIVE PLAYGROUND TAB */}
      {activeTab === 'playground' && (
        <div className="space-y-6">
          {/* Outlier & Huber Delta Calibration Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Outlier Injector Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      Outlier Sensitivity Injector:
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-300 bg-rose-950/70 border border-rose-800 px-2 py-0.5 rounded tabular-nums">
                      +{outlierMagnitude} error
                    </span>
                  </div>
                  <button
                    onClick={() => setOutlierMagnitude(0)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-slate-500">0</span>
                  <input
                    type="range"
                    min={0}
                    max={75}
                    step={5}
                    value={outlierMagnitude}
                    onChange={(e) => setOutlierMagnitude(parseFloat(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <span className="text-[11px] font-mono text-slate-500">+75</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Notice how MSE &amp; RMSE spike quadratically while MAE rises only linearly.
                </p>
              </div>

              {/* Huber Loss Delta Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      Huber Loss Threshold (δ):
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-800 px-2 py-0.5 rounded tabular-nums">
                      δ = {huberDelta.toFixed(1)}
                    </span>
                  </div>
                  <button
                    onClick={() => setHuberDelta(1.5)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                  >
                    Reset to 1.5
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-slate-500">0.5</span>
                  <input
                    type="range"
                    min={0.5}
                    max={5.0}
                    step={0.5}
                    value={huberDelta}
                    onChange={(e) => setHuberDelta(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <span className="text-[11px] font-mono text-slate-500">5.0</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Residuals ≤ δ are penalized quadratically; residuals &gt; δ are penalized linearly.
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Metrics Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Live Evaluated Regression Metrics
              </h3>
              <span className="text-[11px] text-slate-400">
                Click &quot;Method&quot; on any card to inspect mathematical steps
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
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

          {/* Visualizations: Actual vs Predicted + Loss Function Shapes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 1. Actual vs Predicted Scatter Plot */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-200">
                    Actual (y) vs Predicted (ŷ) Scatter Plot
                  </span>
                  <span className="text-xs font-mono font-bold text-sky-400">
                    R² = {calculatedMetrics.r2.toFixed(3)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Points on the diagonal line represent perfect zero-error predictions. Vertical stems show residuals.
                </p>

                {/* SVG Scatter Plot */}
                <div className="relative w-full aspect-square max-h-72 bg-slate-950 rounded-lg border border-slate-800/80 p-2 flex items-center justify-center">
                  <svg viewBox="0 0 240 240" className="w-full h-full overflow-visible">
                    <line x1="30" y1="30" x2="220" y2="30" stroke="#1e293b" strokeDasharray="2,2" />
                    <line x1="30" y1="125" x2="220" y2="125" stroke="#1e293b" strokeDasharray="2,2" />
                    <line x1="30" y1="210" x2="220" y2="210" stroke="#334155" />
                    <line x1="30" y1="30" x2="30" y2="210" stroke="#334155" />
                    <line x1="125" y1="30" x2="125" y2="210" stroke="#1e293b" strokeDasharray="2,2" />
                    <line x1="220" y1="30" x2="220" y2="210" stroke="#1e293b" strokeDasharray="2,2" />

                    {/* Ideal Fit Line y = x */}
                    <line x1="30" y1="210" x2="220" y2="30" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3,3" />

                    {/* Residual Stems & Points */}
                    {activeSamples.map((s, idx) => {
                      const normActual = (s.actual - minVal) / range;
                      const normPred = (s.predicted - minVal) / range;

                      const cx = 30 + normActual * 190;
                      const cy = 210 - normPred * 190;
                      const diagY = 210 - normActual * 190;

                      const isOutlier = idx === 0 && outlierMagnitude > 0;

                      return (
                        <g key={s.id}>
                          <line
                            x1={cx}
                            y1={cy}
                            x2={cx}
                            y2={diagY}
                            stroke={isOutlier ? '#f43f5e' : '#38bdf8'}
                            strokeWidth={isOutlier ? 2 : 1}
                            strokeOpacity={isOutlier ? 0.9 : 0.5}
                          />
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isOutlier ? 6 : 4}
                            fill={isOutlier ? '#f43f5e' : '#38bdf8'}
                            stroke="#ffffff"
                            strokeWidth={1.5}
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>X: Actual Home Price ($k)</span>
                <span>Y: Predicted Home Price ($k)</span>
              </div>
            </div>

            {/* 2. Loss Functions Comparison Curves */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-200">
                    Loss Penalty Comparison: Squared vs Absolute vs Huber
                  </span>
                  <span className="text-xs font-mono text-emerald-400">
                    Smooth Transition at δ={huberDelta.toFixed(1)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Shows penalty growth as residual error |e| increases from 0 to 4 units.
                </p>

                <div className="relative w-full aspect-square max-h-72 bg-slate-950 rounded-lg border border-slate-800/80 p-2 flex items-center justify-center">
                  <svg viewBox="0 0 240 240" className="w-full h-full overflow-visible">
                    <line x1="30" y1="210" x2="220" y2="210" stroke="#334155" />
                    <line x1="125" y1="30" x2="125" y2="210" stroke="#334155" />
                    <line x1="125" y1="30" x2="125" y2="210" stroke="#475569" strokeDasharray="2,2" />

                    {/* Squared Loss (MSE): e^2 */}
                    <path
                      d={Array.from({ length: 41 }, (_, i) => {
                        const e = -3.5 + (i * 7) / 40;
                        const loss = Math.min(10, e * e);
                        const x = 125 + (e / 4) * 90;
                        const y = 210 - (loss / 10) * 170;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="2"
                    />

                    {/* Absolute Loss (MAE): |e| */}
                    <path
                      d={`M ${125 - (3.5 / 4) * 90} ${210 - (3.5 / 10) * 170} L 125 210 L ${125 + (3.5 / 4) * 90} ${210 - (3.5 / 10) * 170}`}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      strokeDasharray="4,2"
                    />

                    {/* Huber Loss */}
                    <path
                      d={Array.from({ length: 41 }, (_, i) => {
                        const e = -3.5 + (i * 7) / 40;
                        const absE = Math.abs(e);
                        const loss =
                          absE <= huberDelta
                            ? 0.5 * e * e
                            : huberDelta * (absE - 0.5 * huberDelta);
                        const x = 125 + (e / 4) * 90;
                        const y = 210 - (Math.min(10, loss) / 10) * 170;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                    />
                  </svg>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-around text-[11px] font-mono">
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2.5 h-0.5 bg-rose-500 inline-block"></span>
                  MSE (e²) - Outlier Sensitive
                </span>
                <span className="flex items-center gap-1.5 text-sky-400">
                  <span className="w-2.5 h-0.5 bg-sky-400 inline-block border-b border-dashed"></span>
                  MAE (|e|) - Linear
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2.5 h-0.5 bg-emerald-400 inline-block"></span>
                  Huber (δ={huberDelta.toFixed(1)})
                </span>
              </div>
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
                  Continuous Property Valuation Test Set (15 Records)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Filter by residual magnitude, prediction bias direction, or sort by error to inspect individual predictions.
                </p>
              </div>

              <div className="flex items-center gap-2.5 text-xs">
                <span className="font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded">
                  Showing {filteredTableSamples.length} of {activeSamples.length} records
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
                  placeholder="Filter by zip, beds, sqft..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60"
                />
              </div>

              {/* Error Severity Filter */}
              <select
                value={errorSeverityFilter}
                onChange={(e) => setErrorSeverityFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Error Magnitudes</option>
                <option value="accurate">Highly Accurate (|e| ≤ 2.0)</option>
                <option value="moderate">Moderate Error (2.0 &lt; |e| ≤ 5.0)</option>
                <option value="large">Large Errors / Outliers (|e| &gt; 5.0)</option>
              </select>

              {/* Direction Filter */}
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Prediction Directions</option>
                <option value="over">Overpredicted (ŷ &gt; y)</option>
                <option value="under">Underpredicted (ŷ &lt; y)</option>
              </select>

              {/* Sort Order */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="error_desc">Sort: Highest Error First</option>
                <option value="price_desc">Sort: Highest Price First</option>
                <option value="price_asc">Sort: Lowest Price First</option>
                <option value="id">Sort: Sample ID</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] text-slate-400">
                  <th className="py-2.5 px-4 font-semibold">Sample ID</th>
                  <th className="py-2.5 px-4 font-semibold">Feature Attributes</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actual (y)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Predicted (ŷ)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Residual (y - ŷ)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Absolute Error (|e|)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Squared Error (e²)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">% Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredTableSamples.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                      No matching records found. Try adjusting or resetting your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTableSamples.map((s) => {
                    const residual = s.actual - s.predicted;
                    const absErr = Math.abs(residual);
                    const sqErr = residual * residual;
                    const pctErr = s.actual !== 0 ? (absErr / Math.abs(s.actual)) * 100 : 0;
                    const isOutlier = s.id === 'R-01' && outlierMagnitude > 0;

                    return (
                      <tr
                        key={s.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isOutlier ? 'bg-rose-950/20' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4 font-sans font-medium text-slate-200">
                          {s.id}
                          {isOutlier && (
                            <span className="ml-1 text-[10px] text-rose-400 font-bold">
                              [Outlier]
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-sans text-slate-400 max-w-xs truncate">
                          {s.featureInfo}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-slate-200">
                          ${s.actual.toFixed(1)}k
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-slate-200 font-semibold">
                          ${s.predicted.toFixed(1)}k
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right tabular-nums ${
                            residual >= 0 ? 'text-sky-400' : 'text-rose-400'
                          }`}
                        >
                          {residual >= 0 ? `+${residual.toFixed(2)}` : residual.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-slate-300">
                          {absErr.toFixed(2)}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right tabular-nums font-bold ${
                            sqErr > 25 ? 'text-rose-400' : 'text-slate-400'
                          }`}
                        >
                          {sqErr.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-slate-400">
                          {pctErr.toFixed(1)}%
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
