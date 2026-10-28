import React, { useState, useMemo } from 'react';
import { ActiveTab } from '../Header';
import { MetricDefinition } from '../../types/metrics';
import { MetricCard } from '../MetricCard';
import { LiveMetricLabel } from '../LiveMetricLabel';
import { generativeVisionMetricsList, mockGenerativeVisionDataset } from '../../data/generativeVisionMockData';
import {
  Image,
  Sparkles,
  Search,
  Download,
  Filter,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from 'lucide-react';

interface GenerativeVisionViewProps {
  activeTab: ActiveTab;
  searchQuery: string;
  onInspectMetric: (metric: MetricDefinition) => void;
}

export const GenerativeVisionView: React.FC<GenerativeVisionViewProps> = ({
  activeTab,
  searchQuery,
  onInspectMetric,
}) => {
  // Playground interactive state
  const [samplingSteps, setSamplingSteps] = useState<number>(30); // 5 to 50
  const [cfgScale, setCfgScale] = useState<number>(7.5); // 1.0 to 15.0

  // Dataset Table state
  const [tableSearch, setTableSearch] = useState('');
  const [modelFilter, setModelFilter] = useState('all');
  const [qualityFilter, setQualityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Dynamic simulation based on sampling steps & CFG scale
  const simulation = useMemo(() => {
    // As steps increase, FID drops (improves), LPIPS drops, SSIM rises
    const baseFid = 35.0;
    const fid = Math.max(8.5, baseFid - (samplingSteps / 50) * 23.0 + Math.abs(cfgScale - 7.0) * 0.8);
    
    // CLIPScore increases with CFG up to ~8.0, then plateaus / over-saturates
    const clipScore = Math.min(38.0, 20.0 + (samplingSteps / 50) * 8.0 + Math.min(cfgScale, 9.0) * 1.2 - Math.max(0, cfgScale - 10.0) * 0.9);
    
    // LPIPS distance decreases with steps
    const lpips = Math.max(0.09, 0.32 - (samplingSteps / 50) * 0.18);
    const ssim = Math.min(0.96, 0.72 + (samplingSteps / 50) * 0.20);

    return { fid, clipScore, lpips, ssim };
  }, [samplingSteps, cfgScale]);

  // Filtered dataset table
  const filteredDataset = useMemo(() => {
    return mockGenerativeVisionDataset.filter((sample) => {
      const matchesSearch =
        tableSearch === '' ||
        sample.id.toLowerCase().includes(tableSearch.toLowerCase()) ||
        sample.prompt.toLowerCase().includes(tableSearch.toLowerCase()) ||
        sample.modelName.toLowerCase().includes(tableSearch.toLowerCase());

      const matchesModel =
        modelFilter === 'all' || sample.modelName.toLowerCase().includes(modelFilter.toLowerCase());

      const matchesQuality =
        qualityFilter === 'all' || sample.qualityRating.toLowerCase() === qualityFilter.toLowerCase();

      return matchesSearch && matchesModel && matchesQuality;
    });
  }, [tableSearch, modelFilter, qualityFilter]);

  const totalPages = Math.ceil(filteredDataset.length / pageSize) || 1;
  const paginatedDataset = filteredDataset.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const exportCSV = () => {
    const headers = ['ID', 'Prompt', 'Model', 'Steps', 'FID', 'CLIPScore', 'LPIPS', 'SSIM', 'Rating'];
    const rows = filteredDataset.map((s) => [
      s.id,
      `"${s.prompt}"`,
      `"${s.modelName}"`,
      s.samplingSteps,
      s.fidScore,
      s.clipScore,
      s.lpipsDistance,
      s.ssim,
      s.qualityRating,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'generative_vision_dataset.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const liveIds = ['fid', 'clip-score', 'lpips', 'ssim'];
  const metricById = (id: string) => generativeVisionMetricsList.find((m) => m.id === id);
  const referenceMetrics = generativeVisionMetricsList.filter(
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
                  <Image className="w-3.5 h-3.5 text-indigo-400" />
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

          {/* Interactive Diffusion Sampling Simulator */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  Interactive Diffusion Sampling &amp; Inception Distribution Simulator
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust denoising steps and Classifier-Free Guidance (CFG) scale to observe how FID (distribution divergence) and CLIPScore (prompt alignment) co-evolve.
                </p>
              </div>
            </div>

            {/* Playground Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Denoising Sampling Steps:</span>
                  <span className="font-mono text-indigo-400 font-bold">{samplingSteps} Steps</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={samplingSteps}
                  onChange={(e) => setSamplingSteps(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block">
                  More steps refine latent high-frequency details, driving down FID and LPIPS error.
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">CFG Scale (Guidance Weight):</span>
                  <span className="font-mono text-indigo-400 font-bold">{cfgScale.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="15.0"
                  step="0.5"
                  value={cfgScale}
                  onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block">
                  Balances prompt fidelity (CLIP) against natural image manifold diversity (FID).
                </span>
              </div>
            </div>

            {/* Dynamic Metric Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label="Dynamic FID" metric={metricById('fid')} onInspect={onInspectMetric} />
                <span className={`text-xl font-bold font-mono ${simulation.fid < 15 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {simulation.fid.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Lower is better • Inception-v3 distance
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label="Dynamic CLIPScore" metric={metricById('clip-score')} onInspect={onInspectMetric} />
                <span className="text-xl font-bold font-mono text-indigo-400">
                  {simulation.clipScore.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Cosine prompt fidelity
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label="Perceptual LPIPS" metric={metricById('lpips')} onInspect={onInspectMetric} />
                <span className="text-xl font-bold font-mono text-cyan-400">
                  {simulation.lpips.toFixed(3)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  VGG deep feature distance
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label="Structural SSIM" metric={metricById('ssim')} onInspect={onInspectMetric} />
                <span className="text-xl font-bold font-mono text-purple-400">
                  {(simulation.ssim * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Luminance/contrast coherence
                </span>
              </div>
            </div>

            {/* Split Visualizer: Inception Distribution Overlap Curve */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium text-slate-300">
                  Latent Feature Distribution: Real Photography vs. Synthetic Diffusion
                </span>
                <div className="flex items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-emerald-400 rounded-full inline-block" />
                    <span className="text-slate-300">Real Images p_r(x)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-indigo-400 rounded-full inline-block" />
                    <span className="text-slate-300">Generated Images p_g(x)</span>
                  </div>
                </div>
              </div>

              {/* Responsive SVG Gaussian Distribution Curves */}
              <div className="w-full">
                <svg viewBox="0 0 600 160" className="w-full h-40 select-none">
                  {/* Grid Lines */}
                  <line x1="40" y1="130" x2="580" y2="130" stroke="#334155" strokeWidth="1" />
                  
                  {/* Real Image Distribution (Fixed Gaussian at mean 280, std 55) */}
                  <path
                    d="M 60 130 Q 200 130 250 80 T 280 20 T 310 80 T 500 130"
                    fill="rgba(16, 185, 129, 0.08)"
                    stroke="#10b981"
                    strokeWidth="2.5"
                  />

                  {/* Generated Distribution: shifts closer to 280 as steps increase */}
                  {(() => {
                    const shift = (50 - samplingSteps) * 2.2;
                    const peakX = 280 + shift;
                    return (
                      <path
                        d={`M 60 130 Q ${peakX - 80} 130 ${peakX - 30} 85 T ${peakX} ${20 + (50 - samplingSteps) * 0.8} T ${peakX + 30} 85 T 560 130`}
                        fill="rgba(99, 102, 241, 0.12)"
                        stroke="#818cf8"
                        strokeWidth="2"
                        strokeDasharray={samplingSteps < 20 ? '4 4' : 'none'}
                      />
                    );
                  })()}

                  <text x="280" y="146" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">
                    Inception Latent Space Axis (2048-dim PCA Projection)
                  </text>
                </svg>
              </div>

              <div className="p-3 bg-slate-900/60 rounded border border-slate-800/80 text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-200">The Fréchet Distance Intuition:</strong> FID treats deep feature embeddings as multi-dimensional Gaussians N(μ, Σ). When the synthetic blue bell curve aligns with the real green bell curve, the Wasserstein-2 / Fréchet distance drops toward 0, indicating photorealistic feature statistics.
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
                <Image className="w-4 h-4 text-indigo-400" />
                Text-to-Image Generative Evaluation Benchmark
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cross-architecture evaluation comparing Flux, SDXL, Midjourney, and DALL-E across prompt adherence and perceptual fidelity.
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
                placeholder="Search prompt, model, or ID..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={modelFilter}
                onChange={(e) => {
                  setModelFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Models</option>
                <option value="Flux">Flux.1 Variants</option>
                <option value="SDXL">SDXL Models</option>
                <option value="Midjourney">Midjourney v6</option>
                <option value="DALL-E">DALL-E 3</option>
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
                <option value="all">All Quality Tiers</option>
                <option value="exceptional">Exceptional Quality</option>
                <option value="good">Good / Production Tier</option>
                <option value="artifacted">Artifacted / Degraded</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Sample ID</th>
                  <th className="py-2.5 px-3">Model</th>
                  <th className="py-2.5 px-3">Synthesis Prompt</th>
                  <th className="py-2.5 px-3">Steps</th>
                  <th className="py-2.5 px-3">FID</th>
                  <th className="py-2.5 px-3">CLIPScore</th>
                  <th className="py-2.5 px-3">LPIPS</th>
                  <th className="py-2.5 px-3">Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                {paginatedDataset.map((sample) => (
                  <tr key={sample.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                      {sample.id}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">
                      {sample.modelName}
                    </td>
                    <td className="py-2.5 px-3 max-w-[280px] truncate text-slate-300" title={sample.prompt}>
                      {sample.prompt}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {sample.samplingSteps}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">
                      {sample.fidScore.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400">
                      {sample.clipScore.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-cyan-400">
                      {sample.lpipsDistance.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3">
                      {sample.qualityRating === 'Exceptional' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Exceptional
                        </span>
                      )}
                      {sample.qualityRating === 'Good' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Good
                        </span>
                      )}
                      {sample.qualityRating === 'Artifacted' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Artifacted
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
              Showing {paginatedDataset.length} of {filteredDataset.length} prompts
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
