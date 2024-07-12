import { adminApi } from '@strapi/admin/strapi-admin';

interface MeResponse {
  data: {
    email: string;
    name: string;
    picture: string;
  };
}

export interface Project {
  displayName: string;
  name: string;
  stats: {
    daysLeftInTrial: number;
  };
  environments: {
    production: {
      id: string;
      url: string;
    };
  };
}

interface ProjectsResponse {
  data: Project[];
}

const cloudApi = adminApi.injectEndpoints({
  endpoints: (build) => {
    return {
      getCloudUser: build.query<MeResponse, null>({
        query() {
          return {
            url: '/cloud-plugin/me',
            method: 'GET',
          };
        },
      }),
      getCloudProjects: build.query<ProjectsResponse, null>({
        query() {
          return {
            url: '/cloud-plugin/projects',
            method: 'GET',
          };
        },
      }),
    };
  },
});

const { useGetCloudUserQuery, useGetCloudProjectsQuery } = cloudApi;

export { useGetCloudUserQuery, useGetCloudProjectsQuery };
