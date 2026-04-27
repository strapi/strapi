export interface CommunityPR {
  number: number;
  title: string;
  body: string;
  author: string;
  labels: string[];
  additions: number;
  deletions: number;
  changedFiles: number;
  files: string[];
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
  url: string;
}

export interface PRAnalysis {
  pr: CommunityPR;
  isQuickWin: boolean;
  area: string | null;
  isStale: boolean;
  daysSinceUpdate: number;
  linearTicketId: string | null; // CPR-NNN identifier
  linearTicketDbId: string | null; // Linear UUID (for API calls)
}

export interface WeeklyStats {
  totalOpen: number;
  newThisWeek: PRAnalysis[];
  pickedUpByCMS: Array<{ prNumber: number; title: string; cmsIdentifier: string }>;
  stalePRs: PRAnalysis[];
  quickWins: PRAnalysis[];
}

export interface ActionInputs {
  githubToken: string;
  linearApiKey: string;
  cprTeamId: string;
  cmsTeamId: string;
  projectId: string;
  triageViewUrl: string;
  postToNotion: boolean;
  notionApiKey: string | null;
  notionDatabaseId: string | null;
  labelMap: Map<string, string> | null;
}
