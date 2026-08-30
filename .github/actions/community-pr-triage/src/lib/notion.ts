import { Client } from '@notionhq/client';
import type { PRAnalysis, WeeklyStats } from './types.js';

let notion: Client;

export function initNotion(apiKey: string): void {
  notion = new Client({ auth: apiKey });
}

// ---------------------------------------------------------------------------
// Rich text / block helpers
// ---------------------------------------------------------------------------

function truncate(text: string, limit = 1900): string {
  return text.length <= limit ? text : text.slice(0, limit) + '…';
}

function richText(text: string, url?: string): object {
  return {
    type: 'text',
    text: url ? { content: truncate(text, 100), link: { url } } : { content: truncate(text) },
  };
}

function cell(text: string, url?: string): object[] {
  return [richText(text, url)];
}

function tableRow(cells: object[][]): object {
  return { object: 'block', type: 'table_row', table_row: { cells } };
}

function heading1(text: string): object {
  return { object: 'block', type: 'heading_1', heading_1: { rich_text: [richText(text)] } };
}

function heading2(text: string): object {
  return { object: 'block', type: 'heading_2', heading_2: { rich_text: [richText(text)] } };
}

function bullet(text: string): object {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [richText(text)] },
  };
}

function divider(): object {
  return { object: 'block', type: 'divider', divider: {} };
}

function linearUrl(identifier: string): string {
  return `https://linear.app/strapi/issue/${identifier}`;
}

// ---------------------------------------------------------------------------
// Table helpers — header and data rows built separately so large tables can
// be appended in batches (Notion caps table.children at 100 per request).
// ---------------------------------------------------------------------------

interface TableData {
  width: number;
  headerRow: object;
  dataRows: object[];
}

async function appendBlocks(blockId: string, blocks: object[]): Promise<void> {
  await notion.blocks.children.append({ block_id: blockId, children: blocks as any });
}

async function appendTable(blockId: string, data: TableData): Promise<void> {
  // Create the table with just the header row to get the table block ID.
  const resp = await notion.blocks.children.append({
    block_id: blockId,
    children: [
      {
        object: 'block',
        type: 'table',
        table: {
          table_width: data.width,
          has_column_header: true,
          has_row_header: false,
          children: [data.headerRow],
        },
      },
    ] as any,
  });

  const tableId = (resp.results[0] as any).id as string;

  // Append data rows in batches of 100.
  for (let i = 0; i < data.dataRows.length; i += 100) {
    await notion.blocks.children.append({
      block_id: tableId,
      children: data.dataRows.slice(i, i + 100) as any,
    });
  }
}

// ---------------------------------------------------------------------------
// Table data builders
// ---------------------------------------------------------------------------

function quickWinsTableData(analyses: PRAnalysis[]): TableData {
  return {
    width: 7,
    headerRow: tableRow([
      cell('PR'),
      cell('Title'),
      cell('Author'),
      cell('Area'),
      cell('Age'),
      cell('LOC'),
      cell('Linear'),
    ]),
    dataRows: analyses.map(({ pr, area, daysSinceUpdate, linearTicketId }) =>
      tableRow([
        cell(`#${pr.number}`, pr.url),
        cell(truncate(pr.title, 100)),
        cell(pr.author),
        cell(area ?? '—'),
        cell(`${daysSinceUpdate}d`),
        cell(`${pr.additions + pr.deletions}`),
        linearTicketId ? cell(linearTicketId, linearUrl(linearTicketId)) : cell('—'),
      ])
    ),
  };
}

function newThisWeekTableData(analyses: PRAnalysis[]): TableData {
  return {
    width: 5,
    headerRow: tableRow([cell('PR'), cell('Title'), cell('Author'), cell('Area'), cell('Linear')]),
    dataRows: analyses.map(({ pr, area, linearTicketId }) =>
      tableRow([
        cell(`#${pr.number}`, pr.url),
        cell(truncate(pr.title, 100)),
        cell(pr.author),
        cell(area ?? '—'),
        linearTicketId ? cell(linearTicketId, linearUrl(linearTicketId)) : cell('—'),
      ])
    ),
  };
}

function stalePRsTableData(analyses: PRAnalysis[]): TableData {
  return {
    width: 6,
    headerRow: tableRow([
      cell('PR'),
      cell('Title'),
      cell('Author'),
      cell('Area'),
      cell('Age'),
      cell('Linear'),
    ]),
    dataRows: analyses.map(({ pr, area, daysSinceUpdate, linearTicketId }) =>
      tableRow([
        cell(`#${pr.number}`, pr.url),
        cell(truncate(pr.title, 100)),
        cell(pr.author),
        cell(area ?? '—'),
        cell(`${daysSinceUpdate}d`),
        linearTicketId ? cell(linearTicketId, linearUrl(linearTicketId)) : cell('—'),
      ])
    ),
  };
}

function pickedUpTableData(pickups: WeeklyStats['pickedUpByCMS']): TableData {
  return {
    width: 3,
    headerRow: tableRow([cell('PR'), cell('Title'), cell('Linear (CMS)')]),
    dataRows: pickups.map(({ prNumber, title, cmsIdentifier }) =>
      tableRow([
        cell(`#${prNumber}`, `https://github.com/strapi/strapi/pull/${prNumber}`),
        cell(truncate(title, 100)),
        cell(cmsIdentifier, linearUrl(cmsIdentifier)),
      ])
    ),
  };
}

function allPRsTableData(analyses: PRAnalysis[]): TableData {
  const sorted = [...analyses].sort(
    (a, b) =>
      (a.area ?? 'zzz').localeCompare(b.area ?? 'zzz') || b.daysSinceUpdate - a.daysSinceUpdate
  );
  return {
    width: 7,
    headerRow: tableRow([
      cell('PR'),
      cell('Title'),
      cell('Author'),
      cell('Area'),
      cell('Age'),
      cell('Quick Win'),
      cell('Linear'),
    ]),
    dataRows: sorted.map(({ pr, area, daysSinceUpdate, isQuickWin, linearTicketId }) =>
      tableRow([
        cell(`#${pr.number}`, pr.url),
        cell(truncate(pr.title, 100)),
        cell(pr.author),
        cell(area ?? '—'),
        cell(`${daysSinceUpdate}d`),
        cell(isQuickWin ? '⚡ Yes' : 'No'),
        linearTicketId ? cell(linearTicketId, linearUrl(linearTicketId)) : cell('—'),
      ])
    ),
  };
}

// ---------------------------------------------------------------------------
// Page creation
// ---------------------------------------------------------------------------

export async function createReportPage(
  databaseId: string,
  stats: WeeklyStats,
  analyses: PRAnalysis[],
  generatedAt: string
): Promise<void> {
  const dateStr = generatedAt.slice(0, 10);
  const pageTitle = `Community PR Report — ${dateStr}`;

  // Create page with the summary section.
  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: { title: { title: [{ text: { content: pageTitle } }] } },
    children: [
      heading1(`📊 Community PR Report — ${dateStr}`),
      heading2('Summary'),
      bullet(`Total open PRs: ${stats.totalOpen}`),
      bullet(`Quick wins: ${stats.quickWins.length}`),
      bullet(`Stale (>30d): ${stats.stalePRs.length}`),
      bullet(`New this week: ${stats.newThisWeek.length}`),
      bullet(`Picked up by CMS this week: ${stats.pickedUpByCMS.length}`),
      divider(),
    ] as any,
  });

  const pageId = (response as any).id as string;

  // Quick Wins
  await appendBlocks(pageId, [heading2('⚡ Quick Wins')]);
  if (stats.quickWins.length > 0) await appendTable(pageId, quickWinsTableData(stats.quickWins));
  else await appendBlocks(pageId, [bullet('None this week')]);
  await appendBlocks(pageId, [divider()]);

  // New This Week
  await appendBlocks(pageId, [heading2('🆕 New This Week')]);
  if (stats.newThisWeek.length > 0)
    await appendTable(pageId, newThisWeekTableData(stats.newThisWeek));
  else await appendBlocks(pageId, [bullet('None this week')]);
  await appendBlocks(pageId, [divider()]);

  // Stale PRs
  await appendBlocks(pageId, [heading2('🕰 Stale PRs (>30 days no activity)')]);
  if (stats.stalePRs.length > 0) await appendTable(pageId, stalePRsTableData(stats.stalePRs));
  else await appendBlocks(pageId, [bullet('None this week')]);
  await appendBlocks(pageId, [divider()]);

  // Picked Up by CMS
  await appendBlocks(pageId, [heading2('🚀 Picked Up by CMS This Week')]);
  if (stats.pickedUpByCMS.length > 0)
    await appendTable(pageId, pickedUpTableData(stats.pickedUpByCMS));
  else await appendBlocks(pageId, [bullet('None this week')]);
  await appendBlocks(pageId, [divider()]);

  // All Open PRs
  await appendBlocks(pageId, [heading2('📋 All Open PRs')]);
  if (analyses.length > 0) await appendTable(pageId, allPRsTableData(analyses));
  else await appendBlocks(pageId, [bullet('No open PRs')]);
}
