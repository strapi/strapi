interface AppendSearchParamsToUrlParams {
  url?: string;
  params?: Record<string, string | number | boolean | null | undefined>;
}

const appendSearchParamsToUrl = ({
  url,
  params,
}: AppendSearchParamsToUrlParams): string | undefined => {
  if (url === undefined || typeof params !== 'object') {
    return url;
  }

  // TODO: to remove when the admin index.js is migrated to TS
  // @ts-ignore
  const urlObj = new URL(url, window.strapi.backendURL);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlObj.searchParams.append(key, String(value));
    }
  });

  return urlObj.toString();
};

export { appendSearchParamsToUrl };
