import { UID } from "@strapi/types";


interface StrapiStage {
  name: string;
}

export type Entry = {
  id: number;
  documentId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  locale: string | null;
  createdBy: User;
  updatedBy: User;
  strapi_assignee?: object | null;
  strapi_stage?: StrapiStage | null;
};

export interface PieData {
  name: string;
  value: number;
  entries?: Entry[];
}

type Locales = {
  [key: string]: Entry[];
};

export type KeyNumbers = {
  [key: string]: number;
};

interface KeyNumberProvider {
  name: string;
  resolve(): Promise<number>;
}

export type ContentTypeStatistics = {
  locales: Locales;
  count: number;
  modifiedCount: number;
  statusPieChart: PieData[];
  localePieChart: PieData[];
  topContributors: User[];
  latestDraftEntries: Entry[];
  latestPublishedEntries: Entry[];
  stackedAreaChartLocales: Array<{ [key: string]: string }>;
  stackedAreaChartStages: Array<{ [key: string]: string }>
  assignedEntriesPieChart: PieData[];
  assignedEntriesCount: number;
  stackedAreaChartAssignedStages: Array<{ [key: string]: string }>;
};

export interface User {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
}

export interface Payload {
  entry: {
    documentId: string;
    locale?: string;
  };
  uid: string;
}

export type Activity = {
  action: string;
  createdAt: string;
  date: string;
  documentId: string;
  id: number;
  locale: string;
  payload: Payload;
  publishedAt: string;
  updatedAt: string;
  user: User;
};

export type Release = {
  createdAt: string;
  documentId: string;
  id: number;
  locale: string;
  name: string;
  publishedAt: string;
  releasedAt: string;
  scheduledAt: string;
  status: string;
  timezone: string;
  updatedAt: string;
};

export type EEStatistics = {
  upcomingReleases: Release[] | Array<object>;
  latestActivities: Activity[] | Array<object>;
  upcomingReleasesCount: number,
  workflowsCount: number,
};

const providers: Map<string, KeyNumberProvider> = new Map();

export function registerKeyNumbersProvider(provider: KeyNumberProvider): void {
  if (providers.has(provider.name)) {
    throw new Error(`Provider with name ${provider.name} already exists`);
  }

  providers.set(provider.name, provider);
}

export async function getKeyNumbers(): Promise<KeyNumbers> {
  const keyNumbers: KeyNumbers = {
    entries: 0,
    assets: 0,
    contentTypes: 0,
    components: 0,
    locales: 0,
    admin_users: 0,
    webhooks: 0,
    apiTokens: 0
  };

  const results = Array.from(providers.values()).map((provider) =>
    provider.resolve().then((result) => {
      keyNumbers[provider.name] = result;
    })
  );

  await Promise.all(results);

  return keyNumbers;
}

export async function getContentTypeStatistics(contentType: UID.CollectionType, userId: number): Promise<ContentTypeStatistics> {
  // Fetch entries with associated user data that would always be there and just enough for the dashboard
  const [entries, initialCount] = await strapi.db.query(contentType).findWithCount({
    select: ['createdAt', 'updatedAt', 'publishedAt', 'locale', 'documentId'],
    populate: {
      createdBy: {
        select: ['username', 'firstname', 'lastname']
      },
      updatedBy: {
        select: ['username', 'firstname', 'lastname']
      },
      strapi_stage: {
        select: ['name']
      },
      strapi_assignee: {
        select: ['id']
      }
    },
    orderBy: { publishedAt: 'DESC' }
  });

  let count = initialCount;

  // Initialize data structures
  const published: Entry[] = [];
  const draft: Entry[] = [];
  const locales: Locales = {};
  const assignedEntries: Entry[] = [];

  const contributors: Record<string, any> = {};
  const stackedAreaChartByLocaleData: Record<string, any> = {};
  const stackedAreaChartByStageData: Record<string, any> = {};
  const stackedAreaChartByAssignedStageData: Record<string, any> = {};
  const publishedDocumentIds = new Set<string>();

  // Process each entry
  entries.forEach(entry => {
    // Track entries by month and locale for the stacked area chart
    const date = new Date(entry.createdAt);
    const month = date.toLocaleString('default', { month: 'short' });
    const yearMonth = `${date.getFullYear()}-${month}`;

    // Review Workflows
    if (strapi.ee.features.isEnabled('review-workflows')) {
      if (entry.strapi_assignee && entry.strapi_assignee.id === userId) {
        assignedEntries.push(entry);
      }

      // Stacked Area chart stage entries
      if (entry.strapi_stage) {
        if (!stackedAreaChartByStageData[yearMonth]) {
          stackedAreaChartByStageData[yearMonth] = { month: yearMonth };
        }
        if (!stackedAreaChartByStageData[yearMonth][entry.strapi_stage.name]) {
          stackedAreaChartByStageData[yearMonth][entry.strapi_stage.name] = 0;
        }
        stackedAreaChartByStageData[yearMonth][entry.strapi_stage.name] += 1;
      }

      if (entry.strapi_stage && entry.strapi_assignee && entry.strapi_assignee.id === userId) {
        if (!stackedAreaChartByAssignedStageData[yearMonth]) {
          stackedAreaChartByAssignedStageData[yearMonth] = { month: yearMonth };
        }
        if (!stackedAreaChartByAssignedStageData[yearMonth][entry.strapi_stage.name]) {
          stackedAreaChartByAssignedStageData[yearMonth][entry.strapi_stage.name] = 0;
        }
        stackedAreaChartByAssignedStageData[yearMonth][entry.strapi_stage.name] += 1;
      }
    }

    // Prevent to iterate on Published draft entries
    if (!entry.publishedAt && publishedDocumentIds.has(entry.documentId)) {
      count -= 1;
      return;
    }

    // Aggregate contributions by createdBy and updatedBy
    ['createdBy', 'updatedBy'].forEach(field => {
      const user = entry[field];
      if (user) {
        const id = user.id;
        if (!contributors[id]) {
          contributors[id] = { ...user, count: 0 };
        }
        contributors[id].count += 1;
      }
    });

    // Group entries by status
    if (entry.publishedAt) {
      published.push(entry);
      publishedDocumentIds.add(entry.documentId);
    } else {
      draft.push(entry);
    }

    // Group entries by locale
    if (entry.locale) {
      if (!locales[entry.locale]) {
        locales[entry.locale] = [];
      }
      locales[entry.locale].push(entry);
    }

    // Stacked Area chart Locales
    if (!stackedAreaChartByLocaleData[yearMonth]) {
      stackedAreaChartByLocaleData[yearMonth] = { month: yearMonth };
    }
    if (!stackedAreaChartByLocaleData[yearMonth][entry.locale]) {
      stackedAreaChartByLocaleData[yearMonth][entry.locale] = 0;
    }
    stackedAreaChartByLocaleData[yearMonth][entry.locale] += 1;
  });

  // PIE CHART
  const statusPieChart: PieData[] = [
    { name: 'Published', value: published.length },
    { name: 'Draft', value: draft.length },
    { name: 'Modified (published)', value: publishedDocumentIds.size }
  ];
  const localePieChart: PieData[] = Object.keys(locales).map(locale => ({
    name: locale,
    value: locales[locale].length,
  }));

  let assignedEntriesPieChart: PieData[] = [];
  let stackedAreaChartStages = [];
  let stackedAreaChartAssignedStages = [];

  if (strapi.ee.features.isEnabled('review-workflows')) {
    assignedEntriesPieChart = Object.values(assignedEntries.reduce((acc, entry) => {
      if (entry.strapi_stage && entry.strapi_stage.name) {
        const stageName = entry.strapi_stage.name;
        if (!acc[stageName]) {
          acc[stageName] = { name: stageName, value: 0, entries: [] };
        }
        const stageData = acc[stageName];
        stageData.value += 1;
        if (stageData.entries) {
          stageData.entries.push(entry);
        }
      }
      return acc;
    }, {} as Record<string, PieData>));

    stackedAreaChartStages = Object.values(stackedAreaChartByStageData).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
    stackedAreaChartAssignedStages = Object.values(stackedAreaChartByAssignedStageData).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }

  // STACKED AREA CHART
  const stackedAreaChartLocales = Object.values(stackedAreaChartByLocaleData).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  // LIST
  const topContributors = Object.values(contributors)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const sortedPublishedEntries = published.sort((a, b) => {
    const updatedAtA = a.updatedAt ?? '';
    const updatedAtB = b.updatedAt ?? '';
    return new Date(updatedAtB).getTime() - new Date(updatedAtA).getTime();
  });

  const sortedDraftEntries = draft.sort((a, b) => {
    const updatedAtA = a.updatedAt ?? '';
    const updatedAtB = b.updatedAt ?? '';
    return new Date(updatedAtB).getTime() - new Date(updatedAtA).getTime();
  });

  const latestPublishedEntries = sortedPublishedEntries.slice(0, 10);
  const latestDraftEntries = sortedDraftEntries.slice(0, 10);

  return {
    count,
    modifiedCount: publishedDocumentIds.size,
    locales,
    statusPieChart,
    localePieChart,
    stackedAreaChartLocales,
    stackedAreaChartStages,
    stackedAreaChartAssignedStages,
    assignedEntriesPieChart,
    topContributors,
    latestPublishedEntries,
    latestDraftEntries,
    assignedEntriesCount: assignedEntries.length,
  };
}

export async function getEEStatistics(): Promise<EEStatistics> {

  const result: EEStatistics = {
    upcomingReleases: [],
    latestActivities: [],
    upcomingReleasesCount: 0,
    workflowsCount: 0,
  };


  if (strapi.ee.features.isEnabled('cms-content-releases')) {
    const data = await strapi.documents('plugin::content-releases.release').findMany({
      filters: {
        scheduledAt: {
          $gt: new Date(),
        },
      },
      sort: 'scheduledAt:asc',
    }) as Release[];

    result.upcomingReleases = data;
    result.upcomingReleasesCount = data?.length;
  }

  if (strapi.ee.features.isEnabled('audit-logs')) {
    const data = await strapi.documents('admin::audit-log').findMany({
      limit: 10,
      sort: 'createdAt:desc',
      populate: {
        user: {
          populate: {
            username: true,
            firstname: true,
            lastname: true,
          }
        }
      }
    }) as Activity[];
    result.latestActivities = data;
  }


  if (strapi.ee.features.isEnabled('review-workflows')) {
    const data = await strapi.documents('plugin::review-workflows.workflow').count();
    result.workflowsCount = data;
  }

  return result;
}

const defaultProviders: { [name: string]: () => Promise<number> } = {
  async admin_users() {
    return strapi.query('admin::user').count();
  },
  async contentTypes() {
    return Object.keys(strapi.contentTypes).filter((type) => type.startsWith('api::')).length;
  },
  assets: count('plugin::upload.file'),
  locales: count('plugin::i18n.locale'),
  apiTokens: count('admin::api-token'),
  async components() {
    return Object.entries(strapi.components).length;
  },
  async webhooks() {
    return strapi.query('strapi::webhook').count();
  },
  async entries() {
    const types = Object.keys(strapi.contentTypes).filter((type) => {
      if (type.startsWith('api::')) {
        return true;
      }

      if (type.startsWith('plugin::')) {
        // Exclude uploads, locales and releases, as they are already counted above
        return !['plugin::upload.file', 'plugin::i18n.locale', 'plugin::content-releases.release'].includes(type);
      }

      return false;
    }) as UID.CollectionType[];

    let result = 0;

    await Promise.all(types.map(async (contentType) => {
      const count = await strapi.documents(contentType).count();

      result += count;
    }));

    return result;
  },
};

function count(contentType: UID.CollectionType): () => Promise<number> {
  return () => strapi.documents(contentType).count();
}

Object.entries(defaultProviders).forEach(([name, resolve]) => {
  registerKeyNumbersProvider({ name, resolve });
});
