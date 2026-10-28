import React, { useState } from 'react';
import { MetricCategory, MetricDefinition } from './types/metrics';
import { Sidebar } from './components/Sidebar';
import { Header, ActiveTab } from './components/Header';
import { FormulaModal } from './components/FormulaModal';
import { ClassificationView } from './components/classification/ClassificationView';
import { RegressionView } from './components/regression/RegressionView';
import { ObjectDetectionView } from './components/objectDetection/ObjectDetectionView';
import { SegmentationView } from './components/segmentation/SegmentationView';
import { LLMView } from './components/llm/LLMView';
import { RankingView } from './components/ranking/RankingView';
import { TimeSeriesView } from './components/timeSeries/TimeSeriesView';
import { ClusteringView } from './components/clustering/ClusteringView';
import { GenerativeVisionView } from './components/generativeVision/GenerativeVisionView';
import { AudioSpeechView } from './components/audioSpeech/AudioSpeechView';
import { CalibrationView } from './components/calibration/CalibrationView';
import { FairnessView } from './components/fairness/FairnessView';
import { InferenceEfficiencyView } from './components/inferenceEfficiency/InferenceEfficiencyView';

export default function App() {
  const [activeCategory, setActiveCategory] = useState<MetricCategory>('classification');
  const [activeTab, setActiveTab] = useState<ActiveTab>('playground');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectedMetric, setInspectedMetric] = useState<MetricDefinition | null>(null);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Left Pane (Sidebar with 13 concise items) */}
      <Sidebar
        activeCategory={activeCategory}
        onSelectCategory={(cat) => {
          setActiveCategory(cat);
          setSearchQuery('');
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Right Pane (Main Evaluation Viewport) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
        {/* Top Header */}
        <Header
          activeCategory={activeCategory}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />

        {/* Scrollable Right Pane Content */}
        <main className="flex-1 overflow-y-auto px-6 py-6 max-w-7xl w-full mx-auto">
          {activeCategory === 'classification' && (
            <ClassificationView
              activeTab={activeTab}
              searchQuery={searchQuery}
              onInspectMetric={setInspectedMetric}
            />
          )}

          {activeCategory === 'regression' && (
            <RegressionView
              activeTab={activeTab}
              searchQuery={searchQuery}
              onInspectMetric={setInspectedMetric}
            />
          )}

          {activeCategory === 'object-detection' && (
            <ObjectDetectionView
              activeTab={activeTab}
              searchQuery={searchQuery}
              onInspectMetric={setInspectedMetric}
            />
          )}

          {activeCategory === 'segmentation' && (
            <SegmentationView
              activeTab={activeTab}
              searchQuery={searchQuery}
              onInspectMetric={setInspectedMetric}
            />
          )}

          {activeCategory === 'llm' && (
            <LLMView
              activeTab={activeTab}
              searchQuery={searchQuery}
              onInspectMetric={setInspectedMetric}
            />
          )}

          {activeCategory === 'ranking' && (
            <RankingView
              activeTab={activeTab}
              searchQuery={searchQuery}
              onInspectMetric={setInspectedMetric}
            />
          )}

          {activeCategory === 'time-series' && (
            <TimeSeriesView
              activeTab={activeTab}
              searchQuery={searchQuery}
              onInspectMetric={setInspectedMetric}
            />
          )}

          {activeCategory === 'clustering' && (
            <ClusteringView
              activeTab={activeTab}
              searchQuery={searchQuery}
              onInspectMetric={setInspectedMetric}
            />
          )}

          {activeCategory === 'generative-vision' && (
            <GenerativeVisionView
              activeTab={activeTab}
              searchQuery={searchQuery}
              onInspectMetric={setInspectedMetric}
            />
          )}

          {activeCategory === 'audio-speech' && (
            <AudioSpeechView
              activeTab={activeTab}
              searchQuery={searchQuery}
              onInspectMetric={setInspectedMetric}
            />
          )}

          {activeCategory === 'calibration' && (
            <CalibrationView
              activeTab={activeTab}
              searchQuery={searchQuery}
              onInspectMetric={setInspectedMetric}
            />
          )}

          {activeCategory === 'fairness' && (
            <FairnessView
              activeTab={activeTab}
              searchQuery={searchQuery}
              onInspectMetric={setInspectedMetric}
            />
          )}

          {activeCategory === 'inference-efficiency' && (
            <InferenceEfficiencyView
              activeTab={activeTab}
              searchQuery={searchQuery}
              onInspectMetric={setInspectedMetric}
            />
          )}
        </main>
      </div>

      {/* Deep-Dive Mathematical Formula Modal */}
      <FormulaModal
        metric={inspectedMetric}
        onClose={() => setInspectedMetric(null)}
      />
    </div>
  );
}
