import axios, { type AxiosResponse } from 'axios';
import * as fs from 'fs';
import { apiConfig } from '../config/api';
import type { CloudCliConfig } from '../types';

export type ProjectInfos = {
  id: string;
  name: string;
  nodeVersion: '18' | '20';
  region: 'AMS' | 'NYC';
  planPriceId?: string;
  url?: string;
};
export type ProjectInput = Omit<ProjectInfos, 'id'>;

export function cloudApiFactory(token?: string) {
  const axiosCloudAPI = axios.create({
    baseURL: apiConfig.apiBaseUrl,
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
      planPriceId,
    }: ProjectInput): Promise<AxiosResponse<ProjectInfos>> {
      return axiosCloudAPI.post('/project', {
        projectName: name,
        region,
        nodeVersion,
        planPriceId,
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
