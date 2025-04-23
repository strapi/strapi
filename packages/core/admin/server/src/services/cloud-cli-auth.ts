import fs from 'fs';
import path from 'path';

// TODO: These packages are listed in the package.json dependencies
// ESLint in monorepo setups can sometimes have issues with dependency checking
// across package boundaries ??
// eslint-disable-next-line import/no-extraneous-dependencies
import XDGAppPaths from 'xdg-app-paths';
// eslint-disable-next-line import/no-extraneous-dependencies
import { services as cloudCliServices } from '@strapi/cloud-cli';

interface CloudUserInfo {
  email?: string;
  firstname?: string;
  lastname?: string;
}

/**
 * Attempts to load user info from Strapi Cloud CLI
 * This looks for the auth token in the user's config directories
 * and then uses it to fetch the user's info if available
 */
export async function loadUserInfo(): Promise<CloudUserInfo | null> {
  try {
    // We need to use optional peer dependencies to avoid hard dependencies
    let token = null;

    // The cloud CLI stores its config in 'com.strapi.cli' directory
    const APP_FOLDER_NAME = 'com.strapi.cli';
    const CONFIG_FILENAME = 'config.json';

    // Get possible config directories (following XDG specification)
    const configDirs = XDGAppPaths(APP_FOLDER_NAME).configDirs();

    // Find first existing config directory
    let configPath = null;
    for (const dir of configDirs) {
      try {
        const stats = fs.statSync(dir);
        if (stats.isDirectory()) {
          configPath = dir;
          break;
        }
      } catch (error) {
        // Directory doesn't exist, try next one
        // eslint-disable-next-line no-continue
        continue;
      }
    }

    // If no config directory found, return null
    if (!configPath) {
      return null;
    }

    // Path to the config file
    const configFilePath = path.join(configPath, CONFIG_FILENAME);

    // Check if config file exists
    if (!fs.existsSync(configFilePath)) {
      return null;
    }

    try {
      // Read the config file
      const configContent = fs.readFileSync(configFilePath, 'utf8');
      const config = JSON.parse(configContent);

      // Extract the token
      token = config?.token;

      // If no token, return null
      if (!token) {
        return null;
      }
    } catch (error) {
      // If any error occurs reading the config, return null
      return null;
    }

    // Use the token to fetch user info from Strapi Cloud API
    try {
      if (!cloudCliServices || !cloudCliServices.cloudApiFactory) {
        return null;
      }

      const { cloudApiFactory, createLogger } = cloudCliServices;
      const logger = createLogger({ silent: true });
      const cloudApiService = await cloudApiFactory({ logger }, token);

      // Get user info
      const response = await cloudApiService.getUserInfo();
      const userInfo = response?.data?.data;

      // Return user info conditionally based on what exists
      if (userInfo) {
        return {
          ...(userInfo.email ? { email: userInfo.email } : {}),
          ...(userInfo.firstname ? { firstname: userInfo.firstname } : {}),
          ...(userInfo.lastname ? { lastname: userInfo.lastname } : {}),
        };
      }
    } catch (error) {
      return null;
    }
  } catch (error) {
    return null;
  }

  return null;
}
