import React from 'react';
import { MetricDefinition } from '../types/metrics';
import { Calculator, ArrowUpRight, HelpCircle } from 'lucide-react';

interface MetricCardProps {
  metric: MetricDefinition;
  onInspect: (metric: MetricDefinition) => void;
  overrideValue?: string | number;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  metric,
  onInspect,
  overrideValue,
}) => {
  const displayVal = overrideValue !== undefined ? overrideValue : metric.formattedValue;

  return (
    <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 transition-all duration-200 flex flex-col justify-between group">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">
                {metric.name}
              </span>
            </div>
            <span className="text-[11px] font-mono text-indigo-400">
              {metric.shortName}
            </span>
          </div>

          <button
            onClick={() => onInspect(metric)}
            className="text-slate-500 hover:text-indigo-400 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
            title="Inspect calculation method & Python code"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Value */}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tracking-tight text-slate-100 tabular-nums">
            {displayVal}
          </span>
          {metric.unit && (
            <span className="text-xs text-slate-400 font-mono">
              {metric.unit}
            </span>
          )}
        </div>

        {/* Ideal & Range Metadata */}
        <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
          <span>Range: {metric.range}</span>
          <span aria-hidden="true">·</span>
          <span>Target: {metric.ideal}</span>
        </div>

        {/* Formula Snippet */}
        <div className="mt-3 bg-slate-950/70 border border-slate-800/80 rounded-md px-2.5 py-1.5 font-mono text-[11px] text-slate-300 truncate">
          {metric.plainFormula}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
        <span className="text-slate-400 truncate max-w-[170px]">
          {metric.interpretation.slice(0, 42)}...
        </span>
        <button
          onClick={() => onInspect(metric)}
          className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-0.5 cursor-pointer"
        >
          <span>Method</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
