import React, { useState, useMemo } from 'react';
import { ActiveTab } from '../Header';
import { MetricDefinition, RankingSample } from '../../types/metrics';
import { LiveMetricLabel } from '../LiveMetricLabel';
import { rankingMetricsList, mockRankingDataset } from '../../data/rankingMockData';
import {
  ListOrdered,
  Award,
  ArrowUpDown,
  Search,
  Download,
  Filter,
  CheckCircle,
  HelpCircle,
  TrendingDown,
  Sparkles,
} from 'lucide-react';

interface RankingViewProps {
  activeTab: ActiveTab;
  searchQuery: string;
  onInspectMetric: (metric: MetricDefinition) => void;
}

export const RankingView: React.FC<RankingViewProps> = ({
  activeTab,
  searchQuery,
  onInspectMetric,
}) => {
  // Playground state: 5 ranked items with interactive relevance grades
  const [cutoffK, setCutoffK] = useState<number>(5);
  const [items, setItems] = useState([
    { id: 1, title: 'Hybrid Search with Dense & BM25 Fusion', rel: 3, score: 0.98 },
    { id: 2, title: 'Vector Quantization with IVF-PQ in Milvus', rel: 2, score: 0.89 },
    { id: 3, title: 'Introduction to PostgreSQL B-Tree Indexes', rel: 0, score: 0.74 },
    { id: 4, title: 'Sparse Embeddings with SPLADE for Retrieval', rel: 2, score: 0.68 },
    { id: 5, title: 'Chunking Strategies for RAG Pipelines', rel: 1, score: 0.55 },
  ]);

  // Dataset Table state
  const [tableSearch, setTableSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [hitFilter, setHitFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Move item up/down
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;
    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;
    setItems(newItems);
  };

  const updateRel = (index: number, newRel: number) => {
    const newItems = [...items];
    newItems[index].rel = newRel as 0 | 1 | 2 | 3;
    setItems(newItems);
  };

  // Live DCG & IDCG calculation
  const rankingStats = useMemo(() => {
    const kSlice = items.slice(0, cutoffK);

    // Calculate DCG@k
    let dcg = 0;
    const dcgSteps = kSlice.map((item, idx) => {
      const rank = idx + 1;
      const gain = Math.pow(2, item.rel) - 1;
      const discount = Math.log2(rank + 1);
      const discountedGain = gain / discount;
      dcg += discountedGain;
      return { rank, item, gain, discount, discountedGain, cumulativeDcg: dcg };
    });

    // Calculate Ideal DCG@k (sorted descending by relevance)
    const idealItems = [...items].sort((a, b) => b.rel - a.rel).slice(0, cutoffK);
    let idcg = 0;
    const idcgSteps = idealItems.map((item, idx) => {
      const rank = idx + 1;
      const gain = Math.pow(2, item.rel) - 1;
      const discount = Math.log2(rank + 1);
      const discountedGain = gain / discount;
      idcg += discountedGain;
      return { rank, item, gain, discount, discountedGain, cumulativeIdcg: idcg };
    });

    const ndcg = idcg > 0 ? dcg / idcg : 1.0;

    // Reciprocal rank (first item with rel >= 2)
    const firstHitIndex = items.findIndex((it) => it.rel >= 2);
    const mrr = firstHitIndex >= 0 ? 1 / (firstHitIndex + 1) : 0;

    // Precision@K and HitRate@K
    const relevantCount = kSlice.filter((it) => it.rel >= 2).length;
    const precisionAtK = relevantCount / cutoffK;
    const hitRateAtK = relevantCount > 0 ? 1 : 0;

    // Average precision@K for this single query (relevant = rel >= 2)
    let hitsSoFar = 0;
    let apSum = 0;
    kSlice.forEach((it, idx) => {
      if (it.rel >= 2) {
        hitsSoFar += 1;
        apSum += hitsSoFar / (idx + 1);
      }
    });
    const apAtK = relevantCount > 0 ? apSum / relevantCount : 0;

    return { dcg, idcg, ndcg, mrr, precisionAtK, hitRateAtK, apAtK, dcgSteps, idcgSteps };
  }, [items, cutoffK]);

  // Filtered dataset table
  const filteredDataset = useMemo(() => {
    return mockRankingDataset.filter((sample) => {
      const matchesSearch =
        tableSearch === '' ||
        sample.query.toLowerCase().includes(tableSearch.toLowerCase()) ||
        sample.documentTitle.toLowerCase().includes(tableSearch.toLowerCase()) ||
        sample.docId.toLowerCase().includes(tableSearch.toLowerCase());

      const matchesGrade =
        gradeFilter === 'all' || sample.relevanceGrade.toString() === gradeFilter;

      const matchesHit =
        hitFilter === 'all' ||
        (hitFilter === 'hit' && sample.isHitAt3) ||
        (hitFilter === 'miss' && !sample.isHitAt3);

      return matchesSearch && matchesGrade && matchesHit;
    });
  }, [tableSearch, gradeFilter, hitFilter]);

  const totalPages = Math.ceil(filteredDataset.length / pageSize) || 1;
  const paginatedDataset = filteredDataset.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const exportCSV = () => {
    const headers = ['ID', 'Query', 'Doc ID', 'Document Title', 'Relevance Grade', 'Model Score', 'Rank Position', 'Reciprocal Rank'];
    const rows = filteredDataset.map((s) => [
      s.id,
      `"${s.query}"`,
      s.docId,
      `"${s.documentTitle}"`,
      s.relevanceGrade,
      s.modelScore,
      s.rankPosition,
      s.reciprocalRank.toFixed(3),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'ranking_evaluation_dataset.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const metricById = (id: string) => rankingMetricsList.find((m) => m.id === id);

  const gradeBadge = (grade: number) => {
    switch (grade) {
      case 3:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Grade 3 (High)</span>;
      case 2:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">Grade 2 (Relevant)</span>;
      case 1:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Grade 1 (Marginal)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Grade 0 (Irrelevant)</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* TAB 1: METRICS & PLAYGROUND */}
      {activeTab === 'playground' && (
        <>
          {/* Interactive Ranking & NDCG Playground */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-indigo-400" />
                  Interactive Search Ranking &amp; NDCG Simulator
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Re-order search results or change relevance grades (0 to 3) to witness how logarithmic discount penalizes lower ranks in real time.
                </p>
              </div>

              {/* Cutoff K Selector */}
              <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 shrink-0">
                <span className="text-xs text-slate-400">Evaluation Cutoff K:</span>
                <span className="text-xs font-bold text-indigo-400 font-mono">@{cutoffK}</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={cutoffK}
                  onChange={(e) => setCutoffK(parseInt(e.target.value))}
                  className="w-24 accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Dynamic Result Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label={`NDCG@${cutoffK}`} metric={metricById('ndcg')} onInspect={onInspectMetric} />
                <span className="text-xl font-bold font-mono text-indigo-400">
                  {rankingStats.ndcg.toFixed(3)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  DCG: {rankingStats.dcg.toFixed(2)} / IDCG: {rankingStats.idcg.toFixed(2)}
                </span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label="MRR (First Hit)" metric={metricById('mrr')} onInspect={onInspectMetric} />
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {rankingStats.mrr.toFixed(3)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  1st rel rank = {rankingStats.mrr > 0 ? (1 / rankingStats.mrr).toFixed(0) : 'None'}
                </span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label={`Precision@${cutoffK}`} metric={metricById('precision-at-5')} onInspect={onInspectMetric} />
                <span className="text-xl font-bold font-mono text-cyan-400">
                  {(rankingStats.precisionAtK * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {(rankingStats.precisionAtK * cutoffK).toFixed(0)} of {cutoffK} items rel ≥ 2
                </span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label={`Hit Rate@${cutoffK}`} metric={metricById('hit-rate-5')} onInspect={onInspectMetric} />
                <span className="text-xl font-bold font-mono text-purple-400">
                  {rankingStats.hitRateAtK === 1 ? '100%' : '0%'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  At least one relevant hit
                </span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label={`MAP@${cutoffK} (this query)`} metric={metricById('map')} onInspect={onInspectMetric} />
                <span className="text-xl font-bold font-mono text-amber-400">
                  {rankingStats.apAtK.toFixed(3)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Mean of precision at each hit
                </span>
              </div>
            </div>

            {/* Split: Interactive Re-order List + Step Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Ranked Documents (7 cols) */}
              <div className="lg:col-span-7 space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-slate-400 px-1 pb-1">
                  <span>Candidate Search Results (Query: "Vector DB hybrid search")</span>
                  <span className="text-[10px] text-slate-500">Reorder with buttons or change grade</span>
                </div>

                {items.map((item, index) => {
                  const rank = index + 1;
                  const inCutoff = rank <= cutoffK;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                        inCutoff
                          ? 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          : 'bg-slate-950/40 border-slate-900/60 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Rank Badge */}
                        <div
                          className={`w-6 h-6 rounded flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                            inCutoff
                              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {rank}
                        </div>

                        {/* Title and details */}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-200 truncate">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-500 font-mono">
                              Score: {item.score.toFixed(2)}
                            </span>
                            <span className="text-slate-700">•</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Discount: 1/log₂({rank}+1) = {(1 / Math.log2(rank + 1)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Controls: Grade Selector & Move Up/Down */}
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={item.rel}
                          onChange={(e) => updateRel(index, parseInt(e.target.value))}
                          className="bg-slate-900 border border-slate-700 text-xs rounded px-2 py-1 text-slate-200 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value={3}>Rel 3 (High)</option>
                          <option value={2}>Rel 2 (Good)</option>
                          <option value={1}>Rel 1 (Fair)</option>
                          <option value={0}>Rel 0 (Irrelevant)</option>
                        </select>

                        <div className="flex flex-col gap-0.5">
                          <button
                            disabled={index === 0}
                            onClick={() => moveItem(index, 'up')}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title="Move rank up"
                          >
                            <ArrowUpDown className="w-3 h-3 rotate-180" />
                          </button>
                          <button
                            disabled={index === items.length - 1}
                            onClick={() => moveItem(index, 'down')}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title="Move rank down"
                          >
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Step-by-Step Discount Breakdown (5 cols) */}
              <div className="lg:col-span-5 bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-semibold text-slate-300">
                    DCG@K Mathematical Steps
                  </span>
                  <span className="text-[10px] text-indigo-400 font-mono">
                    (2^rel - 1) / log₂(rank + 1)
                  </span>
                </div>

                <div className="space-y-2 font-mono text-[11px]">
                  {rankingStats.dcgSteps.map((step) => (
                    <div
                      key={step.rank}
                      className="flex items-center justify-between py-1 border-b border-slate-900 text-slate-400"
                    >
                      <span>
                        Rank {step.rank} (rel={step.item.rel}):
                      </span>
                      <span className="text-slate-300">
                        {step.gain} / {step.discount.toFixed(2)} ={' '}
                        <strong className="text-indigo-400">+{step.discountedGain.toFixed(2)}</strong>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Observed DCG@{cutoffK}:</span>
                    <span className="font-mono font-bold text-indigo-400">
                      {rankingStats.dcg.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Ideal IDCG@{cutoffK} (optimal sort):</span>
                    <span className="font-mono text-slate-300">
                      {rankingStats.idcg.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-200 pt-1 border-t border-slate-900 font-semibold">
                    <span>Normalized NDCG@{cutoffK}:</span>
                    <span className="font-mono text-emerald-400">
                      {(rankingStats.ndcg * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-indigo-300 font-medium">
                    <Sparkles className="w-3 h-3 shrink-0" />
                    <span>Why Logarithmic Decay?</span>
                  </div>
                  <p className="leading-relaxed">
                    User attention drops non-linearly. A relevant result moved from rank 1 to rank 2 loses 37% of its value, whereas moving from rank 9 to 10 loses under 3%.
                  </p>
                </div>
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
                <ListOrdered className="w-4 h-4 text-indigo-400" />
                Ranking Evaluation Query-Document Dataset
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-query benchmark evaluating search relevance rankings, cross-encoder scores, and cutoff thresholds.
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
                placeholder="Search query, document, or ID..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={gradeFilter}
                onChange={(e) => {
                  setGradeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Relevance Grades</option>
                <option value="3">Grade 3 (Highly Relevant)</option>
                <option value="2">Grade 2 (Relevant)</option>
                <option value="1">Grade 1 (Marginal)</option>
                <option value="0">Grade 0 (Irrelevant)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={hitFilter}
                onChange={(e) => {
                  setHitFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Top-3 Positions</option>
                <option value="hit">In Top-3 Viewport</option>
                <option value="miss">Below Top-3</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Sample ID</th>
                  <th className="py-2.5 px-3">Query</th>
                  <th className="py-2.5 px-3">Document Title</th>
                  <th className="py-2.5 px-3">Relevance</th>
                  <th className="py-2.5 px-3">Model Score</th>
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">1 / Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                {paginatedDataset.map((sample) => (
                  <tr key={sample.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                      {sample.id}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-200 max-w-[200px] truncate" title={sample.query}>
                      {sample.query}
                    </td>
                    <td className="py-2.5 px-3 max-w-[320px] truncate text-slate-300" title={sample.documentTitle}>
                      {sample.documentTitle}
                    </td>
                    <td className="py-2.5 px-3">
                      {gradeBadge(sample.relevanceGrade)}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-300">
                      {sample.modelScore.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-xs font-bold text-indigo-400">
                        #{sample.rankPosition}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {sample.reciprocalRank.toFixed(3)}
                    </td>
                  </tr>
                ))}
                {paginatedDataset.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No query-document pairs match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            <span>
              Showing {paginatedDataset.length} of {filteredDataset.length} entries
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
