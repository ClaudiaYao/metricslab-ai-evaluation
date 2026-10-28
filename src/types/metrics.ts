export type MetricCategory = 
  | 'classification'
  | 'regression'
  | 'object-detection'
  | 'segmentation'
  | 'llm'
  | 'ranking'
  | 'time-series'
  | 'clustering'
  | 'generative-vision'
  | 'audio-speech'
  | 'calibration'
  | 'fairness'
  | 'inference-efficiency';

export interface MetricDefinition {
  id: string;
  name: string;
  shortName: string;
  category: MetricCategory;
  value: number | string;
  formattedValue: string;
  unit?: string;
  range: string;
  ideal: string;
  formulaLatex: string;
  plainFormula: string;
  description: string;
  interpretation: string;
  whenToUse: string;
  whenToAvoid: string;
  workedExample: {
    inputs: Record<string, string | number | number[] | string[]>;
    steps: string[];
    result: string;
  };
  pythonCode: string;
}

export interface ClassificationSample {
  id: string;
  sampleName: string;
  trueLabel: 0 | 1;
  predictedProbability: number;
  featureSummary: string;
}

export interface RegressionSample {
  id: string;
  featureInfo: string;
  actual: number;
  predicted: number;
}

export interface ObjectDetectionBox {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectionSample {
  id: string;
  imageName: string;
  category: string;
  confidence: number;
  iouWithGroundTruth: number;
  isTruePositive: boolean;
  boundingBox: [number, number, number, number]; // [x, y, w, h]
  groundTruthBox: [number, number, number, number];
}

export interface SegmentationClassRow {
  classId: number;
  className: string;
  color: string;
  groundTruthPixels: number;
  predictedPixels: number;
  intersectionPixels: number;
  unionPixels: number;
  iou: number;
  dice: number;
  pixelAccuracy: number;
  weight: number;
}

export interface LLMEvalSample {
  id: string;
  prompt: string;
  referenceAnswer: string;
  modelOutput: string;
  bleu1: number;
  bleu4: number;
  rouge1: number;
  rougeL: number;
  perplexity: number;
  faithfulnessScore: number;
  relevanceScore: number;
  judgeVerdict: 'Pass' | 'Marginal' | 'Fail';
}

export interface RankingSample {
  id: string;
  query: string;
  docId: string;
  documentTitle: string;
  relevanceGrade: 0 | 1 | 2 | 3; // 0=Irrelevant, 1=Marginal, 2=Relevant, 3=Highly Relevant
  modelScore: number;
  rankPosition: number;
  isHitAt3: boolean;
  isHitAt5: boolean;
  reciprocalRank: number;
}

export interface TimeSeriesSample {
  id: string;
  timestamp: string;
  seriesName: string;
  actual: number;
  predicted: number;
  naiveBaseline: number;
  absoluteError: number;
  percentageError: number; // in %
  isAnomaly: boolean;
}

export interface ClusteringSample {
  id: string;
  pointName: string;
  x: number;
  y: number;
  assignedCluster: number;
  trueCluster: number;
  silhouetteScore: number;
  nearestNeighborCluster: number;
  distanceToCentroid: number;
}

export interface GenerativeVisionSample {
  id: string;
  prompt: string;
  modelName: string;
  samplingSteps: number;
  fidScore: number;
  clipScore: number;
  lpipsDistance: number;
  ssim: number;
  qualityRating: 'Exceptional' | 'Good' | 'Artifacted';
}

export interface AudioSpeechSample {
  id: string;
  audioClipName: string;
  durationSec: number;
  referenceTranscript: string;
  hypothesisTranscript: string;
  wer: number; // %
  cer: number; // %
  pesq: number; // 1.0 - 4.5
  substitutions: number;
  deletions: number;
  insertions: number;
}

export interface CalibrationSample {
  id: string;
  sampleId: string;
  predictedClass: string;
  confidence: number;
  groundTruth: string;
  isCorrect: boolean;
  confidenceBin: string; // e.g. "0.8 - 0.9"
  binCalibrationGap: number;
}

export interface FairnessSample {
  id: string;
  applicantId: string;
  protectedGroup: 'Protected (A=0)' | 'Privileged (A=1)';
  creditScore: number;
  qualificationTier: 'High' | 'Medium' | 'Borderline';
  approvalDecision: boolean;
  actualRepaid: boolean;
}

export interface InferenceEfficiencySample {
  id: string;
  benchmarkRun: string;
  hardware: string;
  modelArchitecture: string;
  concurrencyBatch: number;
  ttftMs: number;
  tpotMs: number;
  throughputTokensSec: number;
  vramUsageGb: number;
  p99LatencyMs: number;
}


