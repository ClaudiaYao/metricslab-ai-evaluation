import React, { useState, useMemo } from 'react';
import { ActiveTab } from '../Header';
import { MetricDefinition } from '../../types/metrics';
import { MetricCard } from '../MetricCard';
import { LiveMetricLabel } from '../LiveMetricLabel';
import { audioSpeechMetricsList, mockAudioSpeechDataset } from '../../data/audioSpeechMockData';
import {
  Mic,
  Search,
  Download,
  Filter,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface AudioSpeechViewProps {
  activeTab: ActiveTab;
  searchQuery: string;
  onInspectMetric: (metric: MetricDefinition) => void;
}

export const AudioSpeechView: React.FC<AudioSpeechViewProps> = ({
  activeTab,
  searchQuery,
  onInspectMetric,
}) => {
  // Playground state
  const [referenceText, setReferenceText] = useState(
    'deploy the machine learning model to production today'
  );
  const [hypothesisText, setHypothesisText] = useState(
    'deploy machine learning module to production today'
  );

  // Table filters
  const [tableSearch, setTableSearch] = useState('');
  const [werFilter, setWerFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Preset scenarios
  const loadPreset = (type: 'exact' | 'minor' | 'noisy') => {
    if (type === 'exact') {
      setReferenceText('speech recognition accuracy depends on acoustic acoustic clarity');
      setHypothesisText('speech recognition accuracy depends on acoustic acoustic clarity');
    } else if (type === 'minor') {
      setReferenceText('the patient was prescribed twenty milligrams of atorvastatin daily');
      setHypothesisText('the patient was prescribed twenty milligrams of a torva statin daily');
    } else {
      setReferenceText('tower radar confirm runway two eight right cleared for immediate takeoff');
      setHypothesisText('tower confirm runway two eight cleared takeoff now');
    }
  };

  // Live Levenshtein calculation
  const liveAlignment = useMemo(() => {
    const refWords = referenceText.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const hypWords = hypothesisText.trim().toLowerCase().split(/\s+/).filter(Boolean);

    if (refWords.length === 0) {
      return { wer: 0, cer: 0, s: 0, d: 0, i: 0, refWords, hypWords, aligned: [] };
    }

    // Levenshtein DP Matrix
    const dp: number[][] = Array(refWords.length + 1)
      .fill(null)
      .map(() => Array(hypWords.length + 1).fill(0));

    for (let r = 0; r <= refWords.length; r++) dp[r][0] = r;
    for (let h = 0; h <= hypWords.length; h++) dp[0][h] = h;

    for (let r = 1; r <= refWords.length; r++) {
      for (let h = 1; h <= hypWords.length; h++) {
        if (refWords[r - 1] === hypWords[h - 1]) {
          dp[r][h] = dp[r - 1][h - 1];
        } else {
          dp[r][h] = Math.min(
            dp[r - 1][h - 1] + 1, // substitution
            dp[r - 1][h] + 1,     // deletion
            dp[r][h - 1] + 1      // insertion
          );
        }
      }
    }

    // Backtrack to extract S, D, I operations
    let r = refWords.length;
    let h = hypWords.length;
    let s = 0, d = 0, i = 0;
    const aligned: Array<{ ref?: string; hyp?: string; op: 'M' | 'S' | 'D' | 'I' }> = [];

    while (r > 0 || h > 0) {
      if (r > 0 && h > 0 && refWords[r - 1] === hypWords[h - 1]) {
        aligned.unshift({ ref: refWords[r - 1], hyp: hypWords[h - 1], op: 'M' });
        r--;
        h--;
      } else if (r > 0 && h > 0 && dp[r][h] === dp[r - 1][h - 1] + 1) {
        aligned.unshift({ ref: refWords[r - 1], hyp: hypWords[h - 1], op: 'S' });
        s++;
        r--;
        h--;
      } else if (r > 0 && dp[r][h] === dp[r - 1][h] + 1) {
        aligned.unshift({ ref: refWords[r - 1], op: 'D' });
        d++;
        r--;
      } else {
        aligned.unshift({ hyp: hypWords[h - 1], op: 'I' });
        i++;
        h--;
      }
    }

    const wer = ((s + d + i) / refWords.length) * 100;
    const refChars = Array.from(referenceText.trim().toLowerCase().replace(/\s+/g, ' '));
    const hypChars = Array.from(hypothesisText.trim().toLowerCase().replace(/\s+/g, ' '));
    let prev = Array.from({ length: hypChars.length + 1 }, (_, k) => k);
    for (let a = 1; a <= refChars.length; a++) {
      const row = [a];
      for (let b = 1; b <= hypChars.length; b++) {
        row[b] = Math.min(
          prev[b - 1] + (refChars[a - 1] === hypChars[b - 1] ? 0 : 1),
          prev[b] + 1,
          row[b - 1] + 1
        );
      }
      prev = row;
    }
    const cer = (prev[hypChars.length] / Math.max(1, refChars.length)) * 100;

    return { wer, cer, s, d, i, refWords, hypWords, aligned };
  }, [referenceText, hypothesisText]);

  // Filtered dataset table
  const filteredDataset = useMemo(() => {
    return mockAudioSpeechDataset.filter((sample) => {
      const matchesSearch =
        tableSearch === '' ||
        sample.id.toLowerCase().includes(tableSearch.toLowerCase()) ||
        sample.audioClipName.toLowerCase().includes(tableSearch.toLowerCase()) ||
        sample.referenceTranscript.toLowerCase().includes(tableSearch.toLowerCase()) ||
        sample.hypothesisTranscript.toLowerCase().includes(tableSearch.toLowerCase());

      const matchesWer =
        werFilter === 'all' ||
        (werFilter === 'clean' && sample.wer === 0) ||
        (werFilter === 'low' && sample.wer > 0 && sample.wer <= 10) ||
        (werFilter === 'high' && sample.wer > 10);

      return matchesSearch && matchesWer;
    });
  }, [tableSearch, werFilter]);

  const totalPages = Math.ceil(filteredDataset.length / pageSize) || 1;
  const paginatedDataset = filteredDataset.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const exportCSV = () => {
    const headers = ['ID', 'Audio Clip', 'Duration (s)', 'Reference Transcript', 'Hypothesis Transcript', 'WER (%)', 'CER (%)', 'PESQ'];
    const rows = filteredDataset.map((s) => [
      s.id,
      `"${s.audioClipName}"`,
      s.durationSec,
      `"${s.referenceTranscript}"`,
      `"${s.hypothesisTranscript}"`,
      s.wer,
      s.cer,
      s.pesq,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'audio_speech_evaluation_dataset.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const liveIds = ['wer', 'cer'];
  const metricById = (id: string) => audioSpeechMetricsList.find((m) => m.id === id);
  const referenceMetrics = audioSpeechMetricsList.filter(
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
          {/* Reference metrics with no live counterpart in the playground */}
          {referenceMetrics.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-indigo-400" />
                  Reference Acoustic Metrics (need audio; not driven by text inputs)
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {referenceMetrics.map((metric) => (
                  <MetricCard key={metric.id} metric={metric} onInspect={() => onInspectMetric(metric)} />
                ))}
              </div>
            </div>
          )}

          {/* Interactive Transcription Edit Distance Playground */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  Live ASR Transcription &amp; Levenshtein WER Calculator
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Type or edit transcripts to observe dynamic Levenshtein token alignment and real-time Word Error Rate (WER) decomposition.
                </p>
              </div>

              {/* Presets */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
                <button
                  onClick={() => loadPreset('exact')}
                  className="px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800 rounded cursor-pointer transition-colors"
                >
                  Exact Match
                </button>
                <button
                  onClick={() => loadPreset('minor')}
                  className="px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800 rounded cursor-pointer transition-colors"
                >
                  Medical Term
                </button>
                <button
                  onClick={() => loadPreset('noisy')}
                  className="px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800 rounded cursor-pointer transition-colors"
                >
                  Cockpit Radio
                </button>
              </div>
            </div>

            {/* Live Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label="Computed WER" metric={metricById('wer')} onInspect={onInspectMetric} />
                <span className={`text-xl font-bold font-mono ${liveAlignment.wer === 0 ? 'text-emerald-400' : liveAlignment.wer > 20 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {liveAlignment.wer.toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  (S + D + I) / {liveAlignment.refWords.length} words
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <span className="text-[11px] text-slate-400 block">Substitutions (S)</span>
                <span className="text-xl font-bold font-mono text-amber-400">
                  {liveAlignment.s}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Wrong word recognized
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <span className="text-[11px] text-slate-400 block">Deletions (D)</span>
                <span className="text-xl font-bold font-mono text-rose-400">
                  {liveAlignment.d}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Omitted spoken words
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <span className="text-[11px] text-slate-400 block">Insertions (I)</span>
                <span className="text-xl font-bold font-mono text-cyan-400">
                  {liveAlignment.i}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Hallucinated phantom words
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg">
                <LiveMetricLabel label="Computed CER" metric={metricById('cer')} onInspect={onInspectMetric} />
                <span className="text-xl font-bold font-mono text-purple-400">
                  {liveAlignment.cer.toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Character-level edit distance
                </span>
              </div>
            </div>

            {/* Interactive Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Ground Truth Reference Transcript (Human):
                </label>
                <textarea
                  value={referenceText}
                  onChange={(e) => setReferenceText(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Model ASR Hypothesis Transcript (Whisper / Model):
                </label>
                <textarea
                  value={hypothesisText}
                  onChange={(e) => setHypothesisText(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono resize-none"
                />
              </div>
            </div>

            {/* Token-by-Token Visual Alignment Ribbon */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium text-slate-300">
                  Token Levenshtein Alignment Ribbon
                </span>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-2 h-2 rounded bg-emerald-500" /> Match (M)
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <span className="w-2 h-2 rounded bg-amber-500" /> Substituted (S)
                  </span>
                  <span className="flex items-center gap-1 text-rose-400">
                    <span className="w-2 h-2 rounded bg-rose-500" /> Deleted (D)
                  </span>
                  <span className="flex items-center gap-1 text-cyan-400">
                    <span className="w-2 h-2 rounded bg-cyan-500" /> Inserted (I)
                  </span>
                </div>
              </div>

              {/* Aligned pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {liveAlignment.aligned.map((item, idx) => (
                  <div
                    key={idx}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex flex-col items-center ${
                      item.op === 'M'
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : item.op === 'S'
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        : item.op === 'D'
                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400">
                      {item.op === 'M' && 'Match'}
                      {item.op === 'S' && 'Subst'}
                      {item.op === 'D' && 'Deleted'}
                      {item.op === 'I' && 'Inserted'}
                    </span>
                    <span className="font-bold">
                      {item.op === 'D' ? item.ref : item.hyp}
                    </span>
                    {item.op === 'S' && (
                      <span className="text-[9px] text-slate-400 line-through">
                        {item.ref}
                      </span>
                    )}
                  </div>
                ))}
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
                <Mic className="w-4 h-4 text-indigo-400" />
                Audio Speech Transcription Evaluation Dataset
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Benchmark evaluation across speech acoustic domains (clinical, financial calls, noisy radio, accents).
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
                placeholder="Search transcript, audio file, or ID..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={werFilter}
                onChange={(e) => {
                  setWerFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Word Error Rates</option>
                <option value="clean">0% WER (Flawless Recognition)</option>
                <option value="low">Low WER (&le; 10%)</option>
                <option value="high">High Error (&gt; 10%)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Clip ID</th>
                  <th className="py-2.5 px-3">Audio Source</th>
                  <th className="py-2.5 px-3">Reference Transcript</th>
                  <th className="py-2.5 px-3">Hypothesis</th>
                  <th className="py-2.5 px-3">WER</th>
                  <th className="py-2.5 px-3">CER</th>
                  <th className="py-2.5 px-3">PESQ</th>
                  <th className="py-2.5 px-3">Errors (S/D/I)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                {paginatedDataset.map((sample) => (
                  <tr key={sample.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                      {sample.id}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300 text-[11px]">
                      {sample.audioClipName}
                    </td>
                    <td className="py-2.5 px-3 max-w-[220px] truncate text-slate-300" title={sample.referenceTranscript}>
                      {sample.referenceTranscript}
                    </td>
                    <td className="py-2.5 px-3 max-w-[220px] truncate text-slate-400" title={sample.hypothesisTranscript}>
                      {sample.hypothesisTranscript}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">
                      <span className={sample.wer === 0 ? 'text-emerald-400' : sample.wer > 15 ? 'text-rose-400' : 'text-amber-400'}>
                        {sample.wer.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {sample.cer.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 font-mono text-indigo-400">
                      {sample.pesq.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                      {sample.substitutions}S / {sample.deletions}D / {sample.insertions}I
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            <span>
              Showing {paginatedDataset.length} of {filteredDataset.length} audio clips
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
