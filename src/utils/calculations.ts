/**
 * Pure Mathematical Evaluation Calculation Functions for ML & AI Metrics
 */

// ==========================================
// 1. CLASSIFICATION CALCULATIONS
// ==========================================

export interface ConfusionMatrixCounts {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  total: number;
}

export function computeConfusionMatrix(
  samples: { trueLabel: 0 | 1; predictedProbability: number }[],
  threshold: number
): ConfusionMatrixCounts {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;

  for (const s of samples) {
    const predictedLabel = s.predictedProbability >= threshold ? 1 : 0;
    if (s.trueLabel === 1 && predictedLabel === 1) tp++;
    else if (s.trueLabel === 0 && predictedLabel === 1) fp++;
    else if (s.trueLabel === 1 && predictedLabel === 0) fn++;
    else tn++;
  }

  return { tp, fp, fn, tn, total: samples.length };
}

export function computeClassificationMetrics(cm: ConfusionMatrixCounts) {
  const { tp, fp, fn, tn, total } = cm;
  const accuracy = total > 0 ? (tp + tn) / total : 0;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const specificity = tn + fp > 0 ? tn / (tn + fp) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const balancedAccuracy = (recall + specificity) / 2;

  // Matthews Correlation Coefficient
  const denominator = Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn));
  const mcc = denominator === 0 ? 0 : (tp * tn - fp * fn) / denominator;

  return {
    accuracy,
    precision,
    recall,
    specificity,
    f1,
    balancedAccuracy,
    mcc,
  };
}

export function computeLogLoss(samples: { trueLabel: 0 | 1; predictedProbability: number }[]): number {
  if (samples.length === 0) return 0;
  const eps = 1e-15;
  let sum = 0;
  for (const s of samples) {
    const p = Math.max(eps, Math.min(1 - eps, s.predictedProbability));
    sum += s.trueLabel === 1 ? Math.log(p) : Math.log(1 - p);
  }
  return -sum / samples.length;
}

export function computeROCCurve(samples: { trueLabel: 0 | 1; predictedProbability: number }[]) {
  // Sort samples by predicted probability descending
  const sorted = [...samples].sort((a, b) => b.predictedProbability - a.predictedProbability);
  const totalPos = sorted.filter((s) => s.trueLabel === 1).length;
  const totalNeg = sorted.length - totalPos;

  if (totalPos === 0 || totalNeg === 0) {
    return { points: [{ fpr: 0, tpr: 0, threshold: 1 }, { fpr: 1, tpr: 1, threshold: 0 }], auc: 0.5 };
  }

  const points: { fpr: number; tpr: number; threshold: number }[] = [{ fpr: 0, tpr: 0, threshold: 1 }];

  let currentTp = 0;
  let currentFp = 0;

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    if (s.trueLabel === 1) currentTp++;
    else currentFp++;

    const nextProb = i < sorted.length - 1 ? sorted[i + 1].predictedProbability : -1;
    if (nextProb !== s.predictedProbability) {
      points.push({
        fpr: currentFp / totalNeg,
        tpr: currentTp / totalPos,
        threshold: s.predictedProbability,
      });
    }
  }

  // Ensure ending at (1, 1)
  if (points[points.length - 1].fpr !== 1 || points[points.length - 1].tpr !== 1) {
    points.push({ fpr: 1, tpr: 1, threshold: 0 });
  }

  // Trapezoidal AUC
  let auc = 0;
  for (let i = 1; i < points.length; i++) {
    const w = points[i].fpr - points[i - 1].fpr;
    const h = (points[i].tpr + points[i - 1].tpr) / 2;
    auc += w * h;
  }

  return { points, auc: Math.max(0, Math.min(1, auc)) };
}

export function computePrecisionRecallCurve(samples: { trueLabel: 0 | 1; predictedProbability: number }[]) {
  const sorted = [...samples].sort((a, b) => b.predictedProbability - a.predictedProbability);
  const totalPos = sorted.filter((s) => s.trueLabel === 1).length;

  if (totalPos === 0) return { points: [{ recall: 0, precision: 1, threshold: 1 }], auc: 0 };

  const points: { recall: number; precision: number; threshold: number }[] = [];
  let tp = 0;
  let fp = 0;

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].trueLabel === 1) tp++;
    else fp++;

    const precision = tp / (tp + fp);
    const recall = tp / totalPos;
    points.push({ recall, precision, threshold: sorted[i].predictedProbability });
  }

  // PR AUC calculation (Average Precision)
  let prAuc = 0;
  for (let i = 1; i < points.length; i++) {
    const deltaRecall = points[i].recall - points[i - 1].recall;
    if (deltaRecall > 0) {
      prAuc += deltaRecall * points[i].precision;
    }
  }

  return { points, auc: Math.max(0, Math.min(1, prAuc)) };
}

// ==========================================
// 2. REGRESSION CALCULATIONS
// ==========================================

export function computeRegressionMetrics(
  samples: { actual: number; predicted: number }[],
  huberDelta: number = 1.5,
  numFeatures: number = 4
) {
  const n = samples.length;
  if (n === 0) {
    return {
      mse: 0,
      rmse: 0,
      mae: 0,
      mape: 0,
      r2: 0,
      adjustedR2: 0,
      huberLoss: 0,
      explainedVariance: 0,
    };
  }

  let sumSqErr = 0;
  let sumAbsErr = 0;
  let sumPctErr = 0;
  let sumActual = 0;
  let sumPredicted = 0;
  let sumHuber = 0;

  for (const s of samples) {
    const diff = s.actual - s.predicted;
    const absDiff = Math.abs(diff);

    sumSqErr += diff * diff;
    sumAbsErr += absDiff;
    if (s.actual !== 0) {
      sumPctErr += (absDiff / Math.abs(s.actual)) * 100;
    }

    // Huber loss
    if (absDiff <= huberDelta) {
      sumHuber += 0.5 * (diff * diff);
    } else {
      sumHuber += huberDelta * (absDiff - 0.5 * huberDelta);
    }

    sumActual += s.actual;
    sumPredicted += s.predicted;
  }

  const meanActual = sumActual / n;
  let sumTotalSq = 0;
  for (const s of samples) {
    const dev = s.actual - meanActual;
    sumTotalSq += dev * dev;
  }

  const mse = sumSqErr / n;
  const rmse = Math.sqrt(mse);
  const mae = sumAbsErr / n;
  const mape = sumPctErr / n;
  const r2 = sumTotalSq > 0 ? 1 - sumSqErr / sumTotalSq : 0;

  // Adjusted R2
  const adjustedR2 = n > numFeatures + 1 ? 1 - ((1 - r2) * (n - 1)) / (n - numFeatures - 1) : r2;

  // Explained Variance
  const residuals = samples.map((s) => s.actual - s.predicted);
  const meanRes = residuals.reduce((a, b) => a + b, 0) / n;
  const varRes = residuals.reduce((a, b) => a + Math.pow(b - meanRes, 2), 0) / n;
  const varActual = sumTotalSq / n;
  const explainedVariance = varActual > 0 ? 1 - varRes / varActual : 0;

  return {
    mse,
    rmse,
    mae,
    mape,
    r2,
    adjustedR2,
    huberLoss: sumHuber / n,
    explainedVariance,
  };
}

// ==========================================
// 3. OBJECT DETECTION CALCULATIONS
// ==========================================

export interface BoundingBoxCoords {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function computeBoxIoU(boxA: BoundingBoxCoords, boxB: BoundingBoxCoords): {
  iou: number;
  intersectionArea: number;
  unionArea: number;
  areaA: number;
  areaB: number;
} {
  const xA = Math.max(boxA.x, boxB.x);
  const yA = Math.max(boxA.y, boxB.y);
  const xB = Math.min(boxA.x + boxA.w, boxB.x + boxB.w);
  const yB = Math.min(boxA.y + boxA.h, boxB.y + boxB.h);

  const interW = Math.max(0, xB - xA);
  const interH = Math.max(0, yB - yA);
  const intersectionArea = interW * interH;

  const areaA = boxA.w * boxA.h;
  const areaB = boxB.w * boxB.h;
  const unionArea = areaA + areaB - intersectionArea;

  const iou = unionArea > 0 ? intersectionArea / unionArea : 0;
  return { iou, intersectionArea, unionArea, areaA, areaB };
}

export function computeMeanAveragePrecision(
  detections: { confidence: number; iou: number; isTrueClass: boolean }[],
  iouThreshold: number = 0.5
) {
  // Sort by confidence descending
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  let cumulativeTp = 0;
  let cumulativeFp = 0;
  const totalGroundTruth = detections.filter((d) => d.isTrueClass).length || 1;

  const prCurve: { recall: number; precision: number; rank: number; conf: number }[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const d = sorted[i];
    const isTp = d.isTrueClass && d.iou >= iouThreshold;
    if (isTp) cumulativeTp++;
    else cumulativeFp++;

    const precision = cumulativeTp / (cumulativeTp + cumulativeFp);
    const recall = cumulativeTp / totalGroundTruth;

    prCurve.push({
      recall,
      precision,
      rank: i + 1,
      conf: d.confidence,
    });
  }

  // 11-point interpolated AP (Pascal VOC standard)
  let ap11 = 0;
  for (let r = 0; r <= 10; r++) {
    const targetRecall = r / 10;
    // Max precision for recall >= targetRecall
    const validPoints = prCurve.filter((p) => p.recall >= targetRecall);
    const maxP = validPoints.length > 0 ? Math.max(...validPoints.map((p) => p.precision)) : 0;
    ap11 += maxP;
  }
  ap11 = ap11 / 11;

  return { prCurve, ap: ap11, precisionAtThreshold: prCurve[prCurve.length - 1]?.precision || 0 };
}

// ==========================================
// 4. SEGMENTATION CALCULATIONS
// ==========================================

export function computeSegmentationMetricsFromCounts(intersection: number, union: number, totalGroundTruth: number, totalPredicted: number, totalImagePixels: number) {
  const iou = union > 0 ? intersection / union : 0;
  const dice = totalGroundTruth + totalPredicted > 0 ? (2 * intersection) / (totalGroundTruth + totalPredicted) : 0;
  const pixelAccuracy = totalImagePixels > 0 ? intersection / totalImagePixels : 0;
  
  return {
    iou,
    dice,
    pixelAccuracy,
  };
}

export interface EllipseMask {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/**
 * Boundary IoU between two filled ellipses, rasterized on a width x height grid.
 * Each mask is reduced to its boundary band (mask pixels within `d` px of the
 * contour), then IoU is taken over the two bands.
 */
export function computeEllipseBoundaryIoU(
  gt: EllipseMask,
  pred: EllipseMask,
  d: number = 3,
  width: number = 320,
  height: number = 220
): number {
  const rasterize = (e: EllipseMask) => {
    const mask = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = (x + 0.5 - e.cx) / e.rx;
        const ny = (y + 0.5 - e.cy) / e.ry;
        if (nx * nx + ny * ny <= 1) mask[y * width + x] = 1;
      }
    }
    return mask;
  };

  const offsets: [number, number][] = [];
  for (let dy = -d; dy <= d; dy++) {
    for (let dx = -d; dx <= d; dx++) {
      if (dx * dx + dy * dy <= d * d) offsets.push([dx, dy]);
    }
  }

  const boundaryBand = (mask: Uint8Array) => {
    const band = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!mask[y * width + x]) continue;
        for (const [dx, dy] of offsets) {
          const px = x + dx;
          const py = y + dy;
          // Pixels outside the image count as background
          if (px < 0 || py < 0 || px >= width || py >= height || !mask[py * width + px]) {
            band[y * width + x] = 1;
            break;
          }
        }
      }
    }
    return band;
  };

  const gBand = boundaryBand(rasterize(gt));
  const pBand = boundaryBand(rasterize(pred));

  let inter = 0;
  let union = 0;
  for (let i = 0; i < gBand.length; i++) {
    if (gBand[i] && pBand[i]) inter++;
    if (gBand[i] || pBand[i]) union++;
  }
  return union > 0 ? inter / union : 0;
}

// ==========================================
// 5. LLM METRICS CALCULATIONS
// ==========================================

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function getNgrams(tokens: string[], n: number): string[] {
  const ngrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
}

export function computeBleuScore(referenceText: string, candidateText: string): {
  bleu1: number;
  bleu2: number;
  bleu4: number;
  brevityPenalty: number;
  refLen: number;
  candLen: number;
  unigramMatches: string[];
} {
  const refTokens = tokenize(referenceText);
  const candTokens = tokenize(candidateText);

  if (candTokens.length === 0 || refTokens.length === 0) {
    return { bleu1: 0, bleu2: 0, bleu4: 0, brevityPenalty: 0, refLen: refTokens.length, candLen: candTokens.length, unigramMatches: [] };
  }

  // Unigram precision
  const refMap: Record<string, number> = {};
  for (const t of refTokens) refMap[t] = (refMap[t] || 0) + 1;

  let matches1 = 0;
  const matchedTokens: string[] = [];
  const candCountMap: Record<string, number> = {};

  for (const t of candTokens) {
    const available = refMap[t] || 0;
    const used = candCountMap[t] || 0;
    if (used < available) {
      matches1++;
      matchedTokens.push(t);
      candCountMap[t] = used + 1;
    }
  }

  const p1 = candTokens.length > 0 ? matches1 / candTokens.length : 0;

  // Bigram precision
  const refBigrams = getNgrams(refTokens, 2);
  const candBigrams = getNgrams(candTokens, 2);
  const refBiMap: Record<string, number> = {};
  for (const bg of refBigrams) refBiMap[bg] = (refBiMap[bg] || 0) + 1;

  let matches2 = 0;
  const candBiCountMap: Record<string, number> = {};
  for (const bg of candBigrams) {
    const available = refBiMap[bg] || 0;
    const used = candBiCountMap[bg] || 0;
    if (used < available) {
      matches2++;
      candBiCountMap[bg] = used + 1;
    }
  }
  const p2 = candBigrams.length > 0 ? matches2 / candBigrams.length : 0;

  // 4-gram precision
  const ref4grams = getNgrams(refTokens, 4);
  const cand4grams = getNgrams(candTokens, 4);
  const ref4Map: Record<string, number> = {};
  for (const fg of ref4grams) ref4Map[fg] = (ref4Map[fg] || 0) + 1;

  let matches4 = 0;
  const cand4CountMap: Record<string, number> = {};
  for (const fg of cand4grams) {
    const available = ref4Map[fg] || 0;
    const used = cand4CountMap[fg] || 0;
    if (used < available) {
      matches4++;
      cand4CountMap[fg] = used + 1;
    }
  }
  const p4 = cand4grams.length > 0 ? matches4 / cand4grams.length : 0;

  // Brevity penalty
  const c = candTokens.length;
  const r = refTokens.length;
  const brevityPenalty = c > r ? 1 : Math.exp(1 - r / Math.max(1, c));

  // BLEU-4 standard geometric mean (smoothing non-zero)
  const smoothedP1 = Math.max(0.001, p1);
  const smoothedP2 = Math.max(0.001, p2);
  const smoothedP3 = Math.max(0.001, (p1 + p2) / 2);
  const smoothedP4 = Math.max(0.001, p4);

  const logAvg = (Math.log(smoothedP1) + Math.log(smoothedP2) + Math.log(smoothedP3) + Math.log(smoothedP4)) / 4;
  const bleu4 = brevityPenalty * Math.exp(logAvg);

  return {
    bleu1: p1 * brevityPenalty,
    bleu2: p2 * brevityPenalty,
    bleu4: Math.min(1, Math.max(0, bleu4)),
    brevityPenalty,
    refLen: r,
    candLen: c,
    unigramMatches: matchedTokens,
  };
}

export function computeRougeScores(referenceText: string, candidateText: string) {
  const refTokens = tokenize(referenceText);
  const candTokens = tokenize(candidateText);

  if (refTokens.length === 0 || candTokens.length === 0) {
    return { rouge1: { precision: 0, recall: 0, f1: 0 }, rougeL: { precision: 0, recall: 0, f1: 0 }, lcsLength: 0 };
  }

  // ROUGE-1
  const refSet = new Set(refTokens);
  let matches = 0;
  for (const t of candTokens) {
    if (refSet.has(t)) matches++;
  }

  const r1Precision = matches / candTokens.length;
  const r1Recall = matches / refTokens.length;
  const r1F1 = r1Precision + r1Recall > 0 ? (2 * r1Precision * r1Recall) / (r1Precision + r1Recall) : 0;

  // ROUGE-L via Longest Common Subsequence (LCS)
  const m = candTokens.length;
  const n = refTokens.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (candTokens[i - 1] === refTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcsLength = dp[m][n];
  const rlPrecision = lcsLength / candTokens.length;
  const rlRecall = lcsLength / refTokens.length;
  const rlF1 = rlPrecision + rlRecall > 0 ? (2 * rlPrecision * rlRecall) / (rlPrecision + rlRecall) : 0;

  return {
    rouge1: { precision: r1Precision, recall: r1Recall, f1: r1F1 },
    rougeL: { precision: rlPrecision, recall: rlRecall, f1: rlF1 },
    lcsLength,
  };
}
