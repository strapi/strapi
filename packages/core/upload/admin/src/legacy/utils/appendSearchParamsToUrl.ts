interface AppendSearchParamsToUrlProps {
  url?: string;
  params?: Record<string, string | null | undefined> | string;
}

const appendSearchParamsToUrl = ({ url, params }: AppendSearchParamsToUrlProps) => {
  if (url === undefined || typeof params !== 'object') {
    return url;
  }

  const urlObj = new URL(url, window.strapi.backendURL);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlObj.searchParams.append(key, value);
    }
  });

  return urlObj.toString();
};

export { appendSearchParamsToUrl };
