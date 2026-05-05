"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var core4 = __toESM(require("@actions/core"));

// src/lib/github.ts
var github = __toESM(require("@actions/github"));
var OWNER = "strapi";
var REPO = "strapi";
var octokit;
function initGitHub(token) {
  octokit = github.getOctokit(token);
}
async function fetchInternalAuthors(org) {
  const members = await octokit.paginate(octokit.rest.orgs.listMembers, {
    org,
    per_page: 100
  });
  return new Set(members.map((m) => m.login));
}
function isBot(login) {
  return login.includes("[bot]") || login === "dependabot" || login === "renovate";
}
function mapPRToCommunityPR(pr) {
  return {
    number: pr.number,
    title: pr.title,
    body: pr.body ?? "",
    author: pr.user?.login ?? "unknown",
    labels: pr.labels.map((l) => l.name ?? ""),
    additions: pr.additions ?? 0,
    deletions: pr.deletions ?? 0,
    changedFiles: pr.changed_files ?? 0,
    files: [],
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    url: pr.html_url,
    headSha: pr.head.sha
  };
}
async function fetchOpenCommunityPRs(internalAuthors) {
  const allPRs = [];
  let page = 1;
  while (allPRs.length < 500) {
    const response = await octokit.rest.pulls.list({
      owner: OWNER,
      repo: REPO,
      state: "open",
      per_page: 100,
      page
    });
    if (response.data.length === 0) break;
    for (const pr of response.data) {
      if (allPRs.length >= 500) break;
      if (pr.draft) continue;
      const login = pr.user?.login ?? "";
      if (isBot(login)) continue;
      if (internalAuthors.has(login)) continue;
      if (pr.author_association === "MEMBER" || pr.author_association === "OWNER") continue;
      allPRs.push({
        number: pr.number,
        title: pr.title,
        body: "",
        // filled by per-PR detail fetch below
        author: pr.user?.login ?? "unknown",
        labels: pr.labels.map((l) => l.name ?? ""),
        additions: 0,
        // filled below
        deletions: 0,
        // filled below
        changedFiles: 0,
        // filled below
        files: [],
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        url: pr.html_url,
        headSha: pr.head.sha
      });
    }
    if (response.data.length < 100) break;
    page++;
  }
  for (let i = 0; i < allPRs.length; i += 10) {
    const batch = allPRs.slice(i, i + 10);
    await Promise.all(
      batch.map(async (pr) => {
        try {
          const detail = await octokit.rest.pulls.get({
            owner: OWNER,
            repo: REPO,
            pull_number: pr.number
          });
          pr.additions = detail.data.additions;
          pr.deletions = detail.data.deletions;
          pr.changedFiles = detail.data.changed_files;
          pr.body = detail.data.body ?? "";
        } catch {
        }
      })
    );
    if (i + 10 < allPRs.length) await new Promise((r) => setTimeout(r, 1e3));
  }
  return allPRs;
}
async function fetchPR(prNumber) {
  const { data } = await octokit.rest.pulls.get({
    owner: OWNER,
    repo: REPO,
    pull_number: prNumber
  });
  return mapPRToCommunityPR(data);
}
async function fetchPRFiles(prNumber) {
  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner: OWNER,
    repo: REPO,
    pull_number: prNumber,
    per_page: 100
  });
  return files.map((f) => f.filename);
}
async function postComment(prNumber, body) {
  await octokit.rest.issues.createComment({
    owner: OWNER,
    repo: REPO,
    issue_number: prNumber,
    body
  });
}
async function fetchCIStatus(sha) {
  const { data } = await octokit.rest.repos.getCombinedStatusForRef({
    owner: OWNER,
    repo: REPO,
    ref: sha
  });
  return data.state === "success" || data.total_count === 0;
}
async function appendToPRBody(prNumber, appendText) {
  const { data } = await octokit.rest.pulls.get({
    owner: OWNER,
    repo: REPO,
    pull_number: prNumber
  });
  const currentBody = data.body ?? "";
  if (currentBody.includes(appendText)) {
    return;
  }
  const newBody = currentBody + "\n\n---\n" + appendText;
  await octokit.rest.pulls.update({
    owner: OWNER,
    repo: REPO,
    pull_number: prNumber,
    body: newBody
  });
}

// src/lib/linear.ts
var import_sdk = require("@linear/sdk");
var linearClient;
function initLinear(apiKey) {
  linearClient = new import_sdk.LinearClient({ apiKey });
}
async function resolveTeamLabels(teamId, preloaded) {
  if (preloaded !== null) return new Map(preloaded);
  return loadTeamLabels(teamId);
}
async function loadTeamLabels(teamId) {
  const team = await linearClient.team(teamId);
  const labelMap = /* @__PURE__ */ new Map();
  let cursor = void 0;
  while (true) {
    const page = await team.labels({ first: 100, after: cursor });
    for (const label of page.nodes) {
      labelMap.set(label.name, label.id);
    }
    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor ?? void 0;
    if (!cursor) break;
  }
  return labelMap;
}
async function ensureLabel(labelMap, teamId, name, color) {
  const existing = labelMap.get(name);
  if (existing) return existing;
  try {
    const result = await linearClient.createIssueLabel({
      teamId,
      name,
      color: color ?? "#6B7280"
    });
    const label = await result.issueLabel;
    if (!label) throw new Error(`Failed to create label: ${name}`);
    labelMap.set(name, label.id);
    return label.id;
  } catch (err) {
    if (String(err).includes("Duplicate") || String(err).includes("already exists")) {
      const fresh = await loadTeamLabels(teamId);
      const id = fresh.get(name);
      if (id) {
        labelMap.set(name, id);
        return id;
      }
    }
    throw err;
  }
}
function buildDescription(pr, analysis) {
  const totalLOC = pr.additions + pr.deletions;
  const area = analysis.area ?? "unknown";
  const quickWin = analysis.isQuickWin ? "yes" : "no";
  const body = pr.body || "_No description provided._";
  return [
    `**Author:** @${pr.author}`,
    `**Area:** ${area}`,
    `**Quick win:** ${quickWin} (${totalLOC} LOC, ${pr.changedFiles} files)`,
    `**Age:** ${analysis.daysSinceUpdate} days`,
    `**GitHub:** ${pr.url}`,
    "",
    "---",
    "",
    body
  ].join("\n");
}
async function buildLabelIds(analysis, labelMap, teamId) {
  const labelIds = [];
  if (analysis.area) labelIds.push(await ensureLabel(labelMap, teamId, analysis.area));
  if (analysis.isQuickWin)
    labelIds.push(await ensureLabel(labelMap, teamId, "quick-win", "#22C55E"));
  if (analysis.isStale) labelIds.push(await ensureLabel(labelMap, teamId, "stale", "#EF4444"));
  return labelIds;
}
async function findTicketByPRNumber(teamId, prNumber) {
  const result = await linearClient.issues({
    filter: {
      team: { id: { eq: teamId } },
      title: { startsWith: `PR #${prNumber}:` }
    },
    first: 1
  });
  const issue = result.nodes[0];
  if (!issue) return null;
  return { id: issue.id, identifier: issue.identifier, url: issue.url };
}
async function fetchAllTicketsByPRNumber(teamId) {
  const map = /* @__PURE__ */ new Map();
  let cursor = void 0;
  while (true) {
    const page = await linearClient.issues({
      filter: {
        team: { id: { eq: teamId } },
        title: { startsWith: "PR #" }
      },
      first: 100,
      after: cursor
    });
    for (const issue of page.nodes) {
      const prNumber = matchPRNumber(issue.title);
      if (prNumber !== null) {
        map.set(prNumber, { id: issue.id, identifier: issue.identifier, url: issue.url });
      }
    }
    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor ?? void 0;
    if (!cursor) break;
  }
  return map;
}
async function createTicket(pr, analysis, teamId, projectId, labelMap) {
  const title = `PR #${pr.number}: ${pr.title}`;
  const description = buildDescription(pr, analysis);
  const labelIds = await buildLabelIds(analysis, labelMap, teamId);
  const result = await linearClient.createIssue({
    teamId,
    projectId,
    title,
    description,
    labelIds
  });
  const issue = await result.issue;
  if (!issue) throw new Error(`Failed to create Linear issue for PR #${pr.number}`);
  await linearClient.createAttachment({
    issueId: issue.id,
    title: "GitHub PR",
    url: pr.url
  });
  return {
    identifier: issue.identifier,
    url: issue.url
  };
}
async function updateTicket(issueId, pr, analysis, labelMap, teamId) {
  const title = `PR #${pr.number}: ${pr.title}`;
  const description = buildDescription(pr, analysis);
  const labelIds = await buildLabelIds(analysis, labelMap, teamId);
  await linearClient.updateIssue(issueId, { title, description, labelIds });
}
async function updateTicketLabels(issueId, analysis, labelMap, teamId) {
  const labelIds = await buildLabelIds(analysis, labelMap, teamId);
  await linearClient.updateIssue(issueId, { labelIds });
}
var PR_NUMBER_RE = /PR #(\d+)/;
function matchPRNumber(title) {
  const match = PR_NUMBER_RE.exec(title);
  return match ? parseInt(match[1], 10) : null;
}
async function fetchCMSPickups(cmsTeamId, since) {
  const results = [];
  let cursor = void 0;
  while (true) {
    const page = await linearClient.issues({
      filter: {
        team: { id: { eq: cmsTeamId } },
        title: { contains: "PR #" },
        createdAt: { gte: since }
      },
      after: cursor,
      first: 50
    });
    for (const issue of page.nodes) {
      const prNumber = matchPRNumber(issue.title);
      if (prNumber === null) continue;
      results.push({
        prNumber,
        title: issue.title,
        cmsIdentifier: issue.identifier
      });
    }
    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor ?? void 0;
    if (!cursor) break;
  }
  return results;
}
async function postProjectUpdate(projectId, body) {
  await linearClient.createProjectUpdate({ projectId, body });
}

// src/lib/notion.ts
var import_client = require("@notionhq/client");
var notion;
function initNotion(apiKey) {
  notion = new import_client.Client({ auth: apiKey });
}
function truncate(text, limit = 1900) {
  return text.length <= limit ? text : text.slice(0, limit) + "\u2026";
}
function richText(text, url) {
  return {
    type: "text",
    text: url ? { content: truncate(text, 100), link: { url } } : { content: truncate(text) }
  };
}
function cell(text, url) {
  return [richText(text, url)];
}
function tableRow(cells) {
  return { object: "block", type: "table_row", table_row: { cells } };
}
function heading1(text) {
  return { object: "block", type: "heading_1", heading_1: { rich_text: [richText(text)] } };
}
function heading2(text) {
  return { object: "block", type: "heading_2", heading_2: { rich_text: [richText(text)] } };
}
function bullet(text) {
  return {
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: { rich_text: [richText(text)] }
  };
}
function divider() {
  return { object: "block", type: "divider", divider: {} };
}
function linearUrl(identifier) {
  return `https://linear.app/strapi/issue/${identifier}`;
}
async function appendBlocks(blockId, blocks) {
  await notion.blocks.children.append({ block_id: blockId, children: blocks });
}
async function appendTable(blockId, data) {
  const resp = await notion.blocks.children.append({
    block_id: blockId,
    children: [
      {
        object: "block",
        type: "table",
        table: {
          table_width: data.width,
          has_column_header: true,
          has_row_header: false,
          children: [data.headerRow]
        }
      }
    ]
  });
  const tableId = resp.results[0].id;
  for (let i = 0; i < data.dataRows.length; i += 100) {
    await notion.blocks.children.append({
      block_id: tableId,
      children: data.dataRows.slice(i, i + 100)
    });
  }
}
function quickWinsTableData(analyses) {
  return {
    width: 7,
    headerRow: tableRow([
      cell("PR"),
      cell("Title"),
      cell("Author"),
      cell("Area"),
      cell("Age"),
      cell("LOC"),
      cell("Linear")
    ]),
    dataRows: analyses.map(
      ({ pr, area, daysSinceUpdate, linearTicketId }) => tableRow([
        cell(`#${pr.number}`, pr.url),
        cell(truncate(pr.title, 100)),
        cell(pr.author),
        cell(area ?? "\u2014"),
        cell(`${daysSinceUpdate}d`),
        cell(`${pr.additions + pr.deletions}`),
        linearTicketId ? cell(linearTicketId, linearUrl(linearTicketId)) : cell("\u2014")
      ])
    )
  };
}
function newThisWeekTableData(analyses) {
  return {
    width: 5,
    headerRow: tableRow([
      cell("PR"),
      cell("Title"),
      cell("Author"),
      cell("Area"),
      cell("Linear")
    ]),
    dataRows: analyses.map(
      ({ pr, area, linearTicketId }) => tableRow([
        cell(`#${pr.number}`, pr.url),
        cell(truncate(pr.title, 100)),
        cell(pr.author),
        cell(area ?? "\u2014"),
        linearTicketId ? cell(linearTicketId, linearUrl(linearTicketId)) : cell("\u2014")
      ])
    )
  };
}
function stalePRsTableData(analyses) {
  return {
    width: 6,
    headerRow: tableRow([
      cell("PR"),
      cell("Title"),
      cell("Author"),
      cell("Area"),
      cell("Age"),
      cell("Linear")
    ]),
    dataRows: analyses.map(
      ({ pr, area, daysSinceUpdate, linearTicketId }) => tableRow([
        cell(`#${pr.number}`, pr.url),
        cell(truncate(pr.title, 100)),
        cell(pr.author),
        cell(area ?? "\u2014"),
        cell(`${daysSinceUpdate}d`),
        linearTicketId ? cell(linearTicketId, linearUrl(linearTicketId)) : cell("\u2014")
      ])
    )
  };
}
function pickedUpTableData(pickups) {
  return {
    width: 3,
    headerRow: tableRow([cell("PR"), cell("Title"), cell("Linear (CMS)")]),
    dataRows: pickups.map(
      ({ prNumber, title, cmsIdentifier }) => tableRow([
        cell(`#${prNumber}`, `https://github.com/strapi/strapi/pull/${prNumber}`),
        cell(truncate(title, 100)),
        cell(cmsIdentifier, linearUrl(cmsIdentifier))
      ])
    )
  };
}
function allPRsTableData(analyses) {
  const sorted = [...analyses].sort(
    (a, b) => (a.area ?? "zzz").localeCompare(b.area ?? "zzz") || b.daysSinceUpdate - a.daysSinceUpdate
  );
  return {
    width: 7,
    headerRow: tableRow([
      cell("PR"),
      cell("Title"),
      cell("Author"),
      cell("Area"),
      cell("Age"),
      cell("Quick Win"),
      cell("Linear")
    ]),
    dataRows: sorted.map(
      ({ pr, area, daysSinceUpdate, isQuickWin: isQuickWin2, linearTicketId }) => tableRow([
        cell(`#${pr.number}`, pr.url),
        cell(truncate(pr.title, 100)),
        cell(pr.author),
        cell(area ?? "\u2014"),
        cell(`${daysSinceUpdate}d`),
        cell(isQuickWin2 ? "\u26A1 Yes" : "No"),
        linearTicketId ? cell(linearTicketId, linearUrl(linearTicketId)) : cell("\u2014")
      ])
    )
  };
}
async function createReportPage(databaseId, stats, analyses, generatedAt) {
  const dateStr = generatedAt.slice(0, 10);
  const pageTitle = `Community PR Report \u2014 ${dateStr}`;
  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: { title: { title: [{ text: { content: pageTitle } }] } },
    children: [
      heading1(`\u{1F4CA} Community PR Report \u2014 ${dateStr}`),
      heading2("Summary"),
      bullet(`Total open PRs: ${stats.totalOpen}`),
      bullet(`Quick wins: ${stats.quickWins.length}`),
      bullet(`Stale (>30d): ${stats.stalePRs.length}`),
      bullet(`New this week: ${stats.newThisWeek.length}`),
      bullet(`Picked up by CMS this week: ${stats.pickedUpByCMS.length}`),
      divider()
    ]
  });
  const pageId = response.id;
  await appendBlocks(pageId, [heading2("\u26A1 Quick Wins")]);
  if (stats.quickWins.length > 0) await appendTable(pageId, quickWinsTableData(stats.quickWins));
  else await appendBlocks(pageId, [bullet("None this week")]);
  await appendBlocks(pageId, [divider()]);
  await appendBlocks(pageId, [heading2("\u{1F195} New This Week")]);
  if (stats.newThisWeek.length > 0) await appendTable(pageId, newThisWeekTableData(stats.newThisWeek));
  else await appendBlocks(pageId, [bullet("None this week")]);
  await appendBlocks(pageId, [divider()]);
  await appendBlocks(pageId, [heading2("\u{1F570} Stale PRs (>30 days no activity)")]);
  if (stats.stalePRs.length > 0) await appendTable(pageId, stalePRsTableData(stats.stalePRs));
  else await appendBlocks(pageId, [bullet("None this week")]);
  await appendBlocks(pageId, [divider()]);
  await appendBlocks(pageId, [heading2("\u{1F680} Picked Up by CMS This Week")]);
  if (stats.pickedUpByCMS.length > 0) await appendTable(pageId, pickedUpTableData(stats.pickedUpByCMS));
  else await appendBlocks(pageId, [bullet("None this week")]);
  await appendBlocks(pageId, [divider()]);
  await appendBlocks(pageId, [heading2("\u{1F4CB} All Open PRs")]);
  if (analyses.length > 0) await appendTable(pageId, allPRsTableData(analyses));
  else await appendBlocks(pageId, [bullet("No open PRs")]);
}

// src/lib/analyzer.ts
function isQuickWin(pr) {
  return pr.additions + pr.deletions <= 100 && pr.changedFiles <= 5;
}
function detectArea(labels, files) {
  const sourceLabel = labels.find((l) => l.startsWith("source: "));
  if (sourceLabel) {
    const m = sourceLabel.match(/source:\s*(?:core:|plugin:)(.+)/);
    if (m) return m[1].trim();
  }
  for (const f of files) {
    const m = f.match(/packages\/(?:core|plugins)\/([^/]+)/);
    if (m) return m[1];
  }
  return null;
}
function daysSince(dateStr) {
  const ms = new Date(dateStr).getTime();
  if (Number.isNaN(ms)) throw new Error(`Invalid date: ${dateStr}`);
  return Math.floor((Date.now() - ms) / 864e5);
}
function isStale(pr) {
  return daysSince(pr.updatedAt) > 30;
}
function isNewThisWeek(pr) {
  return daysSince(pr.createdAt) <= 7;
}

// src/modes/sync-pr.ts
async function syncPR(prNumber, triggerLabel, inputs) {
  const pr = await fetchPR(prNumber);
  const files = await fetchPRFiles(prNumber);
  pr.files = files;
  const analysis = {
    pr,
    isQuickWin: isQuickWin(pr),
    area: detectArea(pr.labels, files),
    isStale: isStale(pr),
    daysSinceUpdate: daysSince(pr.updatedAt),
    linearTicketId: null,
    linearTicketDbId: null
  };
  const labelMap = await resolveTeamLabels(inputs.cprTeamId, inputs.labelMap);
  const existing = await findTicketByPRNumber(inputs.cprTeamId, prNumber) ?? await findTicketByPRNumber(inputs.cmsTeamId, prNumber);
  if (!existing) {
    const ticket = await createTicket(
      pr,
      analysis,
      inputs.cprTeamId,
      inputs.projectId,
      labelMap
    );
    analysis.linearTicketId = ticket.identifier;
    await postComment(
      prNumber,
      `This PR has been added to our community triage board as **${ticket.identifier}**.`
    );
    await appendToPRBody(prNumber, `Fixes ${ticket.identifier}`);
  } else {
    analysis.linearTicketId = existing.identifier;
    analysis.linearTicketDbId = existing.id;
    await updateTicket(existing.id, pr, analysis, labelMap, inputs.cprTeamId);
  }
}

// src/modes/sync-all.ts
var core = __toESM(require("@actions/core"));
async function syncAll(inputs) {
  const internalAuthors = await fetchInternalAuthors("strapi");
  const prs = await fetchOpenCommunityPRs(internalAuthors);
  core.info(`Found ${prs.length} open community PRs to sync`);
  const [cprTickets, cmsTickets, labelMap] = await Promise.all([
    fetchAllTicketsByPRNumber(inputs.cprTeamId),
    fetchAllTicketsByPRNumber(inputs.cmsTeamId),
    resolveTeamLabels(inputs.cprTeamId, inputs.labelMap)
  ]);
  core.info(`Loaded ${cprTickets.size} CPR tickets, ${cmsTickets.size} CMS tickets`);
  let created = 0;
  let updated = 0;
  let failed = 0;
  for (let i = 0; i < prs.length; i += 10) {
    const batch = prs.slice(i, i + 10);
    await Promise.all(
      batch.map(async (pr) => {
        try {
          const hasSourceLabel = pr.labels.some((l) => l.startsWith("source: "));
          const files = hasSourceLabel ? [] : await fetchPRFiles(pr.number);
          pr.files = files;
          const analysis = {
            pr,
            isQuickWin: isQuickWin(pr),
            area: detectArea(pr.labels, files),
            isStale: isStale(pr),
            daysSinceUpdate: daysSince(pr.updatedAt),
            linearTicketId: null,
            linearTicketDbId: null
          };
          const cprTicket = cprTickets.get(pr.number) ?? null;
          const cmsTicket = cmsTickets.get(pr.number) ?? null;
          if (cprTicket) {
            analysis.linearTicketId = cprTicket.identifier;
            analysis.linearTicketDbId = cprTicket.id;
            await updateTicket(cprTicket.id, pr, analysis, labelMap, inputs.cprTeamId);
            updated++;
          } else if (cmsTicket) {
            core.info(`PR #${pr.number} already in CMS as ${cmsTicket.identifier}, skipping`);
          } else {
            const ticket = await createTicket(
              pr,
              analysis,
              inputs.cprTeamId,
              inputs.projectId,
              labelMap
            );
            try {
              await postComment(
                pr.number,
                `This PR has been added to our community triage board as **${ticket.identifier}**.`
              );
              await appendToPRBody(pr.number, `Fixes ${ticket.identifier}`);
            } catch (err) {
              core.warning(`PR #${pr.number}: could not update GitHub (no write access?) \u2014 ${err}`);
            }
            created++;
            core.info(`Created ${ticket.identifier} for PR #${pr.number}`);
          }
        } catch (err) {
          failed++;
          core.warning(`PR #${pr.number}: sync failed \u2014 ${err}`);
        }
      })
    );
    if (i + 10 < prs.length) await new Promise((r) => setTimeout(r, 1e3));
  }
  core.info(`Sync complete: ${created} created, ${updated} updated, ${failed} failed`);
}

// src/modes/weekly-report.ts
var core2 = __toESM(require("@actions/core"));
function buildLinearUpdateBody(stats, viewUrl) {
  const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const prLine = (a, extra) => {
    const ticket = a.linearTicketId ? ` \xB7 [${a.linearTicketId}](https://linear.app/strapi/issue/${a.linearTicketId})` : "";
    const suffix = extra ? ` \u2014 ${extra}` : "";
    return `- [#${a.pr.number}](${a.pr.url}) (${a.area ?? "unknown"})${ticket}${suffix}`;
  };
  const quickWinLines = stats.quickWins.map((a) => prLine(a, `${a.pr.additions + a.pr.deletions} LOC`)).join("\n");
  const newThisWeekLines = stats.newThisWeek.map((a) => prLine(a)).join("\n");
  return [
    `\u{1F4CA} Weekly Community PR Report \u2014 ${date}`,
    "",
    `\u{1F4C1} Total open PRs: ${stats.totalOpen}`,
    `\u{1F195} New this week: ${stats.newThisWeek.length}`,
    `\u{1F680} Picked up by CMS: ${stats.pickedUpByCMS.length}`,
    `\u{1F570} Stale (>30d no activity): ${stats.stalePRs.length}`,
    "",
    "\u{1F195} New this week:",
    newThisWeekLines || "- None this week",
    "",
    "\u26A1 Quick wins:",
    quickWinLines || "- None this week",
    "",
    viewUrl ? `\u2192 [View all PRs in triage](${viewUrl})` : ""
  ].filter((line) => line !== void 0).join("\n").trim();
}
async function weeklyReport(inputs) {
  const internalAuthors = await fetchInternalAuthors("strapi");
  const prs = await fetchOpenCommunityPRs(internalAuthors);
  const [cprTickets, cmsTickets] = await Promise.all([
    fetchAllTicketsByPRNumber(inputs.cprTeamId),
    fetchAllTicketsByPRNumber(inputs.cmsTeamId)
  ]);
  core2.info(`Loaded ${cprTickets.size} CPR tickets, ${cmsTickets.size} CMS tickets`);
  const analyses = [];
  for (let i = 0; i < prs.length; i += 10) {
    const batch = prs.slice(i, i + 10);
    const batchAnalyses = await Promise.all(
      batch.map(async (pr) => {
        try {
          const hasSourceLabel = pr.labels.some((l) => l.startsWith("source: "));
          const files = hasSourceLabel ? [] : await fetchPRFiles(pr.number);
          pr.files = files;
          const ticket = cprTickets.get(pr.number) ?? cmsTickets.get(pr.number) ?? null;
          return {
            pr,
            isQuickWin: isQuickWin(pr),
            area: detectArea(pr.labels, files),
            isStale: isStale(pr),
            daysSinceUpdate: daysSince(pr.updatedAt),
            linearTicketId: ticket?.identifier ?? null,
            linearTicketDbId: ticket?.id ?? null
          };
        } catch (err) {
          core2.warning(`PR #${pr.number}: skipping due to error \u2014 ${err}`);
          return null;
        }
      })
    );
    analyses.push(...batchAnalyses.filter(Boolean));
    if (i + 10 < prs.length) await new Promise((r) => setTimeout(r, 1e3));
  }
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const cmsPickups = await fetchCMSPickups(inputs.cmsTeamId, since);
  const quickWinCandidates = analyses.filter((a) => a.isQuickWin);
  const ciResults = await Promise.all(
    quickWinCandidates.map(async (a) => {
      try {
        return await fetchCIStatus(a.pr.headSha);
      } catch {
        return false;
      }
    })
  );
  const quickWins = quickWinCandidates.filter((_, i) => ciResults[i]).slice(0, 5);
  const stats = {
    totalOpen: analyses.length,
    newThisWeek: analyses.filter((a) => isNewThisWeek(a.pr)),
    pickedUpByCMS: cmsPickups,
    stalePRs: analyses.filter((a) => a.isStale),
    quickWins
  };
  const labelMap = await resolveTeamLabels(inputs.cprTeamId, inputs.labelMap);
  await Promise.all(
    analyses.filter((a) => a.linearTicketDbId !== null && a.linearTicketId?.startsWith("CPR-")).map(async (a) => {
      try {
        await updateTicketLabels(a.linearTicketDbId, a, labelMap, inputs.cprTeamId);
      } catch (err) {
        core2.warning(`Failed to update labels for ${a.linearTicketId}: ${err}`);
      }
    })
  );
  const body = buildLinearUpdateBody(stats, inputs.triageViewUrl);
  await postProjectUpdate(inputs.projectId, body);
  if (inputs.postToNotion && inputs.notionDatabaseId) {
    await createReportPage(
      inputs.notionDatabaseId,
      stats,
      analyses,
      (/* @__PURE__ */ new Date()).toISOString()
    );
  }
}

// src/modes/notion-report.ts
var core3 = __toESM(require("@actions/core"));
async function notionReport(inputs) {
  if (!inputs.notionDatabaseId)
    throw new Error("notion-database-id is required for notion-report mode");
  const internalAuthors = await fetchInternalAuthors("strapi");
  const prs = await fetchOpenCommunityPRs(internalAuthors);
  const [cprTickets, cmsTickets] = await Promise.all([
    fetchAllTicketsByPRNumber(inputs.cprTeamId),
    fetchAllTicketsByPRNumber(inputs.cmsTeamId)
  ]);
  core3.info(`Loaded ${cprTickets.size} CPR tickets, ${cmsTickets.size} CMS tickets`);
  const analyses = [];
  for (let i = 0; i < prs.length; i += 10) {
    const batch = prs.slice(i, i + 10);
    const batchAnalyses = await Promise.all(
      batch.map(async (pr) => {
        try {
          const hasSourceLabel = pr.labels.some((l) => l.startsWith("source: "));
          const files = hasSourceLabel ? [] : await fetchPRFiles(pr.number);
          pr.files = files;
          const ticket = cprTickets.get(pr.number) ?? cmsTickets.get(pr.number) ?? null;
          return {
            pr,
            isQuickWin: isQuickWin(pr),
            area: detectArea(pr.labels, files),
            isStale: isStale(pr),
            daysSinceUpdate: daysSince(pr.updatedAt),
            linearTicketId: ticket?.identifier ?? null,
            linearTicketDbId: ticket?.id ?? null
          };
        } catch (err) {
          core3.warning(`PR #${pr.number}: skipping due to error \u2014 ${err}`);
          return null;
        }
      })
    );
    analyses.push(...batchAnalyses.filter(Boolean));
    if (i + 10 < prs.length) await new Promise((r) => setTimeout(r, 1e3));
  }
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const cmsPickups = await fetchCMSPickups(inputs.cmsTeamId, since);
  const stats = {
    totalOpen: analyses.length,
    newThisWeek: analyses.filter((a) => isNewThisWeek(a.pr)),
    pickedUpByCMS: cmsPickups,
    stalePRs: analyses.filter((a) => a.isStale),
    quickWins: analyses.filter((a) => a.isQuickWin).slice(0, 5)
  };
  await createReportPage(inputs.notionDatabaseId, stats, analyses, (/* @__PURE__ */ new Date()).toISOString());
}

// src/index.ts
function parseLabels(raw) {
  if (!raw) return null;
  try {
    return new Map(Object.entries(JSON.parse(raw)));
  } catch {
    return null;
  }
}
function loadInputs() {
  return {
    githubToken: core4.getInput("github-token", { required: true }),
    linearApiKey: core4.getInput("linear-api-key", { required: true }),
    cprTeamId: core4.getInput("linear-cpr-team-id", { required: true }),
    cmsTeamId: core4.getInput("linear-cms-team-id", { required: true }),
    projectId: core4.getInput("linear-project-id", { required: true }),
    triageViewUrl: core4.getInput("linear-triage-view-url") || "",
    postToNotion: core4.getInput("post-to-notion") === "true",
    notionApiKey: core4.getInput("notion-api-key") || null,
    notionDatabaseId: core4.getInput("notion-database-id") || null,
    labelMap: parseLabels(core4.getInput("linear-labels"))
  };
}
async function run() {
  const mode = core4.getInput("mode", { required: true });
  const inputs = loadInputs();
  initGitHub(inputs.githubToken);
  initLinear(inputs.linearApiKey);
  if (inputs.postToNotion || mode === "notion-report") {
    if (!inputs.notionApiKey) throw new Error("notion-api-key is required for Notion report");
    initNotion(inputs.notionApiKey);
  }
  switch (mode) {
    case "sync-pr": {
      const prNumber = parseInt(core4.getInput("pr-number", { required: true }), 10);
      if (isNaN(prNumber)) throw new Error("pr-number must be a valid integer");
      const triggerLabel = core4.getInput("trigger-label") || null;
      await syncPR(prNumber, triggerLabel, inputs);
      break;
    }
    case "sync-all":
      await syncAll(inputs);
      break;
    case "linear-weekly-report":
      await weeklyReport(inputs);
      break;
    case "notion-report":
      await notionReport(inputs);
      break;
    default:
      core4.setFailed(`Unknown mode: ${mode}`);
  }
}
run().catch((err) => core4.setFailed(err instanceof Error ? err.message : String(err)));
