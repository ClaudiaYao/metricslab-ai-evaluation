import React, { useState, useMemo } from 'react';
import { ActiveTab } from '../Header';
import { MetricDefinition } from '../../types/metrics';
import { MetricCard } from '../MetricCard';
import { LiveMetricLabel } from '../LiveMetricLabel';
import { inferenceEfficiencyMetricsList, mockInferenceEfficiencyDataset } from '../../data/inferenceEfficiencyMockData';
import {
  Cpu,
  Search,
  Download,
  Filter,
  Sliders,
  AlertTriangle,
  Zap,
  Layers,
} from 'lucide-react';

interface InferenceEfficiencyViewProps {
  activeTab: ActiveTab;
  searchQuery: string;
  onInspectMetric: (metric: MetricDefinition) => void;
}

export const InferenceEfficiencyView: React.FC<InferenceEfficiencyViewProps> = ({
  activeTab,
  searchQuery,
  onInspectMetric,
}) => {
  // Playground state
  const [concurrency, setConcurrency] = useState<number>(32); // 1 to 128 streams
  const [contextLength, setContextLength] = useState<number>(4096); // 1024 to 32768 tokens
  const [gpuType, setGpuType] = useState<'h100' | 'a100' | 'l40s'>('h100');

  // Table filters
  const [tableSearch, setTableSearch] = useState('');
  const [hardwareFilter, setHardwareFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const gpuProfiles = {
    h100: { name: '1x H100 80GB SXM5', memoryGb: 80, memoryBwGbSec: 3350, baseTokSec: 2200 },
    a100: { name: '2x A100 80GB PCIe', memoryGb: 160, memoryBwGbSec: 2000, baseTokSec: 1200 },
    l40s: { name: '4x L40S 48GB', memoryGb: 192, memoryBwGbSec: 864, baseTokSec: 950 },
  };

  // Dynamic simulation of KV cache and throughput saturation
  const simulation = useMemo(() => {
    const gpu = gpuProfiles[gpuType];
    const weightGb = 38.0; // 70B AWQ 4-bit weights

    const bytesPerToken = 2 * 32 * 8 * 128 * 2; // 131,072 bytes per token
    const totalKvBytes = bytesPerToken * contextLength * concurrency;
    const kvMemoryGb = totalKvBytes / (1024 * 1024 * 1024);
    const totalMemoryUsedGb = weightGb + kvMemoryGb;
    const isOOM = totalMemoryUsedGb > gpu.memoryGb;

    const ttft = Math.round(35 + (contextLength / 1024) * 8 + concurrency * 0.4);
    const baseTpot = 10.5 * (2000 / gpu.memoryBwGbSec);
    const tpot = Math.round((baseTpot + Math.log2(concurrency) * 1.8) * 10) / 10;
    const maxThroughput = gpu.baseTokSec * Math.min(1.2, 0.4 + Math.log2(concurrency) * 0.15);
    const throughput = Math.round(maxThroughput);
    const p99 = Math.round(ttft * 1.5 + tpot * 8);

    return { gpu, weightGb, kvMemoryGb, totalMemoryUsedGb, isOOM, ttft, tpot, throughput, p99 };
  }, [concurrency, contextLength, gpuType]);

  // Filtered dataset table
  const filteredDataset = useMemo(() => {
    return mockInferenceEfficiencyDataset.filter((sample) => {
      const matchesSearch =
        tableSearch === '' ||
        sample.id.toLowerCase().includes(tableSearch.toLowerCase()) ||
        sample.benchmarkRun.toLowerCase().includes(tableSearch.toLowerCase()) ||
        sample.modelArchitecture.toLowerCase().includes(tableSearch.toLowerCase());

      const matchesHw =
        hardwareFilter === 'all' || sample.hardware.toLowerCase().includes(hardwareFilter.toLowerCase());

      return matchesSearch && matchesHw;
    });
  }, [tableSearch, hardwareFilter]);

  const totalPages = Math.ceil(filteredDataset.length / pageSize) || 1;
  const paginatedDataset = filteredDataset.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const exportCSV = () => {
    const headers = ['ID', 'Benchmark Run', 'Hardware', 'Model', 'Batch', 'TTFT (ms)', 'TPOT (ms)', 'Throughput (tok/s)', 'VRAM (GB)', 'P99 (ms)'];
    const rows = filteredDataset.map((s) => [
      s.id,
      `"${s.benchmarkRun}"`,
      `"${s.hardware}"`,
      `"${s.modelArchitecture}"`,
      s.concurrencyBatch,
      s.ttftMs,
      s.tpotMs,
      s.throughputTokensSec,
      s.vramUsageGb,
      s.p99LatencyMs,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'inference_efficiency_benchmark.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const liveIds = ['ttft', 'tpot', 'throughput', 'p99-latency', 'kv-cache-mem'];
  const metricById = (id: string) => inferenceEfficiencyMetricsList.find((m) => m.id === id);
  const referenceMetrics = inferenceEfficiencyMetricsList.filter(
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
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
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

          {/* Interactive GPU & KV Cache Simulator */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  GPU Cluster Sizing &amp; KV Cache Memory Simulator
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Model: Llama-3-70B (AWQ 4-bit, 38GB weights). Adjust concurrent batch requests and context window size to test VRAM memory saturation and latency degradation.
                </p>
              </div>

              {/* Hardware Selector */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
                <button
                  onClick={() => setGpuType('h100')}
                  className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                    gpuType === 'h100' ? 'bg-indigo-600/30 text-indigo-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  H100 80GB
                </button>
                <button
                  onClick={() => setGpuType('a100')}
                  className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                    gpuType === 'a100' ? 'bg-indigo-600/30 text-indigo-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  2x A100 160GB
                </button>
                <button
                  onClick={() => setGpuType('l40s')}
                  className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                    gpuType === 'l40s' ? 'bg-indigo-600/30 text-indigo-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  4x L40S 192GB
                </button>
              </div>
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Concurrent User Streams:</span>
                  <span className="font-mono text-indigo-400 font-bold">{concurrency} Sessions</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="128"
                  step="1"
                  value={concurrency}
                  onChange={(e) => setConcurrency(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Sequence Context Window:</span>
                  <span className="font-mono text-indigo-400 font-bold">{(contextLength / 1024).toFixed(0)}k Tokens ({contextLength})</span>
                </div>
                <input
                  type="range"
                  min="1024"
                  max="16384"
                  step="1024"
                  value={contextLength}
                  onChange={(e) => setContextLength(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Dynamic Metric Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label="TTFT (Time to 1st Token)" metric={metricById('ttft')} onInspect={onInspectMetric} />
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {simulation.ttft} ms
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Prefill compute phase
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label="TPOT (Per Output Token)" metric={metricById('tpot')} onInspect={onInspectMetric} />
                <span className="text-xl font-bold font-mono text-indigo-400">
                  {simulation.tpot.toFixed(1)} ms/t
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  ~{(1000 / simulation.tpot).toFixed(0)} tok/s per stream
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label="Server Throughput" metric={metricById('throughput')} onInspect={onInspectMetric} />
                <span className="text-xl font-bold font-mono text-cyan-400">
                  {simulation.throughput.toLocaleString()} tok/s
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Aggregate parallel output
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label="P99 Tail Latency" metric={metricById('p99-latency')} onInspect={onInspectMetric} />
                <span className="text-xl font-bold font-mono text-amber-400">
                  {simulation.p99} ms
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  99th percentile end-to-end
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label="KV Cache Allocated" metric={metricById('kv-cache-mem')} onInspect={onInspectMetric} />
                <span className={`text-xl font-bold font-mono ${simulation.isOOM ? 'text-rose-400' : 'text-purple-400'}`}>
                  {simulation.kvMemoryGb.toFixed(1)} GB
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Total VRAM: {simulation.totalMemoryUsedGb.toFixed(1)} / {simulation.gpu.memoryGb} GB
                </span>
              </div>
            </div>

            {/* VRAM Memory Allocation Bar */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium text-slate-300">
                  GPU High Bandwidth Memory (HBM) Allocation
                </span>
                <span className="font-mono text-slate-300">
                  {simulation.totalMemoryUsedGb.toFixed(1)} GB of {simulation.gpu.memoryGb} GB ({((simulation.totalMemoryUsedGb / simulation.gpu.memoryGb) * 100).toFixed(0)}%)
                </span>
              </div>

              <div className="w-full bg-slate-900 h-4 rounded-full overflow-hidden flex">
                <div
                  className="bg-indigo-600 h-full transition-all"
                  style={{ width: `${(simulation.weightGb / simulation.gpu.memoryGb) * 100}%` }}
                  title={`Model Weights: ${simulation.weightGb} GB`}
                />
                <div
                  className={`h-full transition-all ${simulation.isOOM ? 'bg-rose-500 animate-pulse' : 'bg-purple-500'}`}
                  style={{ width: `${Math.min(100 - (simulation.weightGb / simulation.gpu.memoryGb) * 100, (simulation.kvMemoryGb / simulation.gpu.memoryGb) * 100)}%` }}
                  title={`KV Cache: ${simulation.kvMemoryGb.toFixed(1)} GB`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-indigo-600 inline-block" />
                    <span>Model Weights ({simulation.weightGb} GB)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-purple-500 inline-block" />
                    <span>Dynamic KV Cache ({simulation.kvMemoryGb.toFixed(1)} GB)</span>
                  </span>
                </div>
                {simulation.isOOM ? (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Out of Memory (OOM) Crash Risk!
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium">
                    ✓ Safe Headroom ({(simulation.gpu.memoryGb - simulation.totalMemoryUsedGb).toFixed(1)} GB free)
                  </span>
                )}
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
                <Cpu className="w-4 h-4 text-indigo-400" />
                Inference Engine Benchmark &amp; Serving Telemetry
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Stress-test benchmark comparing vLLM, TensorRT-LLM, SGLang, and TGI across hardware tiers and batch sizes.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => {
                  setTableSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search engine, model, or hardware..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={hardwareFilter}
                onChange={(e) => {
                  setHardwareFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Hardware Environments</option>
                <option value="H100">NVIDIA H100 SXM5</option>
                <option value="A100">NVIDIA A100 PCIe</option>
                <option value="L40S">NVIDIA L40S</option>
                <option value="Apple">Apple M3 Silicon</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Run ID</th>
                  <th className="py-2.5 px-3">Serving Engine</th>
                  <th className="py-2.5 px-3">Hardware Tier</th>
                  <th className="py-2.5 px-3">Model</th>
                  <th className="py-2.5 px-3">Batch</th>
                  <th className="py-2.5 px-3">TTFT</th>
                  <th className="py-2.5 px-3">TPOT</th>
                  <th className="py-2.5 px-3">Throughput</th>
                  <th className="py-2.5 px-3">P99</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                {paginatedDataset.map((sample) => (
                  <tr key={sample.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                      {sample.id}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">
                      {sample.benchmarkRun}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300 text-[11px]">
                      {sample.hardware}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-indigo-400 text-[11px]">
                      {sample.modelArchitecture}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {sample.concurrencyBatch}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400">
                      {sample.ttftMs.toFixed(1)} ms
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-200">
                      {sample.tpotMs.toFixed(1)} ms
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">
                      {sample.throughputTokensSec.toLocaleString()} tok/s
                    </td>
                    <td className="py-2.5 px-3 font-mono text-amber-400">
                      {sample.p99LatencyMs.toFixed(0)} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            <span>
              Showing {paginatedDataset.length} of {filteredDataset.length} runs
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
