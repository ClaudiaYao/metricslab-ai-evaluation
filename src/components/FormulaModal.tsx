import React, { useState } from 'react';
import { MetricDefinition } from '../types/metrics';
import { X, Check, Copy, Code, Calculator, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface FormulaModalProps {
  metric: MetricDefinition | null;
  onClose: () => void;
}

export const FormulaModal: React.FC<FormulaModalProps> = ({ metric, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!metric) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(metric.pythonCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  {metric.name}
                </h3>
                <span className="text-xs font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50">
                  {metric.shortName}
                </span>
              </div>
              <p className="text-xs text-slate-400 capitalize">
                {metric.category.replace('-', ' ')} Metric Evaluation Guide
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Formula Display Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              Mathematical Formula
            </div>
            <div className="py-3 px-4 bg-slate-900/90 border border-slate-800/80 rounded-lg text-center overflow-x-auto">
              <span className="font-mono text-sm md:text-base text-indigo-200 font-semibold tracking-wide">
                {metric.formulaLatex}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Standard formulation: <code className="text-slate-300 font-mono">{metric.plainFormula}</code></span>
              <span className="font-mono">Ideal target: <span className="text-emerald-400 font-semibold">{metric.ideal}</span></span>
            </div>
          </div>

          {/* Plain-English Intuition */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1.5">
              Conceptual Intuition
            </h4>
            <p className="text-slate-300 text-xs leading-relaxed">
              {metric.description}
            </p>
            <p className="text-slate-400 text-xs leading-relaxed mt-1">
              {metric.interpretation}
            </p>
          </div>

          {/* Worked Example with Concrete Numbers */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-emerald-400" />
              Step-by-Step Numerical Example
            </h4>

            {/* Inputs preview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {Object.entries(metric.workedExample.inputs).map(([k, v]) => (
                <div key={k} className="bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800 text-[11px]">
                  <span className="text-slate-400 block">{k}:</span>
                  <span className="font-mono text-slate-200 font-semibold">
                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculation Steps */}
            <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800 font-mono text-[11px]">
              {metric.workedExample.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold shrink-0">{idx + 1}.</span>
                  <span className="text-slate-300">{step}</span>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-slate-800 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-400">Final Calculated Result:</span>
                <span className="text-emerald-400 font-mono">{metric.workedExample.result}</span>
              </div>
            </div>
          </div>

          {/* When to Use vs When to Avoid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-3.5">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs mb-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>When to Use This Metric</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                {metric.whenToUse}
              </p>
            </div>

            <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-3.5">
              <div className="flex items-center gap-2 text-rose-300 font-semibold text-xs mb-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Pitfalls & When to Avoid</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                {metric.whenToAvoid}
              </p>
            </div>
          </div>

          {/* Python Implementation Code */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-indigo-400" />
                Python Implementation Snippet
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-slate-200 overflow-x-auto leading-relaxed">
              <code>{metric.pythonCode}</code>
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
