import axios, { type AxiosResponse } from 'axios';
import * as fs from 'fs';
import { apiConfig } from '../config/api';
import type { CloudCliConfig } from '../types';

export const VERSION = 'v1';

export type ProjectInfos = {
  name: string;
  nodeVersion: string;
  region: string;
  plan?: string;
  url?: string;
};
export type ProjectInput = Omit<ProjectInfos, 'id'>;

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
  ): Promise<AxiosResponse>;

  createProject(projectInput: ProjectInput): Promise<{
    data: ProjectInfos;
    status: number;
  }>;

  getUserInfo(): Promise<AxiosResponse>;

  config(): Promise<AxiosResponse<CloudCliConfig>>;

  listProjects(): Promise<AxiosResponse<ProjectInfos[]>>;
}

export function cloudApiFactory(token?: string): CloudApiService {
  const axiosCloudAPI = axios.create({
    baseURL: `${apiConfig.apiBaseUrl}/${VERSION}`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (token) {
    axiosCloudAPI.defaults.headers.Authorization = `Bearer ${token}`;
  }

  return {
    deploy({ filePath, project }, { onUploadProgress }) {
      return axiosCloudAPI.post(
        `/deploy/${project.name}`,
        { file: fs.createReadStream(filePath) },
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
          name: response.data.displayName,
          nodeVersion: response.data.nodeVersion,
          region: response.data.region,
        },
        status: response.status,
      };
    },

    getUserInfo() {
      return axiosCloudAPI.get('/user');
    },

    config(): Promise<AxiosResponse<CloudCliConfig>> {
      return axiosCloudAPI.get('/config');
    },

    listProjects() {
      return axiosCloudAPI.get<ProjectInfos[]>('/projects');
    },
  };
}
