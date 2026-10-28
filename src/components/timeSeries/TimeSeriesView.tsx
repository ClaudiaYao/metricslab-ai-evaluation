import React, { useState, useMemo } from 'react';
import { ActiveTab } from '../Header';
import { MetricDefinition } from '../../types/metrics';
import { timeSeriesMetricsList, mockTimeSeriesDataset } from '../../data/timeSeriesMockData';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  Search,
  Download,
  Filter,
  Sliders,
  Sparkles,
  Info,
} from 'lucide-react';

interface TimeSeriesViewProps {
  activeTab: ActiveTab;
  searchQuery: string;
  onInspectMetric: (metric: MetricDefinition) => void;
}

export const TimeSeriesView: React.FC<TimeSeriesViewProps> = ({
  activeTab,
  searchQuery,
  onInspectMetric,
}) => {
  // Playground interactive sliders
  const [noiseLevel, setNoiseLevel] = useState<number>(3); // 0% to 15% random noise
  const [phaseLag, setPhaseLag] = useState<number>(0); // -2 to +2 hours lag
  const [injectZeroSpike, setInjectZeroSpike] = useState<boolean>(false);

  // Table filters
  const [tableSearch, setTableSearch] = useState('');
  const [errorFilter, setErrorFilter] = useState<'all' | 'low' | 'med' | 'high'>('all');
  const [anomalyFilter, setAnomalyFilter] = useState<'all' | 'anomaly' | 'normal'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Base 24-hour demand series (MW)
  const baseActuals = useMemo(
    () => [
      412, 388, 374, 365, 380, 426, 498, 562, 615, 649, 660, 672,
      655, 680, 785, 740, 710, 692, 730, 706, 640, 570, 496, 440,
    ],
    []
  );

  // Compute live series & metrics based on playground controls
  const simulation = useMemo(() => {
    const actuals = baseActuals.map((val, idx) => {
      // If zero spike injected at hour 3
      if (injectZeroSpike && idx === 3) return 0.5; // near zero to trigger MAPE division explosion!
      return val;
    });

    const predictions = actuals.map((val, idx) => {
      // Apply lag
      const lagIdx = Math.max(0, Math.min(actuals.length - 1, idx - phaseLag));
      const laggedVal = actuals[lagIdx];
      // Deterministic pseudo-noise based on index
      const pseudoRandom = Math.sin(idx * 1.5 + 0.3) * (noiseLevel / 100);
      return Math.round(laggedVal * (1 + pseudoRandom) * 10) / 10;
    });

    // In-sample naive 1-step persistence baseline (y_t = y_{t-1})
    const naivePredictions = actuals.map((val, idx) => {
      if (idx === 0) return val;
      return actuals[idx - 1];
    });

    // Calculate MAPE
    let mapeSum = 0;
    actuals.forEach((act, idx) => {
      const pred = predictions[idx];
      const relError = Math.abs(act - pred) / Math.max(act, 0.001);
      mapeSum += relError;
    });
    const mape = (mapeSum / actuals.length) * 100;

    // Calculate SMAPE
    let smapeSum = 0;
    actuals.forEach((act, idx) => {
      const pred = predictions[idx];
      const denom = (Math.abs(act) + Math.abs(pred)) / 2;
      smapeSum += denom > 0 ? Math.abs(act - pred) / denom : 0;
    });
    const smape = (smapeSum / actuals.length) * 100;

    // Calculate MASE: MAE_model / MAE_naive
    let modelMaeSum = 0;
    actuals.forEach((act, idx) => {
      modelMaeSum += Math.abs(act - predictions[idx]);
    });
    const modelMae = modelMaeSum / actuals.length;

    let naiveMaeSum = 0;
    for (let i = 1; i < actuals.length; i++) {
      naiveMaeSum += Math.abs(actuals[i] - actuals[i - 1]);
    }
    const naiveMae = naiveMaeSum / (actuals.length - 1);
    const mase = naiveMae > 0 ? modelMae / naiveMae : 1.0;

    // Calculate WAPE
    let sumAbsErrors = 0;
    let sumActuals = 0;
    actuals.forEach((act, idx) => {
      sumAbsErrors += Math.abs(act - predictions[idx]);
      sumActuals += act;
    });
    const wape = sumActuals > 0 ? (sumAbsErrors / sumActuals) * 100 : 0;

    // Calculate Directional Accuracy
    let correctDirections = 0;
    for (let i = 1; i < actuals.length; i++) {
      const actualTrend = Math.sign(actuals[i] - actuals[i - 1]);
      const predTrend = Math.sign(predictions[i] - actuals[i - 1]);
      if (actualTrend === predTrend) correctDirections++;
    }
    const mda = (correctDirections / (actuals.length - 1)) * 100;

    return { actuals, predictions, naivePredictions, mape, smape, mase, wape, mda };
  }, [baseActuals, noiseLevel, phaseLag, injectZeroSpike]);

  // SVG Chart Dimensions
  const chartW = 740;
  const chartH = 220;
  const padL = 45;
  const padR = 20;
  const padT = 20;
  const padB = 30;

  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const minVal = 300;
  const maxVal = 850;

  const toCoords = (val: number, idx: number) => {
    const x = padL + (idx / 23) * innerW;
    const y = padT + innerH - ((val - minVal) / (maxVal - minVal)) * innerH;
    return { x, y: Math.max(padT, Math.min(padT + innerH, y)) };
  };

  const actualPath = simulation.actuals
    .map((val, idx) => {
      const { x, y } = toCoords(val, idx);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const predPath = simulation.predictions
    .map((val, idx) => {
      const { x, y } = toCoords(val, idx);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const naivePath = simulation.naivePredictions
    .map((val, idx) => {
      const { x, y } = toCoords(val, idx);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  // Table rows follow the simulated series (row i = hour i)
  const liveDataset = useMemo(
    () =>
      mockTimeSeriesDataset.map((sample, i) => {
        const actual = simulation.actuals[i] ?? sample.actual;
        const predicted = simulation.predictions[i] ?? sample.predicted;
        const absoluteError = Math.abs(actual - predicted);
        return {
          ...sample,
          actual,
          predicted,
          naiveBaseline: simulation.naivePredictions[i] ?? sample.naiveBaseline,
          absoluteError,
          percentageError: (absoluteError / Math.max(actual, 0.001)) * 100,
        };
      }),
    [simulation]
  );

  // Filtered dataset table
  const filteredDataset = useMemo(() => {
    return liveDataset.filter((sample) => {
      const matchesSearch =
        tableSearch === '' ||
        sample.id.toLowerCase().includes(tableSearch.toLowerCase()) ||
        sample.timestamp.toLowerCase().includes(tableSearch.toLowerCase()) ||
        sample.seriesName.toLowerCase().includes(tableSearch.toLowerCase());

      const matchesAnomaly =
        anomalyFilter === 'all' ||
        (anomalyFilter === 'anomaly' && sample.isAnomaly) ||
        (anomalyFilter === 'normal' && !sample.isAnomaly);

      const matchesError =
        errorFilter === 'all' ||
        (errorFilter === 'low' && sample.percentageError < 1.0) ||
        (errorFilter === 'med' && sample.percentageError >= 1.0 && sample.percentageError <= 3.0) ||
        (errorFilter === 'high' && sample.percentageError > 3.0);

      return matchesSearch && matchesAnomaly && matchesError;
    });
  }, [liveDataset, tableSearch, anomalyFilter, errorFilter]);

  const totalPages = Math.ceil(filteredDataset.length / pageSize) || 1;
  const paginatedDataset = filteredDataset.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const exportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Series', 'Actual (MW)', 'Predicted (MW)', 'Naive Baseline', 'Abs Error', 'Pct Error (%)', 'Is Anomaly'];
    const rows = filteredDataset.map((s) => [
      s.id,
      `"${s.timestamp}"`,
      `"${s.seriesName}"`,
      s.actual,
      s.predicted,
      s.naiveBaseline,
      s.absoluteError,
      s.percentageError,
      s.isAnomaly ? 'Yes' : 'No',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'timeseries_evaluation_dataset.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const q = searchQuery.toLowerCase();
  const badges = [
    {
      id: 'mape',
      label: 'Dynamic MAPE',
      value: simulation.mape > 999 ? '>10,000%' : `${simulation.mape.toFixed(2)}%`,
      color: simulation.mape > 25 ? 'text-rose-400' : 'text-indigo-400',
      note: injectZeroSpike ? '⚠️ Exploded by near-zero' : 'Relative scale',
    },
    {
      id: 'smape',
      label: 'Dynamic SMAPE',
      value: `${simulation.smape.toFixed(2)}%`,
      color: 'text-emerald-400',
      note: 'Bounded in [0%, 200%]',
    },
    {
      id: 'mase',
      label: 'Dynamic MASE',
      value: simulation.mase.toFixed(3),
      color: simulation.mase < 1.0 ? 'text-cyan-400' : 'text-amber-400',
      note: simulation.mase < 1.0 ? '✓ Beats naive persistence' : '✕ Worse than naive',
    },
    {
      id: 'wape',
      label: 'Dynamic WAPE',
      value: `${simulation.wape.toFixed(2)}%`,
      color: 'text-purple-400',
      note: 'Volume-weighted error',
    },
    {
      id: 'mda',
      label: 'Directional Acc (MDA)',
      value: `${simulation.mda.toFixed(1)}%`,
      color: 'text-amber-400',
      note: 'Up/Down trend match',
    },
  ].filter((b) => q === '' || b.label.toLowerCase().includes(q) || b.id.includes(q));

  return (
    <div className="space-y-6">
      {/* TAB 1: METRICS & PLAYGROUND */}
      {activeTab === 'playground' && (
        <>
          {/* Interactive Forecast Horizon Playground */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  Interactive Forecast Horizon &amp; Metric Robustness Simulator
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust forecast noise, introduce phase lag, or test near-zero demand spikes to compare how MAPE vs. SMAPE vs. MASE behave under stress.
                </p>
              </div>

              {/* Zero Spike Toggle */}
              <button
                onClick={() => setInjectZeroSpike(!injectZeroSpike)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
                  injectZeroSpike
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Test Zero Spike (MAPE Explosion)</span>
              </button>
            </div>

            {/* Playground Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Forecast Noise (Variance σ):</span>
                  <span className="font-mono text-indigo-400 font-bold">±{noiseLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="1"
                  value={noiseLevel}
                  onChange={(e) => setNoiseLevel(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Forecast Phase Lag:</span>
                  <span className="font-mono text-indigo-400 font-bold">
                    {phaseLag > 0 ? `+${phaseLag}h delay` : phaseLag < 0 ? `${phaseLag}h lead` : 'Synchronous (0h)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="1"
                  value={phaseLag}
                  onChange={(e) => setPhaseLag(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Dynamic Metric Badges */}
            <div className="flex items-center justify-between -mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                Time Series &amp; Forecasting Metrics
              </h3>
              <span className="text-[11px] text-slate-500">
                Click the <Info className="w-3 h-3 inline -mt-0.5" /> icon for formulation &amp; code
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {badges.map((b) => (
                <div key={b.id} className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-[11px] text-slate-400 block">{b.label}</span>
                    <button
                      onClick={() => {
                        const def = timeSeriesMetricsList.find((m) => m.id === b.id);
                        if (def) onInspectMetric(def);
                      }}
                      className="text-slate-500 hover:text-indigo-400 cursor-pointer"
                      title="Inspect calculation method & Python code"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className={`text-xl font-bold font-mono ${b.color}`}>{b.value}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">{b.note}</span>
                </div>
              ))}
            </div>

            {/* SVG Visualizer */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium text-slate-300">
                  24-Hour Horizon Power Load (Megawatts)
                </span>
                <div className="flex items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-emerald-400 rounded-full inline-block" />
                    <span className="text-slate-300">Ground Truth Actual</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-indigo-400 rounded-full inline-block" />
                    <span className="text-slate-300">Model Prediction</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-slate-600 rounded-full inline-block border-t border-dashed" />
                    <span className="text-slate-400">Naive Persistence (y_t-1)</span>
                  </div>
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  className="w-full h-52 select-none"
                >
                  {/* Grid Lines */}
                  {[350, 500, 650, 800].map((gVal) => {
                    const y = padT + innerH - ((gVal - minVal) / (maxVal - minVal)) * innerH;
                    return (
                      <g key={gVal}>
                        <line
                          x1={padL}
                          y1={y}
                          x2={chartW - padR}
                          y2={y}
                          stroke="#1e293b"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={padL - 8}
                          y={y + 3}
                          fill="#64748b"
                          fontSize="9"
                          fontFamily="monospace"
                          textAnchor="end"
                        >
                          {gVal} MW
                        </text>
                      </g>
                    );
                  })}

                  {/* X Axis Timestamps (every 4 hours) */}
                  {[0, 4, 8, 12, 16, 20, 23].map((hr) => {
                    const x = padL + (hr / 23) * innerW;
                    return (
                      <text
                        key={hr}
                        x={x}
                        y={chartH - 8}
                        fill="#64748b"
                        fontSize="9"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {hr.toString().padStart(2, '0')}:00
                      </text>
                    );
                  })}

                  {/* Naive Baseline Line */}
                  <path
                    d={naivePath}
                    fill="none"
                    stroke="#475569"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />

                  {/* Ground Truth Actual Line */}
                  <path
                    d={actualPath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                  />

                  {/* Model Forecast Line */}
                  <path
                    d={predPath}
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              {/* Explanatory note */}
              <div className="p-3 bg-slate-900/60 rounded border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong className="text-slate-200">The MASE &amp; Zero-Demand Advantage:</strong> Notice how standard MAPE divides by $y_t$. When testing the Zero Spike button, MAPE explodes into massive thousands of percent, whereas <strong className="text-indigo-300">MASE</strong> scales by the mean naive difference in the training series, making it strictly finite and statistically robust across intermittent or zero-demand datasets.
                </p>
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
                <Activity className="w-4 h-4 text-indigo-400" />
                24-Hour Power Load Telemetry &amp; Forecast Evaluation
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Hourly grid load evaluation dataset comparing machine learning model predictions against actual sensor telemetry and naive lag-1 persistence.
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
                placeholder="Search timestamp, ID, or series..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={errorFilter}
                onChange={(e) => {
                  setErrorFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Error Ranges</option>
                <option value="low">Low Deviation (&lt; 1.0%)</option>
                <option value="med">Moderate Deviation (1.0% - 3.0%)</option>
                <option value="high">High Deviation (&gt; 3.0%)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={anomalyFilter}
                onChange={(e) => {
                  setAnomalyFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Weather &amp; Anomaly Statuses</option>
                <option value="anomaly">Anomalous Surges Only</option>
                <option value="normal">Normal Grid Operations</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Interval ID</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actual Load</th>
                  <th className="py-2.5 px-3">Model Forecast</th>
                  <th className="py-2.5 px-3">Naive (y_t-1)</th>
                  <th className="py-2.5 px-3">Abs Error</th>
                  <th className="py-2.5 px-3">Pct Error</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                {paginatedDataset.map((sample) => (
                  <tr key={sample.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                      {sample.id}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {sample.timestamp}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                      {sample.actual.toFixed(1)} MW
                    </td>
                    <td className="py-2.5 px-3 font-mono text-indigo-400">
                      {sample.predicted.toFixed(1)} MW
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {sample.naiveBaseline.toFixed(1)} MW
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {sample.absoluteError.toFixed(1)} MW
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <span className={sample.percentageError > 3 ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                        {sample.percentageError.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {sample.isAnomaly ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Heatwave Surge
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Nominal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {paginatedDataset.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No time-series samples match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            <span>
              Showing {paginatedDataset.length} of {filteredDataset.length} intervals
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
