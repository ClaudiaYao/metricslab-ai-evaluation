import React, { useState, useMemo } from 'react';
import { MetricDefinition, LLMEvalSample } from '../../types/metrics';
import { llmMetricsList, mockLLMEvals } from '../../data/mockData';
import { computeBleuScore, computeRougeScores, tokenize } from '../../utils/calculations';
import { MetricCard } from '../MetricCard';
import { ActiveTab } from '../Header';
import { Sparkles, Terminal, FileText, Search, RotateCcw } from 'lucide-react';

interface LLMViewProps {
  activeTab: ActiveTab;
  searchQuery: string;
  onInspectMetric: (metric: MetricDefinition) => void;
}

const samplePresets = [
  {
    name: 'Neural Network Backprop (High Match)',
    ref: 'Backpropagation computes the gradient of the loss function with respect to weights using the calculus chain rule.',
    cand: 'The primary purpose of backpropagation is computing loss gradients with respect to network weights via the calculus chain rule.',
  },
  {
    name: 'Overfitting Regularization (Moderate Match)',
    ref: 'Overfitting occurs when a model learns noise in training data instead of generalizable patterns.',
    cand: 'High model capacity causes overfitting by memorizing specific training quirks rather than learning true general patterns.',
  },
  {
    name: 'Decision Trees (Low Match / Hallucination)',
    ref: 'Decision trees partition feature space using orthogonal axis-aligned splits to model non-linear boundaries.',
    cand: 'Decision trees cannot model non-linear boundaries because every split is a straight single line requiring support vectors.',
  },
];

export const LLMView: React.FC<LLMViewProps> = ({
  activeTab,
  searchQuery,
  onInspectMetric,
}) => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [refText, setRefText] = useState<string>(samplePresets[0].ref);
  const [candText, setCandText] = useState<string>(samplePresets[0].cand);

  // Table filters for the Mock Dataset Table tab
  const [tableSearch, setTableSearch] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<'all' | 'pass' | 'fail'>('all');
  const [faithfulnessFilter, setFaithfulnessFilter] = useState<'all' | 'grounded' | 'hallucinated'>('all');
  const [bleuThresholdFilter, setBleuThresholdFilter] = useState<'all' | 'high' | 'low'>('all');

  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIdx(idx);
    setRefText(samplePresets[idx].ref);
    setCandText(samplePresets[idx].cand);
  };

  // Live BLEU calculation
  const bleuResult = useMemo(() => {
    return computeBleuScore(refText, candText);
  }, [refText, candText]);

  // Live ROUGE calculation
  const rougeResult = useMemo(() => {
    return computeRougeScores(refText, candText);
  }, [refText, candText]);

  const candTokens = useMemo(() => tokenize(candText), [candText]);
  const refTokensSet = useMemo(() => new Set(tokenize(refText)), [refText]);

  // Filtered metrics for search
  const filteredMetrics = useMemo(() => {
    if (!searchQuery) return llmMetricsList;
    const q = searchQuery.toLowerCase();
    return llmMetricsList.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.shortName.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Multi-condition table filtering
  const filteredTableSamples = useMemo(() => {
    return mockLLMEvals.filter((sample) => {
      // 1. Verdict
      const matchesVerdict =
        verdictFilter === 'all' ||
        (verdictFilter === 'pass' && sample.judgeVerdict === 'Pass') ||
        (verdictFilter === 'fail' && sample.judgeVerdict === 'Fail');

      // 2. Faithfulness
      const matchesFaithfulness =
        faithfulnessFilter === 'all' ||
        (faithfulnessFilter === 'grounded' && sample.faithfulnessScore >= 0.9) ||
        (faithfulnessFilter === 'hallucinated' && sample.faithfulnessScore < 0.9);

      // 3. BLEU
      const matchesBleu =
        bleuThresholdFilter === 'all' ||
        (bleuThresholdFilter === 'high' && sample.bleu4 >= 0.4) ||
        (bleuThresholdFilter === 'low' && sample.bleu4 < 0.4);

      // 4. Search
      const matchesSearch =
        tableSearch === '' ||
        sample.prompt.toLowerCase().includes(tableSearch.toLowerCase()) ||
        sample.modelOutput.toLowerCase().includes(tableSearch.toLowerCase());

      return matchesVerdict && matchesFaithfulness && matchesBleu && matchesSearch;
    });
  }, [verdictFilter, faithfulnessFilter, bleuThresholdFilter, tableSearch]);

  const handleResetFilters = () => {
    setTableSearch('');
    setVerdictFilter('all');
    setFaithfulnessFilter('all');
    setBleuThresholdFilter('all');
  };

  const metricOverrides: Record<string, string> = {
    bleu: (bleuResult.bleu4 * 100).toFixed(1),
    rouge_l: rougeResult.rougeL.f1.toFixed(3),
  };

  return (
    <div className="space-y-6">
      {/* 1. MERGED METRICS & INTERACTIVE PLAYGROUND TAB */}
      {activeTab === 'playground' && (
        <div className="space-y-6">
          {/* Interactive BLEU & ROUGE Token Diff Playground */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-semibold text-slate-200">
                    Live Interactive Token Overlap, BLEU &amp; ROUGE-L Playground
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Edit the text or pick a preset to watch tokenization, n-gram precision, LCS, and brevity penalty calculate in real time.
                </p>
              </div>

              {/* Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-500 mr-1">Presets:</span>
                {samplePresets.map((preset, idx) => (
                  <button
                    key={preset.name}
                    onClick={() => handleSelectPreset(idx)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                      selectedPresetIdx === idx
                        ? 'bg-rose-950/70 border border-rose-800 text-rose-300'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {preset.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Input Areas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Reference Ground Truth */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    Reference Ground Truth (Target Text)
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {tokenize(refText).length} tokens
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={refText}
                  onChange={(e) => setRefText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60 leading-relaxed font-sans"
                  placeholder="Enter reference ground truth answer..."
                />
              </div>

              {/* Candidate Output */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-rose-400" />
                    Candidate Generation (Model Output)
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {tokenize(candText).length} tokens
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={candText}
                  onChange={(e) => setCandText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500/60 leading-relaxed font-sans"
                  placeholder="Enter model generation to evaluate..."
                />
              </div>
            </div>

            {/* Visual Token Diff Highlighter */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 mb-4">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Visual Token Alignment (Green = Reference Word Matched):</span>
                <span className="font-mono text-emerald-400">
                  Matched Tokens: {bleuResult.unigramMatches.length} / {candTokens.length}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                {candTokens.map((t, idx) => {
                  const isMatched = refTokensSet.has(t);
                  return (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 rounded border ${
                        isMatched
                          ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60 font-semibold'
                          : 'bg-slate-800/40 text-slate-400 border-slate-800'
                      }`}
                    >
                      {t}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Calculation KPI Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg">
                <span className="text-slate-400 text-[11px] block">BLEU-4 Score:</span>
                <span className="text-xl font-bold text-rose-400 tabular-nums">
                  {(bleuResult.bleu4 * 100).toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Scale [0-100]</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg">
                <span className="text-slate-400 text-[11px] block">ROUGE-L (LCS F1):</span>
                <span className="text-xl font-bold text-emerald-400 tabular-nums">
                  {rougeResult.rougeL.f1.toFixed(3)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  LCS: {rougeResult.lcsLength} words
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg">
                <span className="text-slate-400 text-[11px] block">Brevity Penalty (BP):</span>
                <span className="text-xl font-bold text-sky-400 tabular-nums">
                  {bleuResult.brevityPenalty.toFixed(3)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {bleuResult.candLen >= bleuResult.refLen
                    ? 'No penalty (c >= r)'
                    : 'Penalized (c < r)'}
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg">
                <span className="text-slate-400 text-[11px] block">1-Gram Precision:</span>
                <span className="text-xl font-bold text-amber-400 tabular-nums">
                  {(bleuResult.bleu1 * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Unigram coverage</span>
              </div>
            </div>
          </div>

          {/* Perplexity & RAG Triad Visualizers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Perplexity Probability Distribution Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-200">
                    Perplexity (PPL) Intuition: Token Likelihood Profile
                  </span>
                  <span className="text-xs font-mono font-bold text-rose-400">
                    PPL = exp(CrossEntropy)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Token conditional probability curve. Low perplexity maintains high probabilities; high perplexity shows unexpected token spikes.
                </p>

                <div className="relative w-full aspect-square max-h-56 bg-slate-950 rounded-lg border border-slate-800/80 p-2 flex items-center justify-center">
                  <svg viewBox="0 0 240 180" className="w-full h-full overflow-visible">
                    <line x1="30" y1="20" x2="220" y2="20" stroke="#1e293b" strokeDasharray="2,2" />
                    <line x1="30" y1="80" x2="220" y2="80" stroke="#1e293b" strokeDasharray="2,2" />
                    <line x1="30" y1="150" x2="220" y2="150" stroke="#334155" />
                    <line x1="30" y1="20" x2="30" y2="150" stroke="#334155" />

                    {/* Coherent Curve */}
                    <path
                      d="M 30 50 Q 70 40 110 55 T 160 45 T 220 50"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                    />

                    {/* Hallucinated Curve */}
                    <path
                      d="M 30 70 Q 70 60 90 135 T 140 70 T 170 145 T 220 80"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="2"
                      strokeDasharray="4,2"
                    />
                  </svg>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-around text-[11px] font-mono">
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-emerald-400 inline-block"></span>
                  Fluent Generation (PPL: 8.4)
                </span>
                <span className="text-rose-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-rose-400 inline-block border-b border-dashed"></span>
                  Hallucinated / Surprising (PPL: 28.5)
                </span>
              </div>
            </div>

            {/* RAG Triad Breakdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200 block mb-1">
                  The RAG Triad &amp; LLM-as-a-Judge Evaluation Framework
                </span>
                <p className="text-[11px] text-slate-400 mb-3">
                  Modern evaluation frameworks benchmark generative models across 3 core pillars:
                </p>

                <div className="space-y-3 text-xs">
                  {/* 1. Faithfulness */}
                  <div>
                    <div className="flex justify-between font-mono mb-1">
                      <span className="text-slate-300 font-medium">
                        1. Faithfulness (Grounded in Context):
                      </span>
                      <span className="text-emerald-400 font-bold">92.0%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: '92%' }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Supported claims / Total answer claims (detects hallucinations)
                    </span>
                  </div>

                  {/* 2. Answer Relevance */}
                  <div>
                    <div className="flex justify-between font-mono mb-1">
                      <span className="text-slate-300 font-medium">2. Answer Relevance:</span>
                      <span className="text-sky-400 font-bold">89.0%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-sky-500 h-full rounded-full"
                        style={{ width: '89%' }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Penalizes incomplete answers or evasive, off-topic fluff
                    </span>
                  </div>

                  {/* 3. Context Precision */}
                  <div>
                    <div className="flex justify-between font-mono mb-1">
                      <span className="text-slate-300 font-medium">3. Context Precision:</span>
                      <span className="text-indigo-400 font-bold">87.5%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-indigo-500 h-full rounded-full"
                        style={{ width: '87.5%' }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Measures whether relevant retrieved chunks appear at the top
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
                Evaluator: G-Eval with Chain-of-Thought prompting
              </div>
            </div>
          </div>

          {/* Evaluated Metric Cards & Formula Methods */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                LLM &amp; Generative Metrics &amp; Formulas
              </h3>
              <span className="text-[11px] text-slate-400">
                Click &quot;Method&quot; on any card to view detailed formula breakdown, worked examples, and guidance
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
        </div>
      )}

      {/* 2. MOCK DATASET TABLE TAB (Dedicated Table with Multi-Condition Filters) */}
      {activeTab === 'dataset' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm space-y-4">
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-slate-200">
                  LLM Benchmark Evaluation Set (5 Deep Learning Prompts)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Filter by judge verdict, factual faithfulness, or lexical match score without duplicates.
                </p>
              </div>

              <div className="flex items-center gap-2.5 text-xs">
                <span className="font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded">
                  Showing {filteredTableSamples.length} of {mockLLMEvals.length} samples
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
                  placeholder="Filter by prompt or response..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60"
                />
              </div>

              {/* Verdict Filter */}
              <select
                value={verdictFilter}
                onChange={(e) => setVerdictFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Judge Verdicts</option>
                <option value="pass">Pass Only</option>
                <option value="fail">Fail Only (Hallucinations)</option>
              </select>

              {/* Faithfulness Filter */}
              <select
                value={faithfulnessFilter}
                onChange={(e) => setFaithfulnessFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Faithfulness Levels</option>
                <option value="grounded">Grounded (Faithfulness ≥ 90%)</option>
                <option value="hallucinated">Hallucinated (Faithfulness &lt; 90%)</option>
              </select>

              {/* BLEU Threshold Filter */}
              <select
                value={bleuThresholdFilter}
                onChange={(e) => setBleuThresholdFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All BLEU Ranges</option>
                <option value="high">High Match (BLEU-4 ≥ 40)</option>
                <option value="low">Low Match (BLEU-4 &lt; 40)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] text-slate-400">
                  <th className="py-2.5 px-4 font-semibold">Prompt / Question</th>
                  <th className="py-2.5 px-4 font-semibold">Candidate Generation</th>
                  <th className="py-2.5 px-4 font-semibold text-right">BLEU-4</th>
                  <th className="py-2.5 px-4 font-semibold text-right">ROUGE-L</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Perplexity</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Faithfulness</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Judge Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredTableSamples.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                      No matching samples found. Try adjusting or resetting your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTableSamples.map((sample) => (
                    <tr
                      key={sample.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        sample.judgeVerdict === 'Fail' ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-200 max-w-xs">
                        {sample.prompt}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-400 max-w-sm line-clamp-2">
                        {sample.modelOutput}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-rose-300">
                        {(sample.bleu4 * 100).toFixed(1)}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-emerald-300">
                        {sample.rougeL.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-slate-300">
                        {sample.perplexity.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-indigo-300">
                        {(sample.faithfulnessScore * 100).toFixed(0)}%
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            sample.judgeVerdict === 'Pass'
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                              : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                          }`}
                        >
                          {sample.judgeVerdict}
                        </span>
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
