import axios, { type AxiosResponse } from 'axios';
import * as fs from 'fs';
import { apiConfig } from '../config/api';
import type { CloudCliConfig } from '../types';

export const VERSION = 'v1';

export type ProjectInfos = {
  id: string;
  name: string;
  nodeVersion: string;
  region: string;
  plan?: string;
  url?: string;
};
export type ProjectInput = Omit<ProjectInfos, 'id'>;

export function cloudApiFactory(token?: string) {
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
    deploy(
      {
        filePath,
        project,
      }: {
        filePath: string;
        project: { id: string };
      },
      {
        onUploadProgress,
      }: {
        onUploadProgress: (progressEvent: { loaded: number; total?: number }) => void;
      }
    ) {
      return axiosCloudAPI.post(
        `/deploy/${project.id}`,
        { file: fs.createReadStream(filePath) },
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress,
        }
      );
    },

    createProject({
      name,
      nodeVersion,
      region,
      plan,
    }: ProjectInput): Promise<AxiosResponse<ProjectInfos>> {
      return axiosCloudAPI.post('/project', {
        projectName: name,
        region,
        nodeVersion,
        plan,
      });
    },

    config(): Promise<AxiosResponse<CloudCliConfig>> {
      return axiosCloudAPI.get('/config');
    },

    listProjects() {
      return axiosCloudAPI.get<ProjectInfos[]>('/projects');
    },
  };
}
