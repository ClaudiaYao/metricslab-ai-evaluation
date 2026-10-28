import React from 'react';
import { MetricCategory } from '../types/metrics';
import { Sliders, Table2 } from 'lucide-react';

export type ActiveTab = 'playground' | 'dataset';

interface HeaderProps {
  activeCategory: MetricCategory;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

const categoryTitles: Record<MetricCategory, { title: string; subtitle: string }> = {
  classification: {
    title: 'Classification Metrics',
    subtitle: 'Decision boundaries, threshold calibration, probability penalties, and confusion matrices',
  },
  regression: {
    title: 'Regression Metrics',
    subtitle: 'Continuous target estimators, residual distribution, variance explained, and outlier robustness',
  },
  'object-detection': {
    title: 'Object Detection Metrics',
    subtitle: 'Spatial bounding box overlap (IoU), 11-point interpolated AP, and VOC/COCO mAP protocols',
  },
  segmentation: {
    title: 'Segmentation Metrics',
    subtitle: 'Pixel-level masks, Jaccard Index (mIoU), Dice similarity coefficient, and boundary contours',
  },
  llm: {
    title: 'LLM & Generative Metrics',
    subtitle: 'Token perplexity, n-gram precision/recall (BLEU & ROUGE), and RAG Triad hallucination guards',
  },
  ranking: {
    title: 'Ranking & Recommendation Metrics',
    subtitle: 'Logarithmic position discount (NDCG), Mean Average Precision (MAP), Mean Reciprocal Rank (MRR), and Hit Rate cutoffs',
  },
  'time-series': {
    title: 'Time Series & Forecasting Metrics',
    subtitle: 'Scale-independent percentage errors (MAPE & SMAPE), naive persistence baseline benchmarks (MASE), and directional accuracy',
  },
  clustering: {
    title: 'Clustering & Unsupervised Metrics',
    subtitle: 'Intra-vs-inter cluster cohesion (Silhouette Score), centroid dispersion (Davies-Bouldin), and variance ratio criteria (CH)',
  },
  'generative-vision': {
    title: 'Generative Vision & Diffusion Metrics',
    subtitle: 'Fréchet Inception Distance (FID), CLIPScore prompt adherence, deep perceptual distance (LPIPS), and structural similarity',
  },
  'audio-speech': {
    title: 'Audio, Speech & Acoustic Metrics',
    subtitle: 'Speech-to-text Word Error Rate (WER), character edit distance (CER), and psychoacoustic voice quality (PESQ/STOI)',
  },
  calibration: {
    title: 'Model Calibration & Uncertainty Metrics',
    subtitle: 'Expected Calibration Error (ECE), Reliability Diagrams, Brier Score reliability decompositions, and Temperature Scaling',
  },
  fairness: {
    title: 'Fairness, Equity & Algorithmic Bias Metrics',
    subtitle: 'Demographic Parity Differences (DPD), US EEOC Four-Fifths Adverse Impact Rule (DIR), and Equalized Odds error parity',
  },
  'inference-efficiency': {
    title: 'Inference & Serving Performance Metrics',
    subtitle: 'Time To First Token (TTFT), Time Per Output Token (TPOT), GPU KV Cache footprint sizing, and P99 tail latency',
  },
};

export const Header: React.FC<HeaderProps> = ({
  activeCategory,
  activeTab,
  onSelectTab,
}) => {
  const info = categoryTitles[activeCategory];

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-20 px-6 py-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Breadcrumbs & Title */}
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Evaluation Suite</span>
            <span aria-hidden="true" className="text-slate-600">/</span>
            <span className="text-indigo-400 font-medium capitalize">
              {activeCategory.replace('-', ' ')}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2.5">
            {info.title}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl hidden md:block">
            {info.subtitle}
          </p>
        </div>

        {/* Right: Tab Switcher (Merged Metrics & Playground + Mock Dataset Table) */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg shrink-0">
          <button
            onClick={() => onSelectTab('playground')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              activeTab === 'playground'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Metrics &amp; Playground</span>
          </button>
          <button
            onClick={() => onSelectTab('dataset')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              activeTab === 'dataset'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Mock Dataset Table</span>
          </button>
        </div>
      </div>
    </header>
  );
};
