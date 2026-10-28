import React from 'react';
import { Info } from 'lucide-react';
import { MetricDefinition } from '../types/metrics';

interface LiveMetricLabelProps {
  label: React.ReactNode;
  metric?: MetricDefinition;
  onInspect: (metric: MetricDefinition) => void;
}

export const LiveMetricLabel: React.FC<LiveMetricLabelProps> = ({ label, metric, onInspect }) => (
  <div className="flex items-start justify-between gap-1">
    <span className="text-[11px] text-slate-400 block">{label}</span>
    {metric && (
      <button
        onClick={() => onInspect(metric)}
        className="text-slate-500 hover:text-indigo-400 cursor-pointer"
        title="Inspect calculation method & Python code"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);
