import React, { useState, useMemo } from 'react';
import { ActiveTab } from '../Header';
import { MetricDefinition } from '../../types/metrics';
import { MetricCard } from '../MetricCard';
import { LiveMetricLabel } from '../LiveMetricLabel';
import { fairnessMetricsList, mockFairnessDataset } from '../../data/fairnessMockData';
import {
  Scale,
  Search,
  Download,
  Filter,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface FairnessViewProps {
  activeTab: ActiveTab;
  searchQuery: string;
  onInspectMetric: (metric: MetricDefinition) => void;
}

export const FairnessView: React.FC<FairnessViewProps> = ({
  activeTab,
  searchQuery,
  onInspectMetric,
}) => {
  // Playground state: Decision Thresholds per group
  const [thresholdProtected, setThresholdProtected] = useState<number>(640);
  const [thresholdPrivileged, setThresholdPrivileged] = useState<number>(650);

  // Table filters
  const [tableSearch, setTableSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [decisionFilter, setDecisionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // 100 simulated applicants per group with realistic credit score distributions
  const simulation = useMemo(() => {
    const totalGroupSize = 500;
    const rateProtected = 1 / (1 + Math.exp((thresholdProtected - 650) / 45));
    const ratePrivileged = 1 / (1 + Math.exp((thresholdPrivileged - 670) / 45));

    const approvedProtected = Math.round(rateProtected * totalGroupSize);
    const approvedPrivileged = Math.round(ratePrivileged * totalGroupSize);

    const selProtected = approvedProtected / totalGroupSize;
    const selPrivileged = approvedPrivileged / totalGroupSize;

    const dpd = Math.abs(selProtected - selPrivileged);
    const dir = selPrivileged > 0 ? selProtected / selPrivileged : 1.0;
    const eod = Math.max(0.015, dpd * 0.85);
    const eqOpp = Math.max(0.01, dpd * 0.65);
    const passesEEOC = dir >= 0.80 && dir <= 1.25;

    return { selProtected, selPrivileged, dpd, dir, eod, eqOpp, passesEEOC };
  }, [thresholdProtected, thresholdPrivileged]);

  // Filtered dataset table
  const filteredDataset = useMemo(() => {
    return mockFairnessDataset.filter((sample) => {
      const matchesSearch =
        tableSearch === '' ||
        sample.id.toLowerCase().includes(tableSearch.toLowerCase()) ||
        sample.applicantId.toLowerCase().includes(tableSearch.toLowerCase());

      const matchesGroup =
        groupFilter === 'all' || sample.protectedGroup.toLowerCase().includes(groupFilter.toLowerCase());

      const matchesDecision =
        decisionFilter === 'all' ||
        (decisionFilter === 'approved' && sample.approvalDecision) ||
        (decisionFilter === 'denied' && !sample.approvalDecision);

      return matchesSearch && matchesGroup && matchesDecision;
    });
  }, [tableSearch, groupFilter, decisionFilter]);

  const totalPages = Math.ceil(filteredDataset.length / pageSize) || 1;
  const paginatedDataset = filteredDataset.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const exportCSV = () => {
    const headers = ['ID', 'Applicant ID', 'Group', 'Credit Score', 'Tier', 'Approval', 'Repaid'];
    const rows = filteredDataset.map((s) => [
      s.id,
      s.applicantId,
      `"${s.protectedGroup}"`,
      s.creditScore,
      s.qualificationTier,
      s.approvalDecision ? 'Approved' : 'Denied',
      s.actualRepaid ? 'Yes' : 'No',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'fairness_evaluation_dataset.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const liveIds = ['demographic-parity', 'disparate-impact', 'equalized-odds', 'equal-opportunity'];
  const metricById = (id: string) => fairnessMetricsList.find((m) => m.id === id);
  const referenceMetrics = fairnessMetricsList.filter(
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
                  <Scale className="w-3.5 h-3.5 text-indigo-400" />
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

          {/* Interactive Fairness & Threshold Simulator */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  Underwriting Decision Threshold &amp; Adverse Impact Simulator
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust group cutoff thresholds to balance selection parity against adverse disparate impact (US EEOC Four-Fifths Rule).
                </p>
              </div>

              <button
                onClick={() => {
                  setThresholdProtected(645);
                  setThresholdPrivileged(665);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-slate-800 transition-colors cursor-pointer shrink-0"
              >
                Auto-Calibrate Parity
              </button>
            </div>

            {/* Threshold Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Protected Group A (A=0) Cutoff:</span>
                  <span className="font-mono text-cyan-400 font-bold">{thresholdProtected} Score</span>
                </div>
                <input
                  type="range"
                  min="580"
                  max="720"
                  step="5"
                  value={thresholdProtected}
                  onChange={(e) => setThresholdProtected(parseInt(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block">
                  Selection rate: {(simulation.selProtected * 100).toFixed(1)}% approved
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Privileged Group B (A=1) Cutoff:</span>
                  <span className="font-mono text-indigo-400 font-bold">{thresholdPrivileged} Score</span>
                </div>
                <input
                  type="range"
                  min="580"
                  max="720"
                  step="5"
                  value={thresholdPrivileged}
                  onChange={(e) => setThresholdPrivileged(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block">
                  Selection rate: {(simulation.selPrivileged * 100).toFixed(1)}% approved
                </span>
              </div>
            </div>

            {/* Live Fairness Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label="Demographic Parity (DPD)" metric={metricById('demographic-parity')} onInspect={onInspectMetric} />
                <span className={`text-xl font-bold font-mono ${simulation.dpd < 0.05 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {(simulation.dpd * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Absolute selection gap
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label="Disparate Impact Ratio" metric={metricById('disparate-impact')} onInspect={onInspectMetric} />
                <span className={`text-xl font-bold font-mono ${simulation.passesEEOC ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {simulation.dir.toFixed(3)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {simulation.passesEEOC ? '✓ Passes 80% Rule' : '✕ Adverse Impact Detected'}
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label="Equalized Odds (EOD)" metric={metricById('equalized-odds')} onInspect={onInspectMetric} />
                <span className="text-xl font-bold font-mono text-cyan-400">
                  {simulation.eod.toFixed(3)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Max TPR/FPR deviation
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label="Equal Opportunity" metric={metricById('equal-opportunity')} onInspect={onInspectMetric} />
                <span className="text-xl font-bold font-mono text-purple-400">
                  {simulation.eqOpp.toFixed(3)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Qualified TPR disparity
                </span>
              </div>
            </div>

            {/* Visualizer */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
              <span className="text-xs font-medium text-slate-300 block">
                Relative Approval Rates across Demographic Segments
              </span>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-cyan-400">Protected Group (A=0)</span>
                    <span className="text-slate-300">{(simulation.selProtected * 100).toFixed(1)}% Approved</span>
                  </div>
                  <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${simulation.selProtected * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-indigo-400">Privileged Group (A=1)</span>
                    <span className="text-slate-300">{(simulation.selPrivileged * 100).toFixed(1)}% Approved</span>
                  </div>
                  <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${simulation.selPrivileged * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-900/60 rounded border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong className="text-slate-200">The Impossibility Theorem of Fairness:</strong> Kleinberg et al. mathematically proved that a model cannot simultaneously satisfy <em>Demographic Parity</em>, <em>Equalized Odds</em>, and <em>Predictive Calibration</em> unless base qualification rates are identical or the model achieves 100% perfect accuracy. System designers must explicitly declare which trade-off aligns with legal mandates.
                </p>
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
                <Scale className="w-4 h-4 text-indigo-400" />
                Algorithmic Credit Underwriting &amp; Fairness Audit Dataset
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Applicant decision cohort evaluating demographic selection parity and loan repayment accuracy.
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
                placeholder="Search applicant ID..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={groupFilter}
                onChange={(e) => {
                  setGroupFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Demographic Groups</option>
                <option value="protected">Protected (A=0)</option>
                <option value="privileged">Privileged (A=1)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={decisionFilter}
                onChange={(e) => {
                  setDecisionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Underwriting Outcomes</option>
                <option value="approved">Approved Applications</option>
                <option value="denied">Denied Applications</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Entry ID</th>
                  <th className="py-2.5 px-3">Applicant</th>
                  <th className="py-2.5 px-3">Demographic Group</th>
                  <th className="py-2.5 px-3">Credit Score</th>
                  <th className="py-2.5 px-3">Qualification</th>
                  <th className="py-2.5 px-3">Decision</th>
                  <th className="py-2.5 px-3">Ground Truth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                {paginatedDataset.map((sample) => (
                  <tr key={sample.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                      {sample.id}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-200">
                      {sample.applicantId}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${sample.protectedGroup.includes('Protected') ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                        {sample.protectedGroup}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-200">
                      {sample.creditScore}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {sample.qualificationTier}
                    </td>
                    <td className="py-2.5 px-3">
                      {sample.approvalDecision ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Approved
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Denied
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {sample.actualRepaid ? 'Faithfully Repaid' : 'Defaulted'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            <span>
              Showing {paginatedDataset.length} of {filteredDataset.length} applicants
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
