import { MetricDefinition, ClusteringSample } from '../types/metrics';

export const clusteringMetricsList: MetricDefinition[] = [
  {
    id: 'silhouette',
    name: 'Silhouette Coefficient',
    shortName: 'SIL',
    category: 'clustering',
    value: 0.742,
    formattedValue: '0.742',
    range: '[-1.0, +1.0]',
    ideal: '+1.0 (Dense, separated clusters)',
    formulaLatex: 's(i) = \\frac{b(i) - a(i)}{\\max(a(i), b(i))}, \\quad \\bar{S} = \\frac{1}{N} \\sum_{i=1}^{N} s(i)',
    plainFormula: '(b(i) - a(i)) / max(a(i), b(i)) where a(i)=intra-cluster dist, b(i)=nearest-neighbor cluster dist',
    description: 'Quantifies how well each sample is clustered with its assigned peers compared to the closest neighboring alternative cluster. A score near +1 indicates tight, distinct separation; near 0 indicates overlapping boundaries; negative indicates misclustered points.',
    interpretation: 'A mean score of 0.742 indicates strong, compact cluster cohesion with minimal inter-cluster spillover.',
    whenToUse: 'Determining optimal cluster count $k$ in K-Means, DBSCAN, or hierarchical clustering, and finding boundary anomalies.',
    whenToAvoid: 'Non-convex or manifold clusters (e.g., concentric circles or crescent spirals) where Euclidean distance fails.',
    workedExample: {
      inputs: {
        'Point i Mean Intra-cluster distance a(i)': '0.24',
        'Point i Mean Nearest Cluster distance b(i)': '0.96',
      },
      steps: [
        'Numerator = b(i) - a(i) = 0.96 - 0.24 = 0.72',
        'Denominator = max(0.24, 0.96) = 0.96',
        's(i) = 0.72 / 0.96 = 0.750',
      ],
      result: '0.750 (Well-clustered)',
    },
    pythonCode: `from sklearn.metrics import silhouette_score, silhouette_samples
sil_avg = silhouette_score(X, cluster_labels)
sample_sil_values = silhouette_samples(X, cluster_labels)`,
  },
  {
    id: 'davies-bouldin',
    name: 'Davies-Bouldin Index (DBI)',
    shortName: 'DBI',
    category: 'clustering',
    value: 0.581,
    formattedValue: '0.581',
    range: '[0.0, ∞)',
    ideal: '0.0 (Lower is better)',
    formulaLatex: 'DB = \\frac{1}{k} \\sum_{i=1}^{k} \\max_{j \\ne i} \\left( \\frac{S_i + S_j}{M_{ij}} \\right)',
    plainFormula: '(1 / k) * sum_i max_{j != i} [ (scatter_i + scatter_j) / centroid_distance(i, j) ]',
    description: 'Measures the similarity between each cluster and its most similar counterpart. It computes the ratio of internal scatter to separation between cluster centroids. Lower values indicate better clustering.',
    interpretation: 'Values below 1.0 indicate favorable separation. 0.581 represents excellent separation where cluster radii are significantly smaller than the distance between their centroids.',
    whenToUse: 'Automated hyperparameter tuning for clustering algorithms where lower values directly indicate cleaner partitioning.',
    whenToAvoid: 'Clusters of drastically non-spherical shapes, where centroid distance misrepresents actual separation.',
    workedExample: {
      inputs: {
        'Cluster 1 internal scatter S1': '0.3',
        'Cluster 2 internal scatter S2': '0.4',
        'Centroid distance M12': '1.8',
      },
      steps: [
        'Similarity R12 = (0.3 + 0.4) / 1.8 = 0.7 / 1.8 = 0.389',
        'DB Index across symmetric clusters = 0.389',
      ],
      result: '0.389',
    },
    pythonCode: `from sklearn.metrics import davies_bouldin_score
dbi = davies_bouldin_score(X, cluster_labels)`,
  },
  {
    id: 'calinski-harabasz',
    name: 'Calinski-Harabasz Index (Variance Ratio)',
    shortName: 'CH',
    category: 'clustering',
    value: 428.5,
    formattedValue: '428.5',
    range: '[0.0, ∞)',
    ideal: 'Higher is better (Peak)',
    formulaLatex: 'CH = \\frac{\\text{Tr}(B_k) / (k - 1)}{\\text{Tr}(W_k) / (N - k)}',
    plainFormula: '(Between_Cluster_Variance / (k - 1)) / (Within_Cluster_Variance / (N - k))',
    description: 'Defined as the ratio of between-cluster dispersion (separation) to within-cluster dispersion (compactness). Higher values indicate dense and well-separated clusters.',
    interpretation: 'A CH score of 428.5 highlights that inter-cluster variance vastly outstrips intra-cluster variance.',
    whenToUse: 'Fast computational cluster validation; much faster to calculate than Silhouette for massive million-row datasets.',
    whenToAvoid: 'When comparing different dataset distributions rather than different cluster counts $k$ on the same dataset.',
    workedExample: {
      inputs: {
        'Between-cluster dispersion SSB': '857.0 (k=3, df=2)',
        'Within-cluster dispersion SSW': '94.0 (N=99, df=96)',
      },
      steps: [
        'SSB / (k - 1) = 857.0 / 2 = 428.5',
        'SSW / (N - k) = 94.0 / 96 = 0.979',
        'CH Score = 428.5 / 0.979 = 437.7',
      ],
      result: '437.7',
    },
    pythonCode: `from sklearn.metrics import calinski_harabasz_score
ch_score = calinski_harabasz_score(X, cluster_labels)`,
  },
  {
    id: 'inertia',
    name: 'Inertia / WCSS (Within-Cluster Sum of Squares)',
    shortName: 'WCSS',
    category: 'clustering',
    value: 124.8,
    formattedValue: '124.8',
    range: '[0.0, ∞)',
    ideal: 'Elbow point inflection',
    formulaLatex: '\\text{WCSS} = \\sum_{k=1}^{K} \\sum_{x \\in C_k} \\|x - \\mu_k\\|^2',
    plainFormula: 'sum_{k} sum_{x in C_k} distance(x, centroid_k)^2',
    description: 'Total squared Euclidean distance of all samples to their assigned cluster centers. Used in the classic "Elbow Method" to detect diminishing returns when increasing $k$.',
    interpretation: 'Decreases monotonically as $K$ increases toward $N$. The optimal $K$ is the inflection "elbow" where the rate of decrease drastically slows.',
    whenToUse: 'Validating convergence and standard loss objective in K-Means optimization.',
    whenToAvoid: 'Using alone without plotting against varying $K$, because setting $K=N$ trivially produces an inertia of 0.',
    workedExample: {
      inputs: {
        'Cluster 0 WCSS': '42.1',
        'Cluster 1 WCSS': '38.5',
        'Cluster 2 WCSS': '44.2',
      },
      steps: [
        'Total Inertia = 42.1 + 38.5 + 44.2 = 124.8',
      ],
      result: '124.8',
    },
    pythonCode: `from sklearn.cluster import KMeans
kmeans = KMeans(n_clusters=3, random_state=42).fit(X)
inertia = kmeans.inertia_`,
  },
];

export const mockClusteringDataset: ClusteringSample[] = [
  // Cluster 0: High-Value Enterprise Accounts (Upper-Right)
  { id: 'CL-01', pointName: 'Acme Corp Cloud', x: 7.8, y: 8.2, assignedCluster: 0, trueCluster: 0, silhouetteScore: 0.88, nearestNeighborCluster: 1, distanceToCentroid: 0.32 },
  { id: 'CL-02', pointName: 'Starlight Financial', x: 8.1, y: 7.9, assignedCluster: 0, trueCluster: 0, silhouetteScore: 0.85, nearestNeighborCluster: 1, distanceToCentroid: 0.28 },
  { id: 'CL-03', pointName: 'Apex Health Systems', x: 7.5, y: 8.5, assignedCluster: 0, trueCluster: 0, silhouetteScore: 0.82, nearestNeighborCluster: 1, distanceToCentroid: 0.45 },
  { id: 'CL-04', pointName: 'Nexus Global Logistics', x: 8.4, y: 8.4, assignedCluster: 0, trueCluster: 0, silhouetteScore: 0.89, nearestNeighborCluster: 1, distanceToCentroid: 0.38 },
  { id: 'CL-05', pointName: 'Vanguard Cybertech', x: 7.2, y: 7.8, assignedCluster: 0, trueCluster: 0, silhouetteScore: 0.74, nearestNeighborCluster: 1, distanceToCentroid: 0.65 },
  { id: 'CL-06', pointName: 'Summit Media Group', x: 8.6, y: 7.4, assignedCluster: 0, trueCluster: 0, silhouetteScore: 0.79, nearestNeighborCluster: 1, distanceToCentroid: 0.58 },
  { id: 'CL-07', pointName: 'Omni Retailers Group', x: 6.9, y: 7.1, assignedCluster: 0, trueCluster: 0, silhouetteScore: 0.52, nearestNeighborCluster: 1, distanceToCentroid: 1.12 }, // Boundary point
  { id: 'CL-08', pointName: 'Pinnacle Aerospace', x: 8.0, y: 8.9, assignedCluster: 0, trueCluster: 0, silhouetteScore: 0.84, nearestNeighborCluster: 1, distanceToCentroid: 0.68 },

  // Cluster 1: Mid-Tier Growth Startups (Center-Left)
  { id: 'CL-09', pointName: 'Nova Robotics', x: 2.8, y: 5.5, assignedCluster: 1, trueCluster: 1, silhouetteScore: 0.79, nearestNeighborCluster: 0, distanceToCentroid: 0.35 },
  { id: 'CL-10', pointName: 'Bolt Payments', x: 3.2, y: 5.8, assignedCluster: 1, trueCluster: 1, silhouetteScore: 0.81, nearestNeighborCluster: 0, distanceToCentroid: 0.29 },
  { id: 'CL-11', pointName: 'Pulse Analytics', x: 2.5, y: 5.2, assignedCluster: 1, trueCluster: 1, silhouetteScore: 0.76, nearestNeighborCluster: 2, distanceToCentroid: 0.41 },
  { id: 'CL-12', pointName: 'Zephyr Energy Tech', x: 3.5, y: 5.1, assignedCluster: 1, trueCluster: 1, silhouetteScore: 0.78, nearestNeighborCluster: 0, distanceToCentroid: 0.38 },
  { id: 'CL-13', pointName: 'Hyperion BioLabs', x: 2.9, y: 6.1, assignedCluster: 1, trueCluster: 1, silhouetteScore: 0.80, nearestNeighborCluster: 0, distanceToCentroid: 0.42 },
  { id: 'CL-14', pointName: 'Quantum AI Research', x: 3.8, y: 5.9, assignedCluster: 1, trueCluster: 1, silhouetteScore: 0.69, nearestNeighborCluster: 0, distanceToCentroid: 0.72 },
  { id: 'CL-15', pointName: 'Cortex Data Labs', x: 4.4, y: 6.4, assignedCluster: 1, trueCluster: 0, silhouetteScore: 0.35, nearestNeighborCluster: 0, distanceToCentroid: 1.35 }, // Ambiguous overlap
  { id: 'CL-16', pointName: 'Flux Automation', x: 2.1, y: 5.0, assignedCluster: 1, trueCluster: 1, silhouetteScore: 0.71, nearestNeighborCluster: 2, distanceToCentroid: 0.62 },

  // Cluster 2: Dormant / Low-Usage Freepool (Lower-Right)
  { id: 'CL-17', pointName: 'Solo Dev Sandbox A', x: 6.5, y: 2.2, assignedCluster: 2, trueCluster: 2, silhouetteScore: 0.83, nearestNeighborCluster: 1, distanceToCentroid: 0.31 },
  { id: 'CL-18', pointName: 'Solo Dev Sandbox B', x: 6.9, y: 2.5, assignedCluster: 2, trueCluster: 2, silhouetteScore: 0.86, nearestNeighborCluster: 0, distanceToCentroid: 0.25 },
  { id: 'CL-19', pointName: 'Academic Trial User X', x: 6.1, y: 1.9, assignedCluster: 2, trueCluster: 2, silhouetteScore: 0.78, nearestNeighborCluster: 1, distanceToCentroid: 0.44 },
  { id: 'CL-20', pointName: 'Student Project Lab', x: 7.2, y: 2.1, assignedCluster: 2, trueCluster: 2, silhouetteScore: 0.81, nearestNeighborCluster: 0, distanceToCentroid: 0.39 },
  { id: 'CL-21', pointName: 'Hobbyist IoT Hub', x: 6.7, y: 1.6, assignedCluster: 2, trueCluster: 2, silhouetteScore: 0.75, nearestNeighborCluster: 1, distanceToCentroid: 0.52 },
  { id: 'CL-22', pointName: 'Legacy Inactive Account', x: 5.5, y: 2.8, assignedCluster: 2, trueCluster: 2, silhouetteScore: 0.58, nearestNeighborCluster: 1, distanceToCentroid: 0.98 },
  { id: 'CL-23', pointName: 'Occasional Exporter', x: 7.4, y: 2.9, assignedCluster: 2, trueCluster: 2, silhouetteScore: 0.77, nearestNeighborCluster: 0, distanceToCentroid: 0.61 },
  { id: 'CL-24', pointName: 'Ephemeral Testing Agent', x: 5.0, y: 3.5, assignedCluster: 2, trueCluster: 1, silhouetteScore: -0.12, nearestNeighborCluster: 1, distanceToCentroid: 1.65 }, // Misclustered outlier!
];
