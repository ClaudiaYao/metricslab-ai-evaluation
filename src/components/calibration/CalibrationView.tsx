import React, { useState, useMemo } from 'react';
import { ActiveTab } from '../Header';
import { MetricDefinition } from '../../types/metrics';
import { MetricCard } from '../MetricCard';
import { LiveMetricLabel } from '../LiveMetricLabel';
import { calibrationMetricsList, mockCalibrationDataset } from '../../data/calibrationMockData';
import {
  Target,
  Search,
  Download,
  Filter,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

interface CalibrationViewProps {
  activeTab: ActiveTab;
  searchQuery: string;
  onInspectMetric: (metric: MetricDefinition) => void;
}

export const CalibrationView: React.FC<CalibrationViewProps> = ({
  activeTab,
  searchQuery,
  onInspectMetric,
}) => {
  // Playground state: Temperature scaling parameter T
  const [temperature, setTemperature] = useState<number>(1.0); // 0.5 (overconfident) to 2.5 (softened)

  // Dataset Table state
  const [tableSearch, setTableSearch] = useState('');
  const [binFilter, setBinFilter] = useState('all');
  const [correctFilter, setCorrectFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // 10 confidence bins with uncalibrated baseline logits
  const baseBins = useMemo(
    () => [
      { bin: '0.0 - 0.1', conf: 0.08, acc: 0.12, count: 50 },
      { bin: '0.1 - 0.2', conf: 0.17, acc: 0.19, count: 80 },
      { bin: '0.2 - 0.3', conf: 0.26, acc: 0.28, count: 110 },
      { bin: '0.3 - 0.4', conf: 0.36, acc: 0.37, count: 140 },
      { bin: '0.4 - 0.5', conf: 0.47, acc: 0.46, count: 180 },
      { bin: '0.5 - 0.6', conf: 0.58, acc: 0.54, count: 230 },
      { bin: '0.6 - 0.7', conf: 0.69, acc: 0.62, count: 310 },
      { bin: '0.7 - 0.8', conf: 0.81, acc: 0.71, count: 420 },
      { bin: '0.8 - 0.9', conf: 0.91, acc: 0.80, count: 650 },
      { bin: '0.9 - 1.0', conf: 0.97, acc: 0.88, count: 820 },
    ],
    []
  );

  // Scaled bins and metrics based on Temperature T
  const simulation = useMemo(() => {
    // When T > 1, high confidences are compressed down toward accuracy
    const totalSamples = baseBins.reduce((sum, b) => sum + b.count, 0);

    const scaledBins = baseBins.map((b) => {
      // Softmax temperature scaling effect on confidence
      const logit = Math.log(b.conf / (1 - b.conf));
      const scaledLogit = logit / temperature;
      const scaledConf = 1 / (1 + Math.exp(-scaledLogit));
      const gap = Math.abs(b.acc - scaledConf);
      return { ...b, scaledConf, gap };
    });

    let ece = 0;
    let mce = 0;
    scaledBins.forEach((b) => {
      ece += (b.count / totalSamples) * b.gap;
      if (b.gap > mce) mce = b.gap;
    });

    // Approximate Brier score & NLL change
    const brier = Math.max(0.04, 0.088 - (temperature - 1.0) * 0.02);
    const nll = Math.max(0.24, 0.312 - (temperature - 1.0) * 0.035);

    return { scaledBins, ece, mce, brier, nll };
  }, [baseBins, temperature]);

  // Filtered dataset table
  const filteredDataset = useMemo(() => {
    return mockCalibrationDataset.filter((sample) => {
      const matchesSearch =
        tableSearch === '' ||
        sample.id.toLowerCase().includes(tableSearch.toLowerCase()) ||
        sample.sampleId.toLowerCase().includes(tableSearch.toLowerCase()) ||
        sample.predictedClass.toLowerCase().includes(tableSearch.toLowerCase());

      const matchesBin =
        binFilter === 'all' || sample.confidenceBin === binFilter;

      const matchesCorrect =
        correctFilter === 'all' ||
        (correctFilter === 'correct' && sample.isCorrect) ||
        (correctFilter === 'incorrect' && !sample.isCorrect);

      return matchesSearch && matchesBin && matchesCorrect;
    });
  }, [tableSearch, binFilter, correctFilter]);

  const totalPages = Math.ceil(filteredDataset.length / pageSize) || 1;
  const paginatedDataset = filteredDataset.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const exportCSV = () => {
    const headers = ['ID', 'Sample ID', 'Predicted Class', 'Confidence', 'Ground Truth', 'Is Correct', 'Confidence Bin', 'Calibration Gap'];
    const rows = filteredDataset.map((s) => [
      s.id,
      s.sampleId,
      s.predictedClass,
      s.confidence,
      s.groundTruth,
      s.isCorrect ? 'Yes' : 'No',
      `"${s.confidenceBin}"`,
      s.binCalibrationGap,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'model_calibration_dataset.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const liveIds = ['ece', 'mce', 'brier-score', 'nll'];
  const metricById = (id: string) => calibrationMetricsList.find((m) => m.id === id);
  const referenceMetrics = calibrationMetricsList.filter(
    (m) =>
      !liveIds.includes(m.id) &&
      (searchQuery === '' ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.shortName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* TAB 1: METRICS & PLAYGROUND */}
      {activeTab === 'playground' && (
        <>
          {/* Reference metrics with no live counterpart in the simulator */}
          {referenceMetrics.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                  Reference Metrics (not driven by controls)
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {referenceMetrics.map((metric) => (
                  <MetricCard key={metric.id} metric={metric} onInspect={() => onInspectMetric(metric)} />
                ))}
              </div>
            </div>
          )}

          {/* Interactive Reliability Diagram & Temperature Scaling */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  Reliability Diagram &amp; Temperature Scaling Simulator (T)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust Temperature $T$ to calibrate overconfident neural network logits: dividing logits by $T$ softens predicted probabilities without altering ranking or accuracy.
                </p>
              </div>

              {/* Temperature Reset */}
              <button
                onClick={() => setTemperature(1.4)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-slate-800 transition-colors cursor-pointer shrink-0"
              >
                Optimal Calibration (T=1.40)
              </button>
            </div>

            {/* Slider */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Temperature Parameter (T):</span>
                <span className="font-mono text-indigo-400 font-bold">T = {temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>T &lt; 1.0 (Overconfident)</span>
                <span>T = 1.0 (Raw Model Output)</span>
                <span>T &gt; 1.0 (Calibrated / Softened)</span>
              </div>
            </div>

            {/* Live Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label="Expected Calib Error (ECE)" metric={metricById('ece')} onInspect={onInspectMetric} />
                <span className={`text-xl font-bold font-mono ${simulation.ece < 0.04 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {(simulation.ece * 100).toFixed(2)}%
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Lower is better • Ideal = 0.0%
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label="Max Calib Error (MCE)" metric={metricById('mce')} onInspect={onInspectMetric} />
                <span className="text-xl font-bold font-mono text-cyan-400">
                  {(simulation.mce * 100).toFixed(2)}%
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Worst-case bin divergence
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label="Brier Score" metric={metricById('brier-score')} onInspect={onInspectMetric} />
                <span className="text-xl font-bold font-mono text-purple-400">
                  {simulation.brier.toFixed(3)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Strictly proper scoring rule
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label="Negative Log-Likelihood" metric={metricById('nll')} onInspect={onInspectMetric} />
                <span className="text-xl font-bold font-mono text-indigo-400">
                  {simulation.nll.toFixed(3)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Cross-entropy penalty
                </span>
              </div>
            </div>

            {/* Reliability Diagram SVG */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium text-slate-300">
                  Reliability Diagram: Confidence vs. Empirical Accuracy
                </span>
                <div className="flex items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-slate-500 rounded-full inline-block border-t border-dashed" />
                    <span className="text-slate-400">Perfect Calibration (y = x)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-indigo-500/30 border border-indigo-500/60 inline-block" />
                    <span className="text-slate-300">Empirical Accuracy per Bin</span>
                  </div>
                </div>
              </div>

              <div className="w-full">
                <svg viewBox="0 0 550 220" className="w-full h-52 select-none">
                  {/* Grid */}
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map((v) => {
                    const y = 180 - v * 150;
                    return (
                      <g key={v}>
                        <line x1="45" y1={y} x2="520" y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                        <text x="38" y={y + 3} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="end">
                          {(v * 100).toFixed(0)}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Diagonal Ideal Line */}
                  <line x1="45" y1="180" x2="520" y2="30" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 4" />

                  {/* Bins bars */}
                  {simulation.scaledBins.map((b, idx) => {
                    const binW = 40;
                    const x = 50 + idx * 46;
                    const barH = b.acc * 150;
                    const y = 180 - barH;
                    const confY = 180 - b.scaledConf * 150;

                    return (
                      <g key={idx}>
                        {/* Accuracy Bar */}
                        <rect
                          x={x}
                          y={y}
                          width={binW}
                          height={barH}
                          fill="rgba(99, 102, 241, 0.25)"
                          stroke="#6366f1"
                          strokeWidth="1"
                          rx="2"
                        />
                        {/* Confidence Indicator marker */}
                        <line
                          x1={x - 2}
                          y1={confY}
                          x2={x + binW + 2}
                          y2={confY}
                          stroke="#f43f5e"
                          strokeWidth="2.5"
                        />
                        {/* Bin label */}
                        <text x={x + binW / 2} y="196" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle">
                          {idx * 10}%
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="p-3 bg-slate-900/60 rounded border border-slate-800/80 text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-200">What is the red marker?</strong> The red line represents average model confidence, while the blue bar represents actual empirical accuracy. When the red line is higher than the blue bar, the model is <strong className="text-rose-400">overconfident</strong>. Increasing $T$ lowers the red line, bringing confidence in line with true accuracy.
              </div>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: MOCK DATASET TABLE */}
      {activeTab === 'dataset' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" />
                Medical CT-Scan Diagnostic Probability Calibration Dataset
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluation of model certainty vs truth in oncology screening, measuring overconfidence and calibration gaps.
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
                placeholder="Search sample ID or class..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={binFilter}
                onChange={(e) => {
                  setBinFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Confidence Intervals</option>
                <option value="0.9 - 1.0">Bin [0.9 - 1.0]</option>
                <option value="0.8 - 0.9">Bin [0.8 - 0.9]</option>
                <option value="0.7 - 0.8">Bin [0.7 - 0.8]</option>
                <option value="0.6 - 0.7">Bin [0.6 - 0.7]</option>
                <option value="0.5 - 0.6">Bin [0.5 - 0.6]</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={correctFilter}
                onChange={(e) => {
                  setCorrectFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Predictions</option>
                <option value="correct">Accurate Diagnoses Only</option>
                <option value="incorrect">Overconfident Errors Only</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Entry ID</th>
                  <th className="py-2.5 px-3">Scan Ref</th>
                  <th className="py-2.5 px-3">Predicted Class</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3">Ground Truth</th>
                  <th className="py-2.5 px-3">Confidence Bin</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                {paginatedDataset.map((sample) => (
                  <tr key={sample.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                      {sample.id}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-200">
                      {sample.sampleId}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-200">
                      {sample.predictedClass}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">
                      {(sample.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {sample.groundTruth}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {sample.confidenceBin}
                    </td>
                    <td className="py-2.5 px-3">
                      {sample.isCorrect ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Accurate
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Overconfident Miss
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            <span>
              Showing {paginatedDataset.length} of {filteredDataset.length} scans
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
