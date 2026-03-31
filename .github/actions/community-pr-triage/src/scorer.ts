import type {
  GitHubPR,
  LinkedIssueData,
  ValueBreakdown,
  ComplexityTier,
  PriorityTier,
} from './types.js';

const BASE_SCORES: Record<string, number> = {
  'pr: fix': 30,
  'pr: enhancement': 20,
  'pr: doc': 15,
  'pr: feature': 10,
  'pr: chore': 10,
};

const SEVERITY_SCORES: Record<string, number> = {
  critical: 50,
  high: 35,
  medium: 20,
  low: 5,
  none: 0,
};

const STATUS_SCORES: Record<string, number> = {
  confirmed: 15,
  pending_repro: 5,
  cant_repro: -10,
  none: 0,
};

const URGENCY_BRACKETS: [number, number][] = [
  [46, 2.0],
  [31, 1.8],
  [22, 1.6],
  [15, 1.4],
  [8, 1.2],
  [0, 1.0],
];

function getBase(labels: string[]): number {
  if (labels.some((l) => l.includes('dependencies'))) return 5;
  for (const label of labels) {
    if (BASE_SCORES[label] !== undefined) return BASE_SCORES[label];
  }
  return 10;
}

function getUrgency(ageDays: number): number {
  for (const [minDays, multiplier] of URGENCY_BRACKETS) {
    if (ageDays >= minDays) return multiplier;
  }
  return 1.0;
}

function getEngagement(linkedIssues: LinkedIssueData[]): number {
  let raw = 0;
  for (const { issue } of linkedIssues) {
    raw += issue.thumbsUp;
    raw += Math.floor(issue.comments * 0.5);
    if (issue.thumbsUp >= 50) raw += 15;
    else if (issue.thumbsUp >= 20) raw += 10;
    else if (issue.thumbsUp >= 10) raw += 5;
  }
  return Math.min(raw, 40);
}

export function calculateValue(
  pr: GitHubPR,
  linkedIssues: LinkedIssueData[],
  ageDays: number
): ValueBreakdown {
  const base = getBase(pr.labels);
  const severity = Math.max(0, ...linkedIssues.map((li) => SEVERITY_SCORES[li.severity] ?? 0));
  const status = Math.max(0, ...linkedIssues.map((li) => STATUS_SCORES[li.status] ?? 0));
  const engagement = getEngagement(linkedIssues);
  const urgency = getUrgency(ageDays);
  const total = Math.round((base + severity + status + engagement) * urgency);
  return { base, severity, status, engagement, urgency, total };
}

const COMPLEXITY_TIERS: ComplexityTier[] = ['low', 'medium', 'high', 'very_high'];

export function calculateComplexity(loc: number, files: number, areaTier: string): ComplexityTier {
  let tierIndex: number;
  if (loc > 1000) tierIndex = 3;
  else if (loc > 300) tierIndex = 2;
  else if (loc > 50 || files > 10) tierIndex = 1;
  else tierIndex = 0;

  if (areaTier === 'critical') tierIndex = Math.min(tierIndex + 1, 3);
  if (areaTier === 'low') tierIndex = Math.max(tierIndex - 1, 0);
  return COMPLEXITY_TIERS[tierIndex];
}

export function calculatePriority(valueScore: number): PriorityTier {
  if (valueScore >= 100) return 'urgent';
  if (valueScore >= 70) return 'high';
  if (valueScore >= 50) return 'normal';
  return 'low';
}

export function isQuickWin(valueScore: number, complexity: ComplexityTier): boolean {
  return valueScore >= 30 && complexity === 'low';
}
