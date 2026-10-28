import { MetricDefinition, FairnessSample } from '../types/metrics';

export const fairnessMetricsList: MetricDefinition[] = [
  {
    id: 'demographic-parity',
    name: 'Demographic Parity Difference (DPD)',
    shortName: 'DPD',
    category: 'fairness',
    value: 0.045,
    formattedValue: '0.045',
    range: '[0.0, 1.0]',
    ideal: '0.0 (Equal positive selection rates)',
    formulaLatex: '\\text{DPD} = |P(\\hat{Y}=1 \\mid A=0) - P(\\hat{Y}=1 \\mid A=1)|',
    plainFormula: '|selection_rate_unprivileged - selection_rate_privileged|',
    description: 'Requires that the likelihood of receiving a favorable outcome (e.g., job offer, loan approval) is independent of sensitive demographic attributes (gender, race, age).',
    interpretation: 'A difference of 0.045 (4.5%) indicates near-parity, well within standard regulatory compliance boundaries (< 10%).',
    whenToUse: 'Initial screening, marketing campaigns, and societal equity audits where historical label bias is suspected in ground truth.',
    whenToAvoid: 'When underlying base qualification rates legitimately differ and the goal is strictly accuracy-driven meritocracy.',
    workedExample: {
      inputs: {
        'Group A Selection Rate': '68.0%',
        'Group B Selection Rate': '72.5%',
      },
      steps: [
        'DPD = |0.680 - 0.725| = 0.045',
      ],
      result: '0.045 (4.5% gap)',
    },
    pythonCode: `from fairlearn.metrics import demographic_parity_difference
dpd = demographic_parity_difference(y_true, y_pred, sensitive_features=sensitive_col)`,
  },
  {
    id: 'disparate-impact',
    name: 'Disparate Impact Ratio (DIR / 80% Rule)',
    shortName: 'DIR',
    category: 'fairness',
    value: 0.924,
    formattedValue: '0.924',
    range: '[0.0, ∞)',
    ideal: '1.0 (>= 0.80 passes US EEOC rule)',
    formulaLatex: '\\text{DIR} = \\frac{P(\\hat{Y}=1 \\mid A=0)}{P(\\hat{Y}=1 \\mid A=1)}',
    plainFormula: 'selection_rate_unprivileged / selection_rate_privileged',
    description: 'The US Equal Employment Opportunity Commission (EEOC) "Four-Fifths Rule". If the selection rate for a protected group is less than 80% (0.80) of the rate for the group with the highest rate, the practice is considered to have adverse impact.',
    interpretation: 'A ratio of 0.924 substantially exceeds the 0.80 legal threshold, passing adverse impact review.',
    whenToUse: 'HR hiring algorithms, automated underwriting, credit approvals, and housing qualification models.',
    whenToAvoid: 'When privileged group selection rate is 0 (division by zero).',
    workedExample: {
      inputs: { 'Protected selection rate': '60%', 'Privileged selection rate': '65%' },
      steps: ['DIR = 0.60 / 0.65 = 0.923'],
      result: '0.923 (Passes 80% Rule)',
    },
    pythonCode: `from fairlearn.metrics import demographic_parity_ratio
dir_score = demographic_parity_ratio(y_true, y_pred, sensitive_features=sensitive_col)`,
  },
  {
    id: 'equalized-odds',
    name: 'Equalized Odds Difference (EOD)',
    shortName: 'EOD',
    category: 'fairness',
    value: 0.038,
    formattedValue: '0.038',
    range: '[0.0, 1.0]',
    ideal: '0.0 (Identical TPR and FPR)',
    formulaLatex: '\\text{EOD} = \\max(|TPR_0 - TPR_1|, |FPR_0 - FPR_1|)',
    plainFormula: 'max(|TPR_unprivileged - TPR_privileged|, |FPR_unprivileged - FPR_privileged|)',
    description: 'Requires that the model is equally accurate for both protected and privileged groups. It penalizes disparity in True Positive Rates (opportunity) and False Positive Rates (unjust penalization).',
    interpretation: 'A maximum rate disparity of 0.038 demonstrates balanced error distributions across demographics.',
    whenToUse: 'Criminal justice recidivism risk scoring (e.g. COMPAS audits) and medical diagnostics.',
    whenToAvoid: 'When demographic parity is legally mandated above accuracy parity.',
    workedExample: {
      inputs: { '|TPR_0 - TPR_1|': '0.035', '|FPR_0 - FPR_1|': '0.038' },
      steps: ['EOD = max(0.035, 0.038) = 0.038'],
      result: '0.038',
    },
    pythonCode: `from fairlearn.metrics import equalized_odds_difference
eod = equalized_odds_difference(y_true, y_pred, sensitive_features=sensitive_col)`,
  },
  {
    id: 'equal-opportunity',
    name: 'Equal Opportunity Difference',
    shortName: 'EqOpp',
    category: 'fairness',
    value: 0.025,
    formattedValue: '0.025',
    range: '[0.0, 1.0]',
    ideal: '0.0',
    formulaLatex: '\\text{EqOpp} = |TPR_{A=0} - TPR_{A=1}|',
    plainFormula: '|True_Positive_Rate_Group0 - True_Positive_Rate_Group1|',
    description: 'A relaxed subset of Equalized Odds proposed by Hardt et al. It focuses solely on qualified candidates, requiring that qualified applicants have equal chances of approval regardless of group.',
    interpretation: 'Qualified candidates in both groups experience almost identical approval rates (within 2.5%).',
    whenToUse: 'University admissions and loan origination where false positive costs are tolerable if qualified individuals are treated equally.',
    whenToAvoid: 'When false positive parity is also vital (e.g., false arrest suspicion).',
    workedExample: {
      inputs: { 'TPR Group A': '88.5%', 'TPR Group B': '91.0%' },
      steps: ['EqOpp = |0.885 - 0.910| = 0.025'],
      result: '0.025',
    },
    pythonCode: `from fairlearn.metrics import true_positive_rate_difference
eq_opp = true_positive_rate_difference(y_true, y_pred, sensitive_features=sensitive_col)`,
  },
];

export const mockFairnessDataset: FairnessSample[] = [
  { id: 'APP-101', applicantId: 'USR-891', protectedGroup: 'Protected (A=0)', creditScore: 745, qualificationTier: 'High', approvalDecision: true, actualRepaid: true },
  { id: 'APP-102', applicantId: 'USR-892', protectedGroup: 'Privileged (A=1)', creditScore: 750, qualificationTier: 'High', approvalDecision: true, actualRepaid: true },
  { id: 'APP-103', applicantId: 'USR-893', protectedGroup: 'Protected (A=0)', creditScore: 685, qualificationTier: 'Medium', approvalDecision: true, actualRepaid: true },
  { id: 'APP-104', applicantId: 'USR-894', protectedGroup: 'Privileged (A=1)', creditScore: 690, qualificationTier: 'Medium', approvalDecision: true, actualRepaid: true },
  { id: 'APP-105', applicantId: 'USR-895', protectedGroup: 'Protected (A=0)', creditScore: 620, qualificationTier: 'Borderline', approvalDecision: false, actualRepaid: false },
  { id: 'APP-106', applicantId: 'USR-896', protectedGroup: 'Privileged (A=1)', creditScore: 625, qualificationTier: 'Borderline', approvalDecision: true, actualRepaid: true }, // Boundary variance
  { id: 'APP-107', applicantId: 'USR-897', protectedGroup: 'Protected (A=0)', creditScore: 780, qualificationTier: 'High', approvalDecision: true, actualRepaid: true },
  { id: 'APP-108', applicantId: 'USR-898', protectedGroup: 'Privileged (A=1)', creditScore: 775, qualificationTier: 'High', approvalDecision: true, actualRepaid: true },
  { id: 'APP-109', applicantId: 'USR-899', protectedGroup: 'Protected (A=0)', creditScore: 640, qualificationTier: 'Borderline', approvalDecision: false, actualRepaid: true },
  { id: 'APP-110', applicantId: 'USR-900', protectedGroup: 'Privileged (A=1)', creditScore: 590, qualificationTier: 'Borderline', approvalDecision: false, actualRepaid: false },
];
