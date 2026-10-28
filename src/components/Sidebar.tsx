import React from 'react';
import { MetricCategory } from '../types/metrics';
import {
  CheckCircle2,
  TrendingUp,
  Maximize2,
  Layers,
  Sparkles,
  Search,
  Zap,
  ListOrdered,
  Activity,
  Network,
  Image,
  Mic,
  Target,
  Scale,
  Cpu,
} from 'lucide-react';

interface SidebarProps {
  activeCategory: MetricCategory;
  onSelectCategory: (category: MetricCategory) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

interface CategoryNavConfig {
  id: MetricCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  metricCount: number;
}

const categories: CategoryNavConfig[] = [
  {
    id: 'classification',
    label: 'Classification metrics',
    icon: CheckCircle2,
    metricCount: 8,
  },
  {
    id: 'regression',
    label: 'Regression metrics',
    icon: TrendingUp,
    metricCount: 6,
  },
  {
    id: 'object-detection',
    label: 'Object detection metrics',
    icon: Maximize2,
    metricCount: 5,
  },
  {
    id: 'segmentation',
    label: 'Segmentation metrics',
    icon: Layers,
    metricCount: 4,
  },
  {
    id: 'llm',
    label: 'LLM metrics',
    icon: Sparkles,
    metricCount: 5,
  },
  {
    id: 'ranking',
    label: 'Ranking metrics',
    icon: ListOrdered,
    metricCount: 5,
  },
  {
    id: 'time-series',
    label: 'Time series metrics',
    icon: Activity,
    metricCount: 5,
  },
  {
    id: 'clustering',
    label: 'Clustering metrics',
    icon: Network,
    metricCount: 4,
  },
  {
    id: 'generative-vision',
    label: 'Generative vision metrics',
    icon: Image,
    metricCount: 5,
  },
  {
    id: 'audio-speech',
    label: 'Audio & speech metrics',
    icon: Mic,
    metricCount: 5,
  },
  {
    id: 'calibration',
    label: 'Calibration metrics',
    icon: Target,
    metricCount: 4,
  },
  {
    id: 'fairness',
    label: 'Fairness & bias metrics',
    icon: Scale,
    metricCount: 4,
  },
  {
    id: 'inference-efficiency',
    label: 'Inference efficiency metrics',
    icon: Cpu,
    metricCount: 5,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0 select-none">
      {/* Brand Zone */}
      <div className="px-4 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Zap className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-slate-100">
            MetricsLab
          </span>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="p-3 border-b border-slate-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search metrics..."
            className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30"
          />
        </div>
      </div>

      {/* 13 Concise Category Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          const Icon = cat.icon;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`w-full group text-left px-3 py-2 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                isActive
                  ? 'bg-slate-800 border-indigo-500/40 text-slate-100 font-medium'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span className="text-xs truncate">
                  {cat.label}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono tabular-nums bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                {cat.metricCount}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
