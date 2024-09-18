import axios, { type AxiosResponse } from 'axios';
import fse from 'fs-extra';
import os from 'os';
import { apiConfig } from '../config/api';
import type { CLIContext, CloudCliConfig, TrackPayload } from '../types';
import { getLocalConfig } from '../config/local';

import packageJson from '../../package.json';

export const VERSION = 'v1';

export type ProjectInfos = {
  id: string;
  name: string;
  displayName?: string;
  nodeVersion?: string;
  region?: string;
  plan?: string;
  url?: string;
};

export type ProjectInput = Omit<ProjectInfos, 'id'>;

export type DeployResponse = {
  build_id: string;
  image: string;
};

export type ListProjectsResponse = {
  data: {
    data: string;
  };
};

export type ListLinkProjectsResponse = {
  data: {
    data: ProjectInfos[] | Record<string, never>;
  };
};

export type GetProjectResponse = {
  data: {
    updatedAt: string;
    suspendedAt?: string;
    isTrial: boolean;
  };
  metadata: {
    dashboardUrls: {
      project: string;
      deployments: string;
    };
  };
};

export interface CloudApiService {
  deploy(
    deployInput: {
      filePath: string;
      project: { name: string };
    },
    {
      onUploadProgress,
    }: {
      onUploadProgress: (progressEvent: { loaded: number; total?: number }) => void;
    }
  ): Promise<AxiosResponse<DeployResponse>>;

  createProject(createProjectInput: ProjectInput): Promise<{
    data: ProjectInput;
    status: number;
  }>;

  getUserInfo(): Promise<AxiosResponse>;

  config(): Promise<AxiosResponse<CloudCliConfig>>;

  listProjects(): Promise<AxiosResponse<ListProjectsResponse>>;

  listLinkProjects(): Promise<AxiosResponse<ListLinkProjectsResponse>>;

  getProject(project: { name: string }): Promise<AxiosResponse<GetProjectResponse>>;

  track(event: string, payload?: TrackPayload): Promise<AxiosResponse<void>>;
}

export async function cloudApiFactory(
  { logger }: { logger: CLIContext['logger'] },
  token?: string
): Promise<CloudApiService> {
  const localConfig = await getLocalConfig();
  const customHeaders = {
    'x-device-id': localConfig.deviceId,
    'x-app-version': packageJson.version,
    'x-os-name': os.type(),
    'x-os-version': os.version(),
    'x-language': Intl.DateTimeFormat().resolvedOptions().locale,
    'x-node-version': process.versions.node,
  };
  const axiosCloudAPI = axios.create({
    baseURL: `${apiConfig.apiBaseUrl}/${VERSION}`,
    headers: {
      'Content-Type': 'application/json',
      ...customHeaders,
    },
  });

  if (token) {
    axiosCloudAPI.defaults.headers.Authorization = `Bearer ${token}`;
  }

  return {
    deploy({ filePath, project }, { onUploadProgress }) {
      return axiosCloudAPI.post(
        `/deploy/${project.name}`,
        { file: fse.createReadStream(filePath) },
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress,
        }
      );
    },

    async createProject({ name, nodeVersion, region, plan }) {
      const response = await axiosCloudAPI.post('/project', {
        projectName: name,
        region,
        nodeVersion,
        plan,
      });

      return {
        data: {
          id: response.data.id,
          name: response.data.name,
          nodeVersion: response.data.nodeVersion,
          region: response.data.region,
        },
        status: response.status,
      };
    },

    getUserInfo() {
      return axiosCloudAPI.get('/user');
    },

    async config(): Promise<AxiosResponse<CloudCliConfig>> {
      try {
        const response = await axiosCloudAPI.get('/config');

        if (response.status !== 200) {
          throw new Error('Error fetching cloud CLI config from the server.');
        }

        return response;
      } catch (error) {
        logger.debug(
          "🥲 Oops! Couldn't retrieve the cloud CLI config from the server. Please try again."
        );

        throw error;
      }
    },

    async listProjects(): Promise<AxiosResponse<ListProjectsResponse>> {
      try {
        const response = await axiosCloudAPI.get('/projects');

        if (response.status !== 200) {
          throw new Error('Error fetching cloud projects from the server.');
        }

        return response;
      } catch (error) {
        logger.debug(
          "🥲 Oops! Couldn't retrieve your project's list from the server. Please try again."
        );
        throw error;
      }
    },

    async listLinkProjects(): Promise<AxiosResponse<ListLinkProjectsResponse, unknown>> {
      try {
        const response = await axiosCloudAPI.get('/projects-linkable');

        if (response.status !== 200) {
          throw new Error('Error fetching cloud projects from the server.');
        }

        return response;
      } catch (error) {
        logger.debug(
          "🥲 Oops! Couldn't retrieve your project's list from the server. Please try again."
        );
        throw error;
      }
    },

    async getProject({ name }): Promise<AxiosResponse<GetProjectResponse>> {
      try {
        const response = await axiosCloudAPI.get(`/projects/${name}`);

        if (response.status !== 200) {
          throw new Error("Error fetching project's details.");
        }

        return response;
      } catch (error) {
        logger.debug(
          "🥲 Oops! There was a problem retrieving your project's details. Please try again."
        );
        throw error;
      }
    },

    track(event, payload = {}) {
      return axiosCloudAPI.post<void>('/track', {
        event,
        payload,
      });
    },
  };
}
