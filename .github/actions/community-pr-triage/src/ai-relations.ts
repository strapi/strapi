import Anthropic from '@anthropic-ai/sdk';
import { LinearClient } from '@linear/sdk';
import { LINEAR_CPR_TEAM_ID, LINEAR_CMS_TEAM_ID, LINEAR_CMS_GITHUB_TEAM_ID } from './config.js';
import { matchPRNumber } from './syncer.js';
import type { ScoredPR } from './types.js';

const EVAL_MODEL = 'claude-haiku-4-5-20251001';
const DISCOVERY_MODEL = 'claude-sonnet-4-6';

interface RelationCandidate {
  issueId: string;
  issueTitle: string;
  issueDescription: string;
  source: 'explicit' | 'discovered';
}

interface EvaluatedRelation {
  issueId: string;
  issueTitle: string;
  related: boolean;
  confidence: number;
  reason: string;
}

// --- A: Filter bad matches (Haiku) ---

export async function evaluateRelation(
  anthropic: Anthropic,
  prTitle: string,
  prBody: string,
  candidateTitle: string,
  candidateDescription: string
): Promise<{ related: boolean; confidence: number; reason: string }> {
  const candidateSnippet = candidateDescription.slice(0, 1000);
  const prSnippet = prBody.slice(0, 1000);

  const response = await anthropic.messages.create({
    model: EVAL_MODEL,
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: `Determine if this PR and Linear issue are related (addressing the same bug, feature, or area of code).

PR: "${prTitle}"
${prSnippet}

Linear issue: "${candidateTitle}"
${candidateSnippet}

Respond in exactly this JSON format, nothing else:
{"related": true/false, "confidence": 0.0-1.0, "reason": "one sentence"}`,
      },
    ],
  });

  try {
    let text = response.content[0].type === 'text' ? response.content[0].text : '';
    // Strip markdown code block wrapper if present
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];
    const parsed = JSON.parse(text);
    return {
      related: Boolean(parsed.related),
      confidence: Number(parsed.confidence) || 0,
      reason: String(parsed.reason || ''),
    };
  } catch {
    // If parsing fails, return confidence below the 0.6 threshold so the relation is excluded
    return { related: true, confidence: 0.5, reason: 'Failed to parse AI response' };
  }
}

// --- B: Discover hidden relations (Sonnet) ---

export async function discoverRelatedQueries(
  anthropic: Anthropic,
  prTitle: string,
  prBody: string,
  area: string
): Promise<string[]> {
  const prSnippet = prBody.slice(0, 1500);

  const response = await anthropic.messages.create({
    model: DISCOVERY_MODEL,
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `Given this Strapi community PR, suggest 3 short search queries to find related Linear issues (bugs, features, or discussions about the same area/problem). Focus on the core problem, not the PR itself.

PR: "${prTitle}"
Area: ${area}
${prSnippet}

Respond with exactly 3 search queries, one per line, nothing else. Each query should be 3-6 words.`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return text
    .trim()
    .split('\n')
    .filter((q) => q.trim().length > 0)
    .slice(0, 3);
}

// --- Main orchestration ---

export async function findAIRelations(
  scoredPRs: ScoredPR[],
  linearClient: LinearClient
): Promise<Map<number, EvaluatedRelation[]>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    throw new Error('ANTHROPIC_API_KEY environment variable is required for AI relations');

  const anthropic = new Anthropic({ apiKey });
  const results = new Map<number, EvaluatedRelation[]>();

  // Only link to issues from these teams
  const allowedTeamIds = new Set([
    LINEAR_CPR_TEAM_ID,
    LINEAR_CMS_TEAM_ID,
    LINEAR_CMS_GITHUB_TEAM_ID,
  ]);

  // Build a set of existing PR issue IDs to skip self-matches
  const prIssueIds = new Set<string>();
  let hasNext = true;
  let cursor: string | undefined;

  while (hasNext) {
    const result = await linearClient.issues({
      filter: { team: { id: { eq: LINEAR_CPR_TEAM_ID } } },
      after: cursor,
      first: 100,
    });
    for (const issue of result.nodes) {
      const prNum = matchPRNumber(issue.title);
      if (prNum) prIssueIds.add(issue.id);
    }
    hasNext = result.pageInfo.hasNextPage;
    cursor = result.pageInfo.endCursor;
  }

  let processed = 0;
  for (const scored of scoredPRs) {
    processed++;
    const candidates: RelationCandidate[] = [];
    const seenIds = new Set<string>();

    // A: Evaluate explicitly referenced issues
    for (const linked of scored.linkedIssues) {
      const ghIssueNum = linked.issue.number;
      const searchTerm = `github.com/strapi/strapi/issues/${ghIssueNum}`;

      try {
        const searchResult = await linearClient.searchIssues(searchTerm, { first: 10 });
        for (const node of searchResult.nodes) {
          if (prIssueIds.has(node.id) || seenIds.has(node.id)) continue;
          const team = await node.team;
          if (!team || !allowedTeamIds.has(team.id)) continue;
          seenIds.add(node.id);
          candidates.push({
            issueId: node.id,
            issueTitle: node.title,
            issueDescription: node.description ?? '',
            source: 'explicit',
          });
        }

        // Search CMS-Github team
        try {
          const cmsResult = await linearClient.issues({
            filter: {
              team: { id: { eq: LINEAR_CMS_GITHUB_TEAM_ID } },
              attachments: { url: { contains: `strapi/strapi/issues/${ghIssueNum}` } },
            },
            first: 5,
          });
          for (const node of cmsResult.nodes) {
            if (prIssueIds.has(node.id) || seenIds.has(node.id)) continue;
            seenIds.add(node.id);
            candidates.push({
              issueId: node.id,
              issueTitle: node.title,
              issueDescription: node.description ?? '',
              source: 'explicit',
            });
          }
        } catch {
          // CMS-Github search failed
        }
      } catch {
        // Search failed
      }
    }

    // B: Discover hidden relations
    try {
      const queries = await discoverRelatedQueries(
        anthropic,
        scored.pr.title,
        scored.pr.body,
        scored.area
      );

      for (const query of queries) {
        try {
          const searchResult = await linearClient.searchIssues(query, { first: 5 });
          for (const node of searchResult.nodes) {
            if (prIssueIds.has(node.id) || seenIds.has(node.id)) continue;
            const team = await node.team;
            if (!team || !allowedTeamIds.has(team.id)) continue;
            seenIds.add(node.id);
            candidates.push({
              issueId: node.id,
              issueTitle: node.title,
              issueDescription: node.description ?? '',
              source: 'discovered',
            });
          }
        } catch {
          // Search failed for this query
        }
      }
    } catch {
      // AI discovery failed
    }

    if (candidates.length > 0) {
      console.log(
        `  PR #${scored.pr.number}: ${candidates.length} candidates (${candidates.filter((c) => c.source === 'explicit').length} explicit, ${candidates.filter((c) => c.source === 'discovered').length} discovered)`
      );
    }

    // Evaluate all candidates with AI
    const evaluated: EvaluatedRelation[] = [];
    for (const candidate of candidates) {
      try {
        const result = await evaluateRelation(
          anthropic,
          scored.pr.title,
          scored.pr.body,
          candidate.issueTitle,
          candidate.issueDescription
        );

        if (result.related && result.confidence >= 0.6) {
          evaluated.push({
            issueId: candidate.issueId,
            issueTitle: candidate.issueTitle,
            ...result,
          });
        }
      } catch {
        // Evaluation failed, skip this candidate
      }
    }

    if (evaluated.length > 0) {
      results.set(scored.pr.number, evaluated);
    }

    if (processed % 10 === 0) {
      console.log(`  AI relations: ${processed}/${scoredPRs.length} PRs processed...`);
    }
  }

  return results;
}

export async function syncAIRelations(
  scoredPRs: ScoredPR[]
): Promise<{ relationsCreated: number; relationsSkipped: number }> {
  const linearApiKey = process.env.LINEAR_API_KEY;
  if (!linearApiKey) throw new Error('LINEAR_API_KEY environment variable is required');

  const linearClient = new LinearClient({ apiKey: linearApiKey });
  const stats = { relationsCreated: 0, relationsSkipped: 0 };

  console.log('Running AI-powered relation analysis...');
  const aiRelations = await findAIRelations(scoredPRs, linearClient);

  // Build PR number -> Linear issue ID map
  const prLinearIds = new Map<number, string>();
  let hasNext = true;
  let cursor: string | undefined;

  while (hasNext) {
    const result = await linearClient.issues({
      filter: { team: { id: { eq: LINEAR_CPR_TEAM_ID } } },
      after: cursor,
      first: 100,
    });
    for (const issue of result.nodes) {
      const prNum = matchPRNumber(issue.title);
      if (prNum) prLinearIds.set(prNum, issue.id);
    }
    hasNext = result.pageInfo.hasNextPage;
    cursor = result.pageInfo.endCursor;
  }

  for (const [prNum, relations] of aiRelations) {
    const prIssueId = prLinearIds.get(prNum);
    if (!prIssueId) continue;

    // Get existing relations to avoid duplicates
    const existingRelations = new Set<string>();
    try {
      const prIssue = await linearClient.issue(prIssueId);
      const rels = await prIssue.relations();
      for (const rel of rels.nodes) {
        const related = await rel.relatedIssue;
        if (related) existingRelations.add(related.id);
      }
      const inverseRels = await prIssue.inverseRelations();
      for (const rel of inverseRels.nodes) {
        const related = await rel.issue;
        if (related) existingRelations.add(related.id);
      }
    } catch {
      // Continue with what we have
    }

    for (const rel of relations) {
      if (existingRelations.has(rel.issueId)) {
        stats.relationsSkipped++;
        continue;
      }

      try {
        await linearClient.createIssueRelation({
          issueId: prIssueId,
          relatedIssueId: rel.issueId,
          type: 'related' as any,
        });
        stats.relationsCreated++;
        console.log(
          `  Linked CPR PR #${prNum} ↔ ${rel.issueTitle.slice(0, 60)}... (${(rel.confidence * 100).toFixed(0)}% confidence: ${rel.reason})`
        );
      } catch {
        // Relation creation failed
      }
    }
  }

  return stats;
}
