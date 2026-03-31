export interface GitHubPR {
  number: number;
  title: string;
  author: string;
  body: string;
  labels: string[];
  additions: number;
  deletions: number;
  changedFiles: number;
  createdAt: string;
  updatedAt: string;
  state: string;
  isDraft: boolean;
  mergedAt: string | null;
  closedAt: string | null;
  ciStatus: 'passing' | 'failing' | 'pending';
  files: string[];
}

export interface GitHubIssue {
  number: number;
  title: string;
  labels: string[];
  thumbsUp: number;
  comments: number;
  state: string;
}

export interface LinkedIssueData {
  issue: GitHubIssue;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'none';
  status: 'confirmed' | 'pending_repro' | 'cant_repro' | 'none';
}

export type ComplexityTier = 'low' | 'medium' | 'high' | 'very_high';

export type PriorityTier = 'urgent' | 'high' | 'normal' | 'low';

export interface ValueBreakdown {
  base: number;
  severity: number;
  status: number;
  engagement: number;
  urgency: number;
  total: number;
}

export interface ScoredPR {
  pr: GitHubPR;
  linkedIssues: LinkedIssueData[];
  value: ValueBreakdown;
  complexity: ComplexityTier;
  priority: PriorityTier;
  area: string;
  areaTier: string;
  prType: string;
  isQuickWin: boolean;
}
