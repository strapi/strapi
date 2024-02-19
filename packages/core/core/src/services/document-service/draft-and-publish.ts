/**
 * Sets status to draft only
 */
export const setStatusToDraft = (params: any) => {
  params.status = 'draft';
};

/**
 * Adds a default status of `draft` to the params
 */
export const defaultToDraft = (params: any) => {
  // Default to draft if no status is provided or it's invalid
  if (!params.status || params.status !== 'published') {
    params.status = 'draft';
  }
};

/**
 * Add status lookup query to the params
 */
export const statusToLookup = (params: any) => {
  const lookup = params.lookup || {};

  switch (params?.status) {
    case 'published':
      lookup.publishedAt = { $notNull: true };
      break;
    case 'draft':
      lookup.publishedAt = { $null: true };
      break;
    default:
      break;
  }

  params.lookup = lookup;
};

/**
 * Translate publication status parameter into the data that will be saved
 */
export const statusToData = (params: any) => {
  // Ignore publishedAt attribute. TODO: Make publishedAt not editable
  const { publishedAt, ...data } = params.data || {};

  switch (params?.status) {
    case 'published':
      data.publishedAt = new Date();
      break;
    case 'draft':
      data.publishedAt = null;
      break;
    default:
      break;
  }

  params.data = data;
};

export default {
  setStatusToDraft,
  defaultToDraft,
  statusToLookup,
  statusToData,
};
