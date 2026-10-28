import { MetricDefinition, CalibrationSample } from '../types/metrics';

export const calibrationMetricsList: MetricDefinition[] = [
  {
    id: 'ece',
    name: 'ECE (Expected Calibration Error)',
    shortName: 'ECE',
    category: 'calibration',
    value: 0.042,
    formattedValue: '4.20%',
    unit: '%',
    range: '[0.0, 1.0]',
    ideal: '0.0% (Perfect confidence calibration)',
    formulaLatex: '\\text{ECE} = \\sum_{m=1}^{M} \\frac{|B_m|}{N} \\left| \\text{acc}(B_m) - \\text{conf}(B_m) \\right|',
    plainFormula: 'sum_m (|B_m| / N) * |accuracy(B_m) - confidence(B_m)|',
    description: 'Measures the degree to which a classification model\'s predicted probabilities correspond to real-world accuracy across confidence bins. When a model predicts 80% confidence, it should be correct exactly 80% of the time.',
    interpretation: 'An ECE of 4.2% demonstrates high reliability. Modern uncalibrated deep neural nets often exhibit ECE of 15-25% (severe overconfidence).',
    whenToUse: 'High-stakes machine learning (medical diagnostics, self-driving cars, loan underwriting) where confidence must be trusted as true Bayesian probability.',
    whenToAvoid: 'Models only used for rank-ordering where absolute probabilities are irrelevant.',
    workedExample: {
      inputs: {
        'Bin [0.8-0.9] (100 samples)': 'Mean conf = 0.85, Actual accuracy = 0.81 (gap = 0.04)',
        'Bin [0.9-1.0] (200 samples)': 'Mean conf = 0.95, Actual accuracy = 0.91 (gap = 0.04)',
      },
      steps: [
        'Weighted gap = (100/300)*0.04 + (200/300)*0.04 = 0.040',
        'ECE = 4.0%',
      ],
      result: '4.0%',
    },
    pythonCode: `import numpy as np

def expected_calibration_error(y_true, y_prob, n_bins=10):
    bin_limits = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        in_bin = (y_prob > bin_limits[i]) & (y_prob <= bin_limits[i+1])
        if np.sum(in_bin) > 0:
            acc = np.mean(y_true[in_bin])
            conf = np.mean(y_prob[in_bin])
            ece += (np.sum(in_bin) / len(y_true)) * np.abs(acc - conf)
    return ece`,
  },
  {
    id: 'brier-score',
    name: 'Brier Score',
    shortName: 'BRIER',
    category: 'calibration',
    value: 0.088,
    formattedValue: '0.088',
    range: '[0.0, 1.0]',
    ideal: '0.0 (Perfect certainty and accuracy)',
    formulaLatex: '\\text{BS} = \\frac{1}{N} \\sum_{i=1}^{N} (f_i - o_i)^2',
    plainFormula: '(1 / N) * sum((predicted_prob_i - actual_outcome_i)^2)',
    description: 'Strictly proper scoring rule that penalizes both incorrect predictions and probabilistic uncertainty. It decomposes mathematically into Reliability (calibration), Resolution, and Uncertainty.',
    interpretation: '0.088 indicates strong probabilistic precision. For reference, predicting an uninformative 50/50 prior on binary outcomes yields 0.25.',
    whenToUse: 'Comparing weather forecasting models, clinical prediction models, and betting market calibration.',
    whenToAvoid: 'Multi-class datasets without adapting to multi-class Brier formulations.',
    workedExample: {
      inputs: {
        'Sample 1': 'pred = 0.90, actual = 1 -> (0.9 - 1)^2 = 0.01',
        'Sample 2': 'pred = 0.80, actual = 1 -> (0.8 - 1)^2 = 0.04',
        'Sample 3': 'pred = 0.20, actual = 0 -> (0.2 - 0)^2 = 0.04',
      },
      steps: [
        'Sum of squared errors = 0.01 + 0.04 + 0.04 = 0.09',
        'Brier Score = 0.09 / 3 = 0.030',
      ],
      result: '0.030',
    },
    pythonCode: `from sklearn.metrics import brier_score_loss
bs = brier_score_loss(y_true, y_prob)`,
  },
  {
    id: 'mce',
    name: 'MCE (Maximum Calibration Error)',
    shortName: 'MCE',
    category: 'calibration',
    value: 0.095,
    formattedValue: '9.50%',
    unit: '%',
    range: '[0.0, 1.0]',
    ideal: '0.0%',
    formulaLatex: '\\text{MCE} = \\max_{m \\in \\{1,\\dots,M\\}} \\left| \\text{acc}(B_m) - \\text{conf}(B_m) \\right|',
    plainFormula: 'max_m |accuracy(B_m) - confidence(B_m)|',
    description: 'Identifies the single worst confidence interval in the model. Even if overall ECE is low, a high MCE warns that model predictions in a specific probability band are dangerously deceptive.',
    interpretation: 'At no confidence bin does the model\'s true accuracy diverge from its advertised confidence by more than 9.5%.',
    whenToUse: 'Mission-critical safety audits where worst-case reliability guarantees are mandatory.',
    whenToAvoid: 'Bins with very small sample sizes (e.g. n < 5) where empirical accuracy has high sampling variance.',
    workedExample: {
      inputs: { 'Bin gaps': '[0.02, 0.04, 0.095, 0.03, 0.01]' },
      steps: ['MCE = max(gaps) = 0.095'],
      result: '9.50%',
    },
    pythonCode: `mce = np.max([np.abs(acc - conf) for acc, conf in bin_stats])`,
  },
  {
    id: 'nll',
    name: 'Negative Log-Likelihood (NLL)',
    shortName: 'NLL',
    category: 'calibration',
    value: 0.312,
    formattedValue: '0.312',
    range: '[0.0, ∞)',
    ideal: '0.0',
    formulaLatex: '\\text{NLL} = -\\frac{1}{N} \\sum_{i=1}^{N} \\log(p_{i, y_i})',
    plainFormula: '-(1 / N) * sum(log(prob_assigned_to_true_class))',
    description: 'Proper scoring rule that severely penalizes confident mistakes. If a model assigns 99.9% probability to Class A and the true label is Class B, NLL explodes toward infinity.',
    interpretation: 'A value of 0.312 confirms that the model assigns high average likelihood to true ground truth labels.',
    whenToUse: 'Optimizing temperature scaling parameters during post-processing calibration.',
    whenToAvoid: 'Comparing models trained with label smoothing where raw probabilities are intentionally relaxed.',
    workedExample: {
      inputs: { 'True probabilities': '[0.88, 0.94, 0.72]' },
      steps: [
        'Logs = -log(0.88)=0.128, -log(0.94)=0.062, -log(0.72)=0.329',
        'Mean NLL = (0.128 + 0.062 + 0.329) / 3 = 0.173',
      ],
      result: '0.173',
    },
    pythonCode: `from sklearn.metrics import log_loss
nll = log_loss(y_true, y_prob)`,
  },
];

export const mockCalibrationDataset: CalibrationSample[] = [
  { id: 'CAL-01', sampleId: 'CT-SCAN-881', predictedClass: 'Malignant', confidence: 0.94, groundTruth: 'Malignant', isCorrect: true, confidenceBin: '0.9 - 1.0', binCalibrationGap: 0.03 },
  { id: 'CAL-02', sampleId: 'CT-SCAN-882', predictedClass: 'Benign', confidence: 0.91, groundTruth: 'Benign', isCorrect: true, confidenceBin: '0.9 - 1.0', binCalibrationGap: 0.03 },
  { id: 'CAL-03', sampleId: 'CT-SCAN-883', predictedClass: 'Malignant', confidence: 0.88, groundTruth: 'Malignant', isCorrect: true, confidenceBin: '0.8 - 0.9', binCalibrationGap: 0.04 },
  { id: 'CAL-04', sampleId: 'CT-SCAN-884', predictedClass: 'Benign', confidence: 0.82, groundTruth: 'Malignant', isCorrect: false, confidenceBin: '0.8 - 0.9', binCalibrationGap: 0.04 }, // Overconfident error!
  { id: 'CAL-05', sampleId: 'CT-SCAN-885', predictedClass: 'Malignant', confidence: 0.76, groundTruth: 'Malignant', isCorrect: true, confidenceBin: '0.7 - 0.8', binCalibrationGap: 0.05 },
  { id: 'CAL-06', sampleId: 'CT-SCAN-886', predictedClass: 'Benign', confidence: 0.71, groundTruth: 'Benign', isCorrect: true, confidenceBin: '0.7 - 0.8', binCalibrationGap: 0.05 },
  { id: 'CAL-07', sampleId: 'CT-SCAN-887', predictedClass: 'Malignant', confidence: 0.64, groundTruth: 'Benign', isCorrect: false, confidenceBin: '0.6 - 0.7', binCalibrationGap: 0.06 },
  { id: 'CAL-08', sampleId: 'CT-SCAN-888', predictedClass: 'Benign', confidence: 0.61, groundTruth: 'Benign', isCorrect: true, confidenceBin: '0.6 - 0.7', binCalibrationGap: 0.06 },
  { id: 'CAL-09', sampleId: 'CT-SCAN-889', predictedClass: 'Malignant', confidence: 0.54, groundTruth: 'Malignant', isCorrect: true, confidenceBin: '0.5 - 0.6', binCalibrationGap: 0.02 },
  { id: 'CAL-10', sampleId: 'CT-SCAN-890', predictedClass: 'Benign', confidence: 0.52, groundTruth: 'Benign', isCorrect: true, confidenceBin: '0.5 - 0.6', binCalibrationGap: 0.02 },
];
