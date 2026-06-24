import { strings } from '@strapi/utils';
import { isIP } from 'node:net';

interface ServerConfig {
  url: string;
  host: string;
  port: number | string;
}

export const getConfigUrls = (config: Record<string, unknown>, forAdminBuild = false) => {
  const serverConfig = config.server as ServerConfig;
  const adminConfig = config.admin;

  // Defines serverUrl value
  let serverUrl = serverConfig?.url ?? '';
  serverUrl = serverUrl.replace(/^[/ ]+|[/ ]+$/g, '');
  if (typeof serverUrl !== 'string') {
    throw new Error('Invalid server url config. Make sure the url is a string.');
  }

  if (serverUrl.startsWith('http')) {
    try {
      serverUrl = new URL(serverConfig.url).toString().replace(/^\/+|\/+$/g, '');
    } catch (e) {
      throw new Error(
        'Invalid server url config. Make sure the url defined in server.js is valid.'
      );
    }
  } else if (serverUrl !== '') {
    serverUrl = `/${serverUrl}`;
  }

  // Defines adminUrl value
  let adminUrl = (adminConfig as { url?: string })?.url ?? '/admin';
  adminUrl = adminUrl.replace(/^[/ ]+|[/ ]+$/g, '');
  if (typeof adminUrl !== 'string') {
    throw new Error('Invalid admin url config. Make sure the url is a non-empty string.');
  }
  if (adminUrl.startsWith('http')) {
    try {
      adminUrl = new URL(adminUrl).toString().replace(/^\/+|\/+$/g, '');
    } catch (e) {
      throw new Error('Invalid admin url config. Make sure the url defined in server.js is valid.');
    }
  } else {
    adminUrl = `${serverUrl}/${adminUrl}`;
  }

  // Defines adminPath value
  let adminPath = adminUrl;
  if (
    serverUrl.startsWith('http') &&
    adminUrl.startsWith('http') &&
    new URL(adminUrl).origin === new URL(serverUrl).origin &&
    !forAdminBuild
  ) {
    adminPath = adminUrl.replace(strings.getCommonPath(serverUrl, adminUrl), '');
    adminPath = `/${adminPath.replace(/^\/+|\/+$/g, '')}`;
  } else if (adminUrl.startsWith('http')) {
    adminPath = new URL(adminUrl).pathname;
  }

  return {
    serverUrl,
    adminUrl,
    adminPath,
  };
};

const getAbsoluteUrl =
  (adminOrServer: 'admin' | 'server') =>
  (config: Record<string, unknown>, forAdminBuild = false) => {
    const { serverUrl, adminUrl } = getConfigUrls(config, forAdminBuild);
    const url = adminOrServer === 'server' ? serverUrl : adminUrl;

    if (url.startsWith('http')) {
      return url;
    }

    const serverConfig = config.server as ServerConfig;

    const isLocalhost =
      config.environment === 'development' &&
      ['127.0.0.1', '0.0.0.0', '::1', '::'].includes(serverConfig.host);

    if (isLocalhost) {
      return `http://localhost:${serverConfig.port}${url}`;
    }

    if (isIP(serverConfig.host) === 6) {
      return `http://[${serverConfig.host}]:${serverConfig.port}${url}`;
    }

    return `http://${serverConfig.host}:${serverConfig.port}${url}`;
  };

export const getAbsoluteAdminUrl = getAbsoluteUrl('admin');
export const getAbsoluteServerUrl = getAbsoluteUrl('server');
