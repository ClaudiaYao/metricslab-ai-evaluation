import {
  MetricCategory,
  MetricDefinition,
  ClassificationSample,
  RegressionSample,
  DetectionSample,
  SegmentationClassRow,
  LLMEvalSample,
} from '../types/metrics';

// ==========================================
// 1. CLASSIFICATION MOCK DATA & DEFINITIONS
// ==========================================

export const classificationMetricsList: MetricDefinition[] = [
  {
    id: 'accuracy',
    name: 'Accuracy',
    shortName: 'ACC',
    category: 'classification',
    value: 0.88,
    formattedValue: '88.0%',
    range: '[0.0, 1.0]',
    ideal: '1.0 (100%)',
    formulaLatex: '\\text{Accuracy} = \\frac{TP + TN}{TP + TN + FP + FN}',
    plainFormula: '(TP + TN) / (TP + TN + FP + FN)',
    description: 'The overall fraction of correct predictions (both positive and negative) among all evaluated instances.',
    interpretation: 'Provides an intuitive score for balanced datasets, but can be severely misleading under extreme class imbalance.',
    whenToUse: 'When positive and negative classes are roughly equally distributed and misclassification costs are symmetric.',
    whenToAvoid: 'Rare event detection (e.g., fraud at 0.1%, cancer screening at 1%) where predicting the majority class trivially yields 99%+ accuracy.',
    workedExample: {
      inputs: { TP: 45, TN: 43, FP: 7, FN: 5 },
      steps: [
        'Total correct = TP + TN = 45 + 43 = 88',
        'Total instances = 45 + 43 + 7 + 5 = 100',
        'Accuracy = 88 / 100 = 0.88 (88%)',
      ],
      result: '0.88 (88%)',
    },
    pythonCode: `from sklearn.metrics import accuracy_score
acc = accuracy_score(y_true, y_pred)`,
  },
  {
    id: 'precision',
    name: 'Precision (Positive Predictive Value)',
    shortName: 'PREC',
    category: 'classification',
    value: 0.865,
    formattedValue: '86.5%',
    range: '[0.0, 1.0]',
    ideal: '1.0 (100%)',
    formulaLatex: '\\text{Precision} = \\frac{TP}{TP + FP}',
    plainFormula: 'TP / (TP + FP)',
    description: 'Proportion of positive identifications that were actually correct. Answers: "Of all items predicted positive, how many were truly positive?"',
    interpretation: 'Measures purity of positive predictions. High precision means very few false alarms.',
    whenToUse: 'When the cost of a False Positive is high (e.g., spam filter moving important emails to spam, YouTube copyright strikes).',
    whenToAvoid: 'When missing a positive is catastrophic (e.g. fatal illness screening, where False Negatives must be minimized).',
    workedExample: {
      inputs: { TP: 45, FP: 7 },
      steps: [
        'True positives = 45',
        'Total predicted positives = TP + FP = 45 + 7 = 52',
        'Precision = 45 / 52 = 0.8654',
      ],
      result: '86.5%',
    },
    pythonCode: `from sklearn.metrics import precision_score
prec = precision_score(y_true, y_pred, zero_division=0)`,
  },
  {
    id: 'recall',
    name: 'Recall / Sensitivity (True Positive Rate)',
    shortName: 'REC',
    category: 'classification',
    value: 0.90,
    formattedValue: '90.0%',
    range: '[0.0, 1.0]',
    ideal: '1.0 (100%)',
    formulaLatex: '\\text{Recall} = \\frac{TP}{TP + FN}',
    plainFormula: 'TP / (TP + FN)',
    description: 'Proportion of actual positives that were correctly identified. Answers: "Of all real positive cases, how many did the model find?"',
    interpretation: 'Measures coverage of real positives. High recall means very few missed cases (low false negatives).',
    whenToUse: 'High-stakes detection where missing a case has severe consequences (malignant tumor diagnosis, nuclear plant leak alerts).',
    whenToAvoid: 'In isolation when false alarms carry substantial operational cost, as predicting all positive trivially gets 100% recall.',
    workedExample: {
      inputs: { TP: 45, FN: 5 },
      steps: [
        'True positives = 45',
        'Total actual positives = TP + FN = 45 + 5 = 50',
        'Recall = 45 / 50 = 0.9000',
      ],
      result: '90.0%',
    },
    pythonCode: `from sklearn.metrics import recall_score
rec = recall_score(y_true, y_pred)`,
  },
  {
    id: 'specificity',
    name: 'Specificity (True Negative Rate)',
    shortName: 'SPEC',
    category: 'classification',
    value: 0.86,
    formattedValue: '86.0%',
    range: '[0.0, 1.0]',
    ideal: '1.0 (100%)',
    formulaLatex: '\\text{Specificity} = \\frac{TN}{TN + FP}',
    plainFormula: 'TN / (TN + FP)',
    description: 'Proportion of actual negatives correctly identified. Answers: "Of all healthy patients, how many were correctly cleared?"',
    interpretation: 'Complements recall. Also represented as (1 - False Positive Rate).',
    whenToUse: 'Medical diagnostic tests to ensure healthy individuals are not subjected to dangerous exploratory surgery.',
    whenToAvoid: 'When negative class is uninformative or infinitely large (e.g. web search negative documents).',
    workedExample: {
      inputs: { TN: 43, FP: 7 },
      steps: [
        'True negatives = 43',
        'Total actual negatives = TN + FP = 43 + 7 = 50',
        'Specificity = 43 / 50 = 0.8600',
      ],
      result: '86.0%',
    },
    pythonCode: `from sklearn.metrics import confusion_matrix
tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
spec = tn / (tn + fp)`,
  },
  {
    id: 'f1',
    name: 'F1-Score (Harmonic Mean)',
    shortName: 'F1',
    category: 'classification',
    value: 0.882,
    formattedValue: '0.882',
    range: '[0.0, 1.0]',
    ideal: '1.0',
    formulaLatex: 'F_1 = 2 \\times \\frac{\\text{Precision} \\times \\text{Recall}}{\\text{Precision} + \\text{Recall}} = \\frac{2TP}{2TP + FP + FN}',
    plainFormula: '2 * (Precision * Recall) / (Precision + Recall)',
    description: 'The harmonic mean of precision and recall. Punishes extreme imbalance between precision and recall much more heavily than arithmetic mean.',
    interpretation: 'A single balanced summary statistic when both false positives and false negatives are important.',
    whenToUse: 'When evaluating models on imbalanced datasets where both precision and recall matter.',
    whenToAvoid: 'When precision and recall have asymmetric business importance (use F_beta score with beta weighting instead).',
    workedExample: {
      inputs: { Precision: 0.8654, Recall: 0.9000 },
      steps: [
        'Product = 0.8654 * 0.9000 = 0.7788',
        'Sum = 0.8654 + 0.9000 = 1.7654',
        'F1 = 2 * (0.7788 / 1.7654) = 0.8823',
      ],
      result: '0.882',
    },
    pythonCode: `from sklearn.metrics import f1_score
f1 = f1_score(y_true, y_pred)`,
  },
  {
    id: 'roc_auc',
    name: 'ROC-AUC',
    shortName: 'AUC',
    category: 'classification',
    value: 0.934,
    formattedValue: '0.934',
    range: '[0.5, 1.0]',
    ideal: '1.0',
    formulaLatex: '\\text{AUC} = \\int_{0}^{1} \\text{TPR}(t)\\, d\\text{FPR}(t)',
    plainFormula: 'Area under TPR vs FPR curve across all probability thresholds',
    description: 'Measures the probability that a randomly chosen positive instance receives a higher predicted score than a randomly chosen negative instance.',
    interpretation: 'Threshold-independent measure of model discrimination ability. 0.5 = random guessing, 1.0 = perfect ranking.',
    whenToUse: 'To benchmark classification models independent of any specific operational decision threshold.',
    whenToAvoid: 'Heavily imbalanced datasets (e.g. 1 positive in 10,000 negatives), where PR-AUC is much more informative.',
    workedExample: {
      inputs: { ConcordantPairs: 934, TotalPairs: 1000 },
      steps: [
        'Total positive-negative pairs = 50 * 50 = 2500',
        'Concordant ranked pairs = 2335',
        'AUC = 2335 / 2500 = 0.934',
      ],
      result: '0.934',
    },
    pythonCode: `from sklearn.metrics import roc_auc_score
auc = roc_auc_score(y_true, y_scores)`,
  },
  {
    id: 'mcc',
    name: 'Matthews Correlation Coefficient',
    shortName: 'MCC',
    category: 'classification',
    value: 0.761,
    formattedValue: '+0.761',
    range: '[-1.0, +1.0]',
    ideal: '+1.0',
    formulaLatex: '\\text{MCC} = \\frac{TP \\times TN - FP \\times FN}{\\sqrt{(TP+FP)(TP+FN)(TN+FP)(TN+FN)}}',
    plainFormula: '(TP*TN - FP*FN) / sqrt((TP+FP)*(TP+FN)*(TN+FP)*(TN+FN))',
    description: 'A correlation coefficient between observed and predicted binary classifications that incorporates all four confusion matrix quadrants.',
    interpretation: '+1.0 = perfect prediction, 0.0 = no better than random coin toss, -1.0 = total disagreement.',
    whenToUse: 'Gold standard for imbalanced binary classification; avoids the misleading optimism of Accuracy or F1.',
    whenToAvoid: 'Multiclass problems without macro-averaging, or when communicating to non-technical stakeholders.',
    workedExample: {
      inputs: { TP: 45, TN: 43, FP: 7, FN: 5 },
      steps: [
        'Numerator = (45*43) - (7*5) = 1935 - 35 = 1900',
        'Denom = sqrt(52 * 50 * 50 * 48) = sqrt(6,240,000) = 2497.999',
        'MCC = 1900 / 2497.999 = 0.7606',
      ],
      result: '+0.761',
    },
    pythonCode: `from sklearn.metrics import matthews_corrcoef
mcc = matthews_corrcoef(y_true, y_pred)`,
  },
  {
    id: 'log_loss',
    name: 'Log Loss (Binary Cross-Entropy)',
    shortName: 'LOGLOSS',
    category: 'classification',
    value: 0.285,
    formattedValue: '0.285',
    range: '[0.0, +inf)',
    ideal: '0.0',
    formulaLatex: '\\mathcal{L}_{\\log} = -\\frac{1}{N} \\sum_{i=1}^{N} [y_i \\ln p_i + (1 - y_i) \\ln (1 - p_i)]',
    plainFormula: '-1/N * sum(y*log(p) + (1-y)*log(1-p))',
    description: 'Quantifies the accuracy of a classifier by penalizing false certainty. Heavily penalizes predictions that are confident and wrong.',
    interpretation: 'Lower is better. A model predicting 0.99 for a sample that is actually 0 receives a massive penalty.',
    whenToUse: 'When probabilistic calibration matters (e.g. betting odds, credit underwriting, expected value calculation).',
    whenToAvoid: 'When only hard rank order or thresholded labels are required.',
    workedExample: {
      inputs: { Samples: 3, TrueLabels: [1, 0, 1], PredProbs: [0.9, 0.1, 0.8] },
      steps: [
        'Sample 1: -ln(0.9) = 0.105',
        'Sample 2: -ln(1 - 0.1) = 0.105',
        'Sample 3: -ln(0.8) = 0.223',
        'Average = (0.105 + 0.105 + 0.223) / 3 = 0.144',
      ],
      result: '0.285 (across 100 dataset instances)',
    },
    pythonCode: `from sklearn.metrics import log_loss
loss = log_loss(y_true, y_probs)`,
  },
];

export const mockClassificationSamples: ClassificationSample[] = [
  { id: 'S-01', sampleName: 'Patient #1049 (Chest X-Ray)', trueLabel: 1, predictedProbability: 0.94, featureSummary: 'High opacity, fever 39C, elevated CRP' },
  { id: 'S-02', sampleName: 'Patient #1050 (Biopsy Scan)', trueLabel: 1, predictedProbability: 0.88, featureSummary: 'Irregular nuclear margin, mitotic figure 4' },
  { id: 'S-03', sampleName: 'Patient #1051 (Blood Panel)', trueLabel: 1, predictedProbability: 0.82, featureSummary: 'D-dimer 4.2 ug/mL, troponin normal' },
  { id: 'S-04', sampleName: 'Patient #1052 (CT Contrast)', trueLabel: 1, predictedProbability: 0.77, featureSummary: 'Nodule 8mm left upper lobe, calcification 0' },
  { id: 'S-05', sampleName: 'Patient #1053 (MRI Brain)', trueLabel: 1, predictedProbability: 0.69, featureSummary: 'T2 hyperintensity, mild perilesional edema' },
  { id: 'S-06', sampleName: 'Patient #1054 (Ultrasound)', trueLabel: 1, predictedProbability: 0.54, featureSummary: 'Heterogeneous echotexture, smooth wall' },
  { id: 'S-07', sampleName: 'Patient #1055 (ECG Waveform)', trueLabel: 1, predictedProbability: 0.42, featureSummary: 'ST depression 0.5mm, borderline QTc' }, // False Negative at 0.5
  { id: 'S-08', sampleName: 'Patient #1056 (Spinal Tap)', trueLabel: 1, predictedProbability: 0.38, featureSummary: 'WBC 12/uL, protein normal, viral panel pending' }, // FN
  { id: 'S-09', sampleName: 'Patient #1057 (Skin Dermoscopy)', trueLabel: 1, predictedProbability: 0.91, featureSummary: 'Asymmetric border, multi-color pigment' },
  { id: 'S-10', sampleName: 'Patient #1058 (Histology Slide)', trueLabel: 1, predictedProbability: 0.73, featureSummary: 'Glandular architecture loss, grade 2' },
  { id: 'S-11', sampleName: 'Patient #1059 (Routine Checkup)', trueLabel: 0, predictedProbability: 0.62, featureSummary: 'Slight fatigue, normal hemogram, elevated BMI' }, // False Positive at 0.5
  { id: 'S-12', sampleName: 'Patient #1060 (Mammography)', trueLabel: 0, predictedProbability: 0.58, featureSummary: 'Benign microcalcifications, BIRADS 2' }, // FP at 0.5
  { id: 'S-13', sampleName: 'Patient #1061 (Echo Cardiogram)', trueLabel: 0, predictedProbability: 0.48, featureSummary: 'EF 62%, normal wall motion, trace MR' },
  { id: 'S-14', sampleName: 'Patient #1062 (Retinal Scan)', trueLabel: 0, predictedProbability: 0.31, featureSummary: 'Optic disc cup/ratio 0.3, sharp margins' },
  { id: 'S-15', sampleName: 'Patient #1063 (Pulmonary Function)', trueLabel: 0, predictedProbability: 0.22, featureSummary: 'FEV1/FVC 84%, normal diffusion capacity' },
  { id: 'S-16', sampleName: 'Patient #1064 (Genetic Assay)', trueLabel: 0, predictedProbability: 0.17, featureSummary: 'Wild-type alleles, zero pathogenic SNVs' },
  { id: 'S-17', sampleName: 'Patient #1065 (Renal Ultrasound)', trueLabel: 0, predictedProbability: 0.12, featureSummary: 'Normal cortical thickness, no hydronephrosis' },
  { id: 'S-18', sampleName: 'Patient #1066 (Thyroid Panel)', trueLabel: 0, predictedProbability: 0.08, featureSummary: 'TSH 1.8 mIU/L, Free T4 1.2 ng/dL' },
  { id: 'S-19', sampleName: 'Patient #1067 (Liver Elastography)', trueLabel: 0, predictedProbability: 0.05, featureSummary: 'Stiffness 4.1 kPa, F0 fibrosis score' },
  { id: 'S-20', sampleName: 'Patient #1068 (Holter Monitor)', trueLabel: 0, predictedProbability: 0.03, featureSummary: 'Normal sinus rhythm, 0 pauses > 2.0s' },
];

// ==========================================
// 2. REGRESSION MOCK DATA & DEFINITIONS
// ==========================================

export const regressionMetricsList: MetricDefinition[] = [
  {
    id: 'mse',
    name: 'Mean Squared Error (MSE)',
    shortName: 'MSE',
    category: 'regression',
    value: 14.82,
    formattedValue: '14.82',
    range: '[0.0, +inf)',
    ideal: '0.0',
    formulaLatex: '\\text{MSE} = \\frac{1}{n} \\sum_{i=1}^{n} (y_i - \\hat{y}_i)^2',
    plainFormula: '1/n * sum((y - y_hat)^2)',
    description: 'Average squared difference between the estimated values and the actual target values.',
    interpretation: 'Because residuals are squared, large errors are penalized exponentially harder than small errors.',
    whenToUse: 'When large errors are especially hazardous and should be heavily penalized during optimization.',
    whenToAvoid: 'When data contains extreme anomalies/outliers that should not distort model training.',
    workedExample: {
      inputs: { 'Actuals y': '[10, 20, 30]', 'Predictions y_hat': '[12, 18, 33]' },
      steps: [
        'Residuals = [-2, 2, -3]',
        'Squared residuals = [4, 4, 9]',
        'Sum = 17, n = 3',
        'MSE = 17 / 3 = 5.67',
      ],
      result: '14.82 (on evaluation set)',
    },
    pythonCode: `from sklearn.metrics import mean_squared_error
mse = mean_squared_error(y_true, y_pred)`,
  },
  {
    id: 'rmse',
    name: 'Root Mean Squared Error (RMSE)',
    shortName: 'RMSE',
    category: 'regression',
    value: 3.85,
    formattedValue: '3.85 units',
    unit: 'same as y',
    range: '[0.0, +inf)',
    ideal: '0.0',
    formulaLatex: '\\text{RMSE} = \\sqrt{\\frac{1}{n} \\sum_{i=1}^{n} (y_i - \\hat{y}_i)^2}',
    plainFormula: 'sqrt(MSE)',
    description: 'Square root of MSE. Brings the error metric back to the exact same physical unit of measurement as the target variable.',
    interpretation: 'Directly interpretable: e.g. "Predictions deviate by an average quadratic distance of 3.85k dollars".',
    whenToUse: 'General-purpose regression reporting where interpretability in target units is required alongside sensitivity to outliers.',
    whenToAvoid: 'When you want a pure linear penalty without disproportionate outlier scaling (use MAE instead).',
    workedExample: {
      inputs: { MSE: 14.82 },
      steps: ['RMSE = sqrt(14.82) = 3.8496'],
      result: '3.85',
    },
    pythonCode: `from sklearn.metrics import root_mean_squared_error
rmse = root_mean_squared_error(y_true, y_pred)`,
  },
  {
    id: 'mae',
    name: 'Mean Absolute Error (MAE)',
    shortName: 'MAE',
    category: 'regression',
    value: 2.74,
    formattedValue: '2.74 units',
    unit: 'same as y',
    range: '[0.0, +inf)',
    ideal: '0.0',
    formulaLatex: '\\text{MAE} = \\frac{1}{n} \\sum_{i=1}^{n} |y_i - \\hat{y}_i|',
    plainFormula: '1/n * sum(|y - y_hat|)',
    description: 'Average magnitude of errors in a set of predictions, without considering their direction.',
    interpretation: 'Robust to outliers. Treats a 10-unit error exactly twice as severe as a 5-unit error (linear penalty).',
    whenToUse: 'When dataset has known extreme outliers or when the cost of an error scales linearly.',
    whenToAvoid: 'When rare catastrophic large errors are much worse than frequent small errors.',
    workedExample: {
      inputs: { 'Actuals y': '[10, 20, 30]', 'Predictions y_hat': '[12, 18, 33]' },
      steps: [
        'Absolute errors = [|-2|, |2|, |-3|] = [2, 2, 3]',
        'Sum = 7, n = 3',
        'MAE = 7 / 3 = 2.33',
      ],
      result: '2.74',
    },
    pythonCode: `from sklearn.metrics import mean_absolute_error
mae = mean_absolute_error(y_true, y_pred)`,
  },
  {
    id: 'r2',
    name: 'R² (Coefficient of Determination)',
    shortName: 'R²',
    category: 'regression',
    value: 0.912,
    formattedValue: '0.912',
    range: '(-inf, 1.0]',
    ideal: '1.0',
    formulaLatex: 'R^2 = 1 - \\frac{SS_{\\text{res}}}{SS_{\\text{tot}}} = 1 - \\frac{\\sum (y_i - \\hat{y}_i)^2}{\\sum (y_i - \\bar{y})^2}',
    plainFormula: '1 - (SS_res / SS_tot)',
    description: 'Proportion of variance in the dependent variable that is predictable from the independent variables.',
    interpretation: '0.912 means 91.2% of target variance is explained by the model. 0 = baseline predicting the mean. Negative = worse than mean.',
    whenToUse: 'To understand relative explanatory power across different datasets with different scales.',
    whenToAvoid: 'Non-linear regression where traditional R² interpretations break, or comparing models with vastly different feature counts.',
    workedExample: {
      inputs: { SS_res: 296.4, SS_tot: 3368.2 },
      steps: [
        'Unexplained variance ratio = 296.4 / 3368.2 = 0.088',
        'R^2 = 1 - 0.088 = 0.912',
      ],
      result: '0.912 (91.2% explained)',
    },
    pythonCode: `from sklearn.metrics import r2_score
r2 = r2_score(y_true, y_pred)`,
  },
  {
    id: 'mape',
    name: 'Mean Absolute Percentage Error (MAPE)',
    shortName: 'MAPE',
    category: 'regression',
    value: 6.8,
    formattedValue: '6.8%',
    unit: '%',
    range: '[0.0, +inf)',
    ideal: '0.0%',
    formulaLatex: '\\text{MAPE} = \\frac{100\\%}{n} \\sum_{i=1}^{n} \\left| \\frac{y_i - \\hat{y}_i}{y_i} \\right|',
    plainFormula: '100% / n * sum(|(y - y_hat) / y|)',
    description: 'Measures prediction accuracy as a percentage. Intuitive for business stakeholders (e.g. inventory forecasts).',
    interpretation: 'A MAPE of 6.8% means on average the model is off by 6.8% of the real value.',
    whenToUse: 'Business reporting, demand planning, and sales forecasting where error relative to volume matters.',
    whenToAvoid: 'When actual values y can be zero or near-zero (causes division by zero or infinite spikes).',
    workedExample: {
      inputs: { 'Actuals y': '[100, 200]', 'Predictions y_hat': '[105, 190]' },
      steps: [
        'Pct Error 1 = |100 - 105| / 100 = 5.0%',
        'Pct Error 2 = |200 - 190| / 200 = 5.0%',
        'Average MAPE = 5.0%',
      ],
      result: '6.8%',
    },
    pythonCode: `from sklearn.metrics import mean_absolute_percentage_error
mape = mean_absolute_percentage_error(y_true, y_pred) * 100`,
  },
  {
    id: 'huber',
    name: 'Huber Loss (Smooth L1)',
    shortName: 'HUBER',
    category: 'regression',
    value: 2.15,
    formattedValue: '2.15 (δ=1.5)',
    range: '[0.0, +inf)',
    ideal: '0.0',
    formulaLatex: 'L_{\\delta}(e) = \\begin{cases} \\frac{1}{2} e^2 & \\text{for } |e| \\le \\delta \\\\ \\delta (|e| - \\frac{1}{2}\\delta) & \\text{otherwise} \\end{cases}',
    plainFormula: '0.5*e^2 if |e|<=delta else delta*(|e| - 0.5*delta)',
    description: 'Hybrid loss that is quadratic for small residuals (like MSE) and linear for large residuals (like MAE).',
    interpretation: 'Combines the smooth differentiability of MSE near zero with the robust outlier resistance of MAE.',
    whenToUse: 'Robust regression where standard MSE overreacts to heavy-tailed noise.',
    whenToAvoid: 'When delta parameter tuning is undesired or when stakeholders require standard target unit interpretability.',
    workedExample: {
      inputs: { residual: 4.0, delta: 1.5 },
      steps: [
        '|e| = 4.0 > delta (1.5) -> linear regime applies',
        'Loss = 1.5 * (4.0 - 0.5 * 1.5) = 1.5 * 3.25 = 4.875',
      ],
      result: '2.15 average',
    },
    pythonCode: `import numpy as np
# Huber loss calculation
residual = y_true - y_pred
delta = 1.5
huber = np.where(np.abs(residual) <= delta, 0.5 * residual**2, delta * (np.abs(residual) - 0.5 * delta)).mean()`,
  },
];

export const mockRegressionSamples: RegressionSample[] = [
  { id: 'R-01', featureInfo: 'Beds: 4, Baths: 3, SqFt: 2850, Zip: 94107', actual: 125.0, predicted: 122.4 },
  { id: 'R-02', featureInfo: 'Beds: 3, Baths: 2, SqFt: 1950, Zip: 94110', actual: 98.5, predicted: 99.1 },
  { id: 'R-03', featureInfo: 'Beds: 2, Baths: 2, SqFt: 1420, Zip: 94103', actual: 82.0, predicted: 85.3 },
  { id: 'R-04', featureInfo: 'Beds: 5, Baths: 4, SqFt: 3600, Zip: 94118', actual: 185.0, predicted: 181.2 },
  { id: 'R-05', featureInfo: 'Beds: 1, Baths: 1, SqFt: 780, Zip: 94109', actual: 52.0, predicted: 54.8 },
  { id: 'R-06', featureInfo: 'Beds: 3, Baths: 2.5, SqFt: 2100, Zip: 94114', actual: 115.0, predicted: 111.0 },
  { id: 'R-07', featureInfo: 'Beds: 4, Baths: 3.5, SqFt: 3100, Zip: 94123', actual: 165.0, predicted: 169.5 },
  { id: 'R-08', featureInfo: 'Beds: 2, Baths: 1, SqFt: 1150, Zip: 94112', actual: 68.0, predicted: 66.2 },
  { id: 'R-09', featureInfo: 'Beds: 3, Baths: 2, SqFt: 1800, Zip: 94122', actual: 94.0, predicted: 92.5 },
  { id: 'R-10', featureInfo: 'Beds: 4, Baths: 3, SqFt: 2650, Zip: 94116', actual: 130.0, predicted: 133.7 },
  { id: 'R-11', featureInfo: 'Beds: 2, Baths: 2, SqFt: 1350, Zip: 94108', actual: 79.0, predicted: 77.8 },
  { id: 'R-12', featureInfo: 'Beds: 5, Baths: 5, SqFt: 4200, Zip: 94115', actual: 230.0, predicted: 224.0 },
  { id: 'R-13', featureInfo: 'Beds: 1, Baths: 1, SqFt: 690, Zip: 94102', actual: 48.0, predicted: 50.1 },
  { id: 'R-14', featureInfo: 'Beds: 3, Baths: 2, SqFt: 1720, Zip: 94131', actual: 91.0, predicted: 89.4 },
  { id: 'R-15', featureInfo: 'Beds: 4, Baths: 4, SqFt: 3300, Zip: 94127', actual: 172.0, predicted: 168.0 },
];

// ==========================================
// 3. OBJECT DETECTION MOCK DATA & DEFINITIONS
// ==========================================

export const objectDetectionMetricsList: MetricDefinition[] = [
  {
    id: 'iou',
    name: 'Intersection over Union (Jaccard Index)',
    shortName: 'IoU',
    category: 'object-detection',
    value: 0.785,
    formattedValue: '0.785',
    range: '[0.0, 1.0]',
    ideal: '1.0 (Exact Box Match)',
    formulaLatex: '\\text{IoU} = \\frac{\\text{Area}(\\text{Box}_p \\cap \\text{Box}_{gt})}{\\text{Area}(\\text{Box}_p \\cup \\text{Box}_{gt})}',
    plainFormula: 'Area(Overlap) / Area(Union)',
    description: 'Quantifies the overlap between the predicted bounding box and the ground truth annotation.',
    interpretation: 'A prediction is usually considered a True Positive if its IoU >= 0.50 (VOC benchmark) or >= 0.75 (Strict benchmark).',
    whenToUse: 'Fundamental thresholding criterion for matching candidate detections to real ground truth objects.',
    whenToAvoid: 'When evaluating detection without bounding coordinates (classification only).',
    workedExample: {
      inputs: { BoxPred: '[20, 30, 100, 80]', BoxGT: '[25, 35, 95, 75]', OverlapArea: 5700, UnionArea: 7260 },
      steps: [
        'Area of Box Pred = 100 * 80 = 8000',
        'Area of Box GT = 95 * 75 = 7125',
        'Intersection Area = 5700',
        'Union Area = 8000 + 7125 - 5700 = 9425',
        'IoU = 5700 / 9425 = 0.6048',
      ],
      result: '0.785 (mean across benchmark)',
    },
    pythonCode: `def bbox_iou(box1, box2):
    # box format: [x1, y1, x2, y2]
    xi1, yi1 = max(box1[0], box2[0]), max(box1[1], box2[1])
    xi2, yi2 = min(box1[2], box2[2]), min(box1[3], box2[3])
    inter_area = max(0, xi2 - xi1) * max(0, yi2 - yi1)
    b1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
    b2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union_area = b1_area + b2_area - inter_area
    return inter_area / union_area if union_area > 0 else 0`,
  },
  {
    id: 'map_50',
    name: 'mAP@0.50 (PASCAL VOC Metric)',
    shortName: 'mAP@.50',
    category: 'object-detection',
    value: 0.842,
    formattedValue: '84.2%',
    range: '[0.0, 1.0]',
    ideal: '1.0',
    formulaLatex: '\\text{mAP} = \\frac{1}{C} \\sum_{c=1}^{C} \\text{AP}_c^{(0.50)}',
    plainFormula: 'Mean of Average Precision across all classes with IoU >= 0.50 threshold',
    description: 'Average Precision calculated with an IoU threshold of 0.50, averaged across all object categories.',
    interpretation: 'Allows modest bounding box looseness as long as the object is captured and recognized.',
    whenToUse: 'Standard benchmark for general object localization where pixel-perfect boundary tightness is not mission-critical.',
    whenToAvoid: 'Robotics grasping, surgical tool guidance, or manufacturing where 50% overlap is dangerously sloppy.',
    workedExample: {
      inputs: { 'AP Person': 0.88, 'AP Car': 0.86, 'AP Dog': 0.786 },
      steps: [
        'Sum AP = 0.88 + 0.86 + 0.786 = 2.526',
        'Classes C = 3',
        'mAP@0.50 = 2.526 / 3 = 0.842',
      ],
      result: '84.2%',
    },
    pythonCode: `from torchmetrics.detection.mean_ap import MeanAveragePrecision
metric = MeanAveragePrecision(iou_thresholds=[0.5])
metric.update(preds, target)
print(metric.compute()['map_50'])`,
  },
  {
    id: 'map_coco',
    name: 'mAP@[0.50:0.95] (COCO Primary Benchmark)',
    shortName: 'mAP@[.5:.95]',
    category: 'object-detection',
    value: 0.628,
    formattedValue: '62.8%',
    range: '[0.0, 1.0]',
    ideal: '1.0',
    formulaLatex: '\\text{mAP}_{@[.5:.95]} = \\frac{1}{10} \\sum_{t \\in \\{0.50, 0.55, \\dots, 0.95\\}} \\text{mAP}_t',
    plainFormula: 'Average of mAP evaluated at 10 IoU thresholds from 0.50 to 0.95 with step 0.05',
    description: 'The gold standard benchmark for modern computer vision detectors (YOLO, Faster R-CNN, DETR).',
    interpretation: 'Rigorously rewards models that deliver tight, millimeter-precise bounding boxes without jitter.',
    whenToUse: 'Benchmarking modern object detectors against state-of-the-art vision models.',
    whenToAvoid: 'Low-resolution surveillance feeds where precise box boundaries cannot physically be resolved.',
    workedExample: {
      inputs: { 'mAP@0.50': 0.842, 'mAP@0.75': 0.684, 'mAP@0.95': 0.215 },
      steps: [
        'Calculate AP for IoU thresholds [0.50, 0.55, 0.60, ..., 0.95]',
        'Average across all 10 thresholds and all classes',
      ],
      result: '0.628 (62.8%)',
    },
    pythonCode: `from torchmetrics.detection.mean_ap import MeanAveragePrecision
metric = MeanAveragePrecision() # default tests 0.50:0.05:0.95
metric.update(preds, target)
print(metric.compute()['map'])`,
  },
  {
    id: 'ap_interpolated',
    name: '11-Point Interpolated AP',
    shortName: 'AP-11',
    category: 'object-detection',
    value: 0.815,
    formattedValue: '0.815',
    range: '[0.0, 1.0]',
    ideal: '1.0',
    formulaLatex: '\\text{AP} = \\frac{1}{11} \\sum_{r \\in \\{0, 0.1, \\dots, 1.0\\}} \\max_{\\tilde{r} \\ge r} p(\\tilde{r})',
    plainFormula: '1/11 * sum(max_precision_at_recall_r for r in [0.0, 0.1, ..., 1.0])',
    description: 'Interpolates precision at 11 equidistant recall levels to remove the wiggles and noise in empirical PR curves.',
    interpretation: 'Approximates the area under the PR curve by taking maximum precision achievable at or above each recall step.',
    whenToUse: 'Historical Pascal VOC evaluation protocols and educational demonstrations of ranking metrics.',
    whenToAvoid: 'Modern COCO reporting (which prefers continuous integration across all observed recall points).',
    workedExample: {
      inputs: { RecallLevels: '0.0, 0.1, ..., 1.0', SamplePrecisions: '[1.0, 0.95, 0.92, ...]' },
      steps: [
        'Sample maximum precision at each recall bin',
        'Average the 11 maximum precisions',
      ],
      result: '0.815',
    },
    pythonCode: `# 11-point interpolation in Python
recall_levels = np.linspace(0.0, 1.0, 11)
ap = sum([np.max(precision[recall >= r]) if np.any(recall >= r) else 0 for r in recall_levels]) / 11`,
  },
];

export const mockDetections: DetectionSample[] = [
  { id: 'DET-01', imageName: 'traffic_cam_01.jpg', category: 'Pedestrian', confidence: 0.96, iouWithGroundTruth: 0.88, isTruePositive: true, boundingBox: [120, 80, 60, 140], groundTruthBox: [122, 78, 58, 144] },
  { id: 'DET-02', imageName: 'traffic_cam_01.jpg', category: 'Sedan', confidence: 0.92, iouWithGroundTruth: 0.82, isTruePositive: true, boundingBox: [220, 150, 180, 95], groundTruthBox: [215, 148, 185, 98] },
  { id: 'DET-03', imageName: 'traffic_cam_02.jpg', category: 'Bicycle', confidence: 0.89, iouWithGroundTruth: 0.74, isTruePositive: true, boundingBox: [60, 200, 70, 80], groundTruthBox: [65, 195, 68, 85] },
  { id: 'DET-04', imageName: 'traffic_cam_02.jpg', category: 'Bus', confidence: 0.84, iouWithGroundTruth: 0.79, isTruePositive: true, boundingBox: [310, 60, 220, 160], groundTruthBox: [305, 58, 228, 164] },
  { id: 'DET-05', imageName: 'traffic_cam_03.jpg', category: 'Traffic Light', confidence: 0.78, iouWithGroundTruth: 0.65, isTruePositive: true, boundingBox: [180, 20, 25, 55], groundTruthBox: [182, 18, 24, 58] },
  { id: 'DET-06', imageName: 'traffic_cam_03.jpg', category: 'Pedestrian', confidence: 0.71, iouWithGroundTruth: 0.38, isTruePositive: false, boundingBox: [450, 190, 50, 120], groundTruthBox: [465, 180, 45, 130] }, // Localization error (IoU < 0.5)
  { id: 'DET-07', imageName: 'traffic_cam_04.jpg', category: 'Fire Hydrant', confidence: 0.64, iouWithGroundTruth: 0.00, isTruePositive: false, boundingBox: [30, 260, 30, 40], groundTruthBox: [0, 0, 0, 0] }, // Background False Positive
  { id: 'DET-08', imageName: 'traffic_cam_04.jpg', category: 'Sedan', confidence: 0.59, iouWithGroundTruth: 0.72, isTruePositive: true, boundingBox: [150, 170, 160, 90], groundTruthBox: [148, 168, 164, 92] },
];

// ==========================================
// 4. SEGMENTATION MOCK DATA & DEFINITIONS
// ==========================================

export const segmentationMetricsList: MetricDefinition[] = [
  {
    id: 'miou',
    name: 'Mean Intersection over Union (mIoU / Jaccard)',
    shortName: 'mIoU',
    category: 'segmentation',
    value: 0.764,
    formattedValue: '76.4%',
    range: '[0.0, 1.0]',
    ideal: '1.0',
    formulaLatex: '\\text{mIoU} = \\frac{1}{K} \\sum_{k=1}^{K} \\frac{\\text{TP}_k}{\\text{TP}_k + \\text{FP}_k + \\text{FN}_k}',
    plainFormula: '1/K * sum(Intersection_k / Union_k)',
    description: 'Averages the Jaccard Index across all semantic classes, treating every class with equal priority regardless of pixel area.',
    interpretation: 'The standard benchmark metric for semantic segmentation. Penalizes both under-segmentation (missed pixels) and over-segmentation (leaks).',
    whenToUse: 'Primary metric for semantic segmentation benchmarks (Cityscapes, ADE20K, Pascal Context).',
    whenToAvoid: 'When tiny critical structures (e.g. 1-pixel cracks, capillaries) are overwhelmed by boundary discretization error.',
    workedExample: {
      inputs: { Road_IoU: 0.942, Vehicle_IoU: 0.814, Pedestrian_IoU: 0.622, Sidewalk_IoU: 0.678 },
      steps: [
        'Sum IoU = 0.942 + 0.814 + 0.622 + 0.678 = 3.056',
        'Num classes K = 4',
        'mIoU = 3.056 / 4 = 0.764 (76.4%)',
      ],
      result: '76.4%',
    },
    pythonCode: `import torch
from torchmetrics.segmentation import MeanIoU
metric = MeanIoU(num_classes=5)
miou = metric(preds, targets)`,
  },
  {
    id: 'dice',
    name: 'Dice Similarity Coefficient (DSC / F1-Score)',
    shortName: 'Dice (DSC)',
    category: 'segmentation',
    value: 0.852,
    formattedValue: '0.852',
    range: '[0.0, 1.0]',
    ideal: '1.0',
    formulaLatex: '\\text{DSC} = \\frac{2 |A \\cap B|}{|A| + |B|} = \\frac{2\\text{TP}}{2\\text{TP} + \\text{FP} + \\text{FN}} = \\frac{2 \\times \\text{IoU}}{1 + \\text{IoU}}',
    plainFormula: '2 * Intersection / (AreaA + AreaB)',
    description: 'Harmonic mean of pixel precision and recall. Mathematically closely related to IoU, but always yields a higher numerical score.',
    interpretation: 'Commonly preferred in biomedical imaging (BraTS, ISIC) because it places twice the weight on true positive overlap.',
    whenToUse: 'Medical imaging, tumor boundary segmentation, lesion tracking.',
    whenToAvoid: 'Comparing directly to IoU without noting the mathematical transformation DSC = 2*IoU / (1 + IoU).',
    workedExample: {
      inputs: { TP: 4500, FP: 600, FN: 800 },
      steps: [
        '2 * TP = 9000',
        'Denominator = 2(4500) + 600 + 800 = 10400',
        'Dice = 9000 / 10400 = 0.865',
      ],
      result: '0.852 (mean DSC)',
    },
    pythonCode: `from torchmetrics.segmentation import GeneralizedDiceScore
dice_metric = GeneralizedDiceScore(num_classes=5)
dice = dice_metric(preds, targets)`,
  },
  {
    id: 'pixel_accuracy',
    name: 'Pixel Accuracy',
    shortName: 'Pixel Acc',
    category: 'segmentation',
    value: 0.938,
    formattedValue: '93.8%',
    range: '[0.0, 1.0]',
    ideal: '1.0',
    formulaLatex: '\\text{PixelAcc} = \\frac{\\sum_{i} \\text{Correct Pixels}_i}{\\text{Total Pixels}}',
    plainFormula: 'Total Correct Pixels / Total Image Pixels',
    description: 'Proportion of correctly classified pixels regardless of which class they belong to.',
    interpretation: 'Can look deceptively high if the background class covers 90% of the image.',
    whenToUse: 'Rough sanity check to ensure the model produces plausible overall masks.',
    whenToAvoid: 'Evaluating small target segmentation (e.g. skin lesion covering 2% of the image; predicting background everywhere yields 98% accuracy).',
    workedExample: {
      inputs: { CorrectPixels: 1966080, TotalPixels: 2073600 },
      steps: ['1966080 / 2073600 = 0.9481 (94.8%)'],
      result: '93.8%',
    },
    pythonCode: `correct = (preds == targets).sum()
total = targets.numel()
pixel_acc = correct.float() / total`,
  },
  {
    id: 'boundary_iou',
    name: 'Boundary IoU',
    shortName: 'Bound-IoU',
    category: 'segmentation',
    value: 0.691,
    formattedValue: '0.691 (d=3px)',
    range: '[0.0, 1.0]',
    ideal: '1.0',
    formulaLatex: '\\text{Boundary-IoU} = \\frac{|(G_d \\cap G) \\cap (P_d \\cap P)|}{|(G_d \\cap G) \\cup (P_d \\cap P)|}',
    plainFormula: 'IoU computed strictly within a boundary band of width d pixels',
    description: 'Computes IoU strictly on the edge/contour pixels within distance d, ignoring easy interior pixels.',
    interpretation: 'Reveals whether the model captures sharp contours or produces blurry, smoothed edges.',
    whenToUse: 'High-precision instance segmentation, matting, hair/cloth boundaries.',
    whenToAvoid: 'Coarse low-resolution feature maps where boundary width exceeds object diameter.',
    workedExample: {
      inputs: { BoundaryBandWidth: '3 pixels', BoundaryOverlap: 3400, BoundaryUnion: 4920 },
      steps: ['3400 / 4920 = 0.691'],
      result: '0.691',
    },
    pythonCode: `# Boundary IoU computes mask contour dilation band IoU
from scipy.ndimage import binary_dilation
# Extract boundary band and compute intersection over union`,
  },
];

export const mockSegmentationClasses: SegmentationClassRow[] = [
  { classId: 1, className: 'Road Surface', color: '#6366f1', groundTruthPixels: 524000, predictedPixels: 518000, intersectionPixels: 498000, unionPixels: 544000, iou: 0.915, dice: 0.956, pixelAccuracy: 0.978, weight: 0.45 },
  { classId: 2, className: 'Vehicles', color: '#10b981', groundTruthPixels: 148000, predictedPixels: 152000, intersectionPixels: 128000, unionPixels: 172000, iou: 0.744, dice: 0.853, pixelAccuracy: 0.952, weight: 0.20 },
  { classId: 3, className: 'Pedestrians', color: '#f59e0b', groundTruthPixels: 24000, predictedPixels: 22500, intersectionPixels: 16800, unionPixels: 29700, iou: 0.566, dice: 0.723, pixelAccuracy: 0.988, weight: 0.05 },
  { classId: 4, className: 'Sidewalk / Curbs', color: '#ec4899', groundTruthPixels: 185000, predictedPixels: 178000, intersectionPixels: 139000, unionPixels: 224000, iou: 0.621, dice: 0.766, pixelAccuracy: 0.924, weight: 0.18 },
  { classId: 5, className: 'Vegetation / Trees', color: '#06b6d4', groundTruthPixels: 119000, predictedPixels: 129500, intersectionPixels: 104000, unionPixels: 144500, iou: 0.720, dice: 0.837, pixelAccuracy: 0.945, weight: 0.12 },
];

// ==========================================
// 5. LLM EVALUATION MOCK DATA & DEFINITIONS
// ==========================================

export const llmMetricsList: MetricDefinition[] = [
  {
    id: 'perplexity',
    name: 'Perplexity (PPL)',
    shortName: 'PPL',
    category: 'llm',
    value: 12.4,
    formattedValue: '12.4',
    range: '[1.0, +inf)',
    ideal: 'Lower is better (1.0 = perfect prediction)',
    formulaLatex: '\\text{PPL} = \\exp\\left(-\\frac{1}{N}\\sum_{i=1}^N \\ln P(w_i \\mid w_1, \\dots, w_{i-1})\\right) = \\exp(\\mathcal{L}_{\\text{CE}})',
    plainFormula: 'exp(CrossEntropyLoss)',
    description: 'Exponentiated cross-entropy loss. Intuitively represents the effective branching factor / number of words the model is uncertain between.',
    interpretation: 'A PPL of 12.4 means on each step the model is as confused as choosing uniformly between ~12 equally likely words.',
    whenToUse: 'Measuring native language modeling fluently, pre-training loss tracking, and domain adaptation fit.',
    whenToAvoid: 'Comparing models with different tokenizers (vocabulary size differences corrupt raw PPL comparisons).',
    workedExample: {
      inputs: { AverageCrossEntropyLoss: 2.518 },
      steps: [
        'L_CE = 2.518',
        'PPL = exp(2.518) = 12.403',
      ],
      result: '12.4',
    },
    pythonCode: `import torch
import math
# Compute per-token cross entropy loss then take exponential
loss = torch.nn.functional.cross_entropy(logits.view(-1, vocab_size), targets.view(-1))
ppl = math.exp(loss.item())`,
  },
  {
    id: 'bleu',
    name: 'BLEU-4 (Bilingual Evaluation Understudy)',
    shortName: 'BLEU-4',
    category: 'llm',
    value: 0.428,
    formattedValue: '42.8 / 100',
    range: '[0.0, 1.0] or [0, 100]',
    ideal: '1.0 (Exact Match)',
    formulaLatex: '\\text{BLEU} = \\text{BP} \\times \\exp\\left( \\sum_{n=1}^4 w_n \\ln p_n \\right), \\quad \\text{BP} = \\min(1, e^{1 - r/c})',
    plainFormula: 'BrevityPenalty * exp(0.25*ln(p1) + 0.25*ln(p2) + 0.25*ln(p3) + 0.25*ln(p4))',
    description: 'Measures modified n-gram precision between candidate text and reference translation, penalized if the output is too short.',
    interpretation: 'Standard in machine translation. Over 30 is good, over 40 is high quality, over 50 is near fluent reference.',
    whenToUse: 'Machine translation, code generation translation, constrained paraphrasing.',
    whenToAvoid: 'Creative writing, open-ended summarization, or dialogue where multiple diverse phrasings are equally valid.',
    workedExample: {
      inputs: { p1: 0.72, p2: 0.54, p3: 0.39, p4: 0.28, BrevityPenalty: 1.0 },
      steps: [
        'Geometric mean = (0.72 * 0.54 * 0.39 * 0.28)^(1/4) = 0.428',
        'BLEU-4 = 1.0 * 0.428 = 0.428 (42.8)',
      ],
      result: '42.8',
    },
    pythonCode: `import evaluate
bleu = evaluate.load("bleu")
results = bleu.compute(predictions=predictions, references=references)`,
  },
  {
    id: 'rouge_l',
    name: 'ROUGE-L (Longest Common Subsequence)',
    shortName: 'ROUGE-L',
    category: 'llm',
    value: 0.584,
    formattedValue: '0.584',
    range: '[0.0, 1.0]',
    ideal: '1.0',
    formulaLatex: 'R_{\\text{LCS}} = \\frac{\\text{LCS}(\\text{Ref}, \\text{Cand})}{m}, \\quad P_{\\text{LCS}} = \\frac{\\text{LCS}(\\text{Ref}, \\text{Cand})}{n}, \\quad F_{\\text{LCS}} = \\frac{(1 + \\beta^2) R P}{R + \\beta^2 P}',
    plainFormula: 'F1 of Longest Common Subsequence length between Reference and Candidate',
    description: 'Evaluates n-gram recall and order preservation without requiring consecutive n-gram matches.',
    interpretation: 'Higher score indicates that the candidate preserved the sentence-level structure and primary concepts of the reference.',
    whenToUse: 'Text summarization, abstractive document synthesis, question answering.',
    whenToAvoid: 'When evaluating factual correctness independently of phrasing (use LLM-as-a-judge for factual consistency).',
    workedExample: {
      inputs: { ReferenceTokens: 20, CandidateTokens: 18, LCS_Length: 12 },
      steps: [
        'Recall = 12 / 20 = 0.60',
        'Precision = 12 / 18 = 0.667',
        'F1 = (2 * 0.60 * 0.667) / (0.60 + 0.667) = 0.631',
      ],
      result: '0.584',
    },
    pythonCode: `import evaluate
rouge = evaluate.load("rouge")
results = rouge.compute(predictions=predictions, references=references)
print(results["rougeL"])`,
  },
  {
    id: 'faithfulness',
    name: 'Faithfulness (RAG Triad / LLM-as-a-Judge)',
    shortName: 'Faithfulness',
    category: 'llm',
    value: 0.92,
    formattedValue: '92.0%',
    range: '[0.0, 1.0]',
    ideal: '1.0 (Zero Hallucination)',
    formulaLatex: '\\text{Faithfulness} = \\frac{\\text{Number of Claims Supported by Retrieved Context}}{\\text{Total Claims Extracted from Response}}',
    plainFormula: 'Supported Claims / Total Answer Claims',
    description: 'Evaluates whether all claims in the generated response can be directly inferred from the provided context without hallucinating.',
    interpretation: 'A score of 0.92 means 92% of the factual statements made by the model are directly grounded in the context.',
    whenToUse: 'Retrieval Augmented Generation (RAG), customer service bots, clinical decision support.',
    whenToAvoid: 'Open-ended brainstorming or creative story generation where grounded adherence is not intended.',
    workedExample: {
      inputs: { ExtractedClaims: 12, GroundedClaims: 11, Hallucinations: 1 },
      steps: [
        'Grounded claims = 11',
        'Total claims = 12',
        'Faithfulness = 11 / 12 = 0.9167 (91.7%)',
      ],
      result: '92.0%',
    },
    pythonCode: `# Using Ragas or G-Eval framework
from ragas.metrics import faithfulness
from ragas import evaluate
score = evaluate(dataset, metrics=[faithfulness])`,
  },
  {
    id: 'answer_relevance',
    name: 'Answer Relevance',
    shortName: 'Relevance',
    category: 'llm',
    value: 0.89,
    formattedValue: '89.0%',
    range: '[0.0, 1.0]',
    ideal: '1.0',
    formulaLatex: '\\text{Relevance} = \\frac{1}{K}\\sum_{k=1}^K \\cos(\\mathbf{e}_{\\text{original}}, \\mathbf{e}_{\\text{generated\\_question}_k})',
    plainFormula: 'Mean cosine similarity of reverse-generated questions to the original prompt',
    description: 'Quantifies whether the model directly addressed the user question or wandered off into irrelevant tangents.',
    interpretation: 'Penalizes evasive answers, generic filler intros, or incomplete responses that fail to address the core prompt.',
    whenToUse: 'Evaluating chatbot dialogue quality and search assistants.',
    whenToAvoid: 'When evaluating summarization of long multi-topic documents.',
    workedExample: {
      inputs: { Prompt: 'What is the speed of light?', Answer: 'The speed of light in vacuum is approx 299,792 km/s.' },
      steps: ['Reverse question generated matches original query semantics with 0.94 embedding similarity.'],
      result: '89.0%',
    },
    pythonCode: `from ragas.metrics import answer_relevancy
# Computes semantic similarity of generated answer back to question intent`,
  },
];

export const mockLLMEvals: LLMEvalSample[] = [
  {
    id: 'LLM-01',
    prompt: 'Summarize the primary purpose of backpropagation in deep neural networks.',
    referenceAnswer: 'Backpropagation calculates the gradient of the loss function with respect to each model parameter using the chain rule, enabling gradient descent to iteratively update weights.',
    modelOutput: 'The primary purpose of backpropagation is computing gradients of the loss with respect to all network weights via the calculus chain rule, allowing optimization algorithms like SGD or Adam to adjust parameters.',
    bleu1: 0.74,
    bleu4: 0.51,
    rouge1: 0.78,
    rougeL: 0.69,
    perplexity: 8.4,
    faithfulnessScore: 1.0,
    relevanceScore: 0.96,
    judgeVerdict: 'Pass',
  },
  {
    id: 'LLM-02',
    prompt: 'What causes overfitting in machine learning models and how can it be mitigated?',
    referenceAnswer: 'Overfitting happens when a model learns training data noise rather than generalizable patterns. Mitigations include regularization (L1/L2, dropout), data augmentation, early stopping, and simplifying model capacity.',
    modelOutput: 'Overfitting occurs when high model complexity captures specific training sample quirks. You can prevent it with dropout, weight decay, expanding the dataset, and early stopping during epochs.',
    bleu1: 0.68,
    bleu4: 0.44,
    rouge1: 0.71,
    rougeL: 0.62,
    perplexity: 10.2,
    faithfulnessScore: 0.95,
    relevanceScore: 0.94,
    judgeVerdict: 'Pass',
  },
  {
    id: 'LLM-03',
    prompt: 'Explain the difference between L1 and L2 regularization.',
    referenceAnswer: 'L1 regularization (Lasso) adds the absolute sum of weights to the loss, driving coefficients to exact zero for sparse feature selection. L2 regularization (Ridge) adds squared weights, shrinking weights smoothly toward zero.',
    modelOutput: 'L1 adds absolute weights causing sparsity and zeroing out unimportant features. L2 adds squared weights penalizing large magnitudes while keeping all weights non-zero.',
    bleu1: 0.72,
    bleu4: 0.48,
    rouge1: 0.76,
    rougeL: 0.67,
    perplexity: 9.1,
    faithfulnessScore: 0.98,
    relevanceScore: 0.95,
    judgeVerdict: 'Pass',
  },
  {
    id: 'LLM-04',
    prompt: 'What is the attention mechanism in transformers?',
    referenceAnswer: 'Attention computes dynamic affinity weights between query, key, and value vectors, enabling tokens to aggregate contextual information from all other tokens regardless of positional distance.',
    modelOutput: 'Attention mechanism lets tokens attend to other tokens by multiplying Query and Key matrices, passing through softmax, and scaling Value vectors. It replaced recurrence.',
    bleu1: 0.61,
    bleu4: 0.38,
    rouge1: 0.65,
    rougeL: 0.55,
    perplexity: 11.8,
    faithfulnessScore: 0.90,
    relevanceScore: 0.88,
    judgeVerdict: 'Pass',
  },
  {
    id: 'LLM-05',
    prompt: 'Can a decision tree solve non-linear classification problems?',
    referenceAnswer: 'Yes, decision trees naturally partition feature space using orthogonal axis-aligned splits, allowing them to form non-linear decision boundaries without requiring kernel transformations.',
    modelOutput: 'Decision trees cannot solve non-linear problems because each split is a straight line, so you always need polynomial regression or support vector machines.', // Hallucination / Factually wrong
    bleu1: 0.42,
    bleu4: 0.12,
    rouge1: 0.45,
    rougeL: 0.32,
    perplexity: 28.5,
    faithfulnessScore: 0.20,
    relevanceScore: 0.70,
    judgeVerdict: 'Fail',
  },
];
