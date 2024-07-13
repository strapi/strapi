import { adminApi } from '@strapi/admin/strapi-admin';

interface MeResponse {
  data: {
    email: string;
    name: string;
    picture: string;
  };
}

export interface Project {
  createdAt: Date;
  displayName: string;
  environments: { [key: string]: Environment };
  hasGitSource: boolean;
  isMaintainer: boolean;
  name: string;
  ownerId: string;
  region: string;
  repository: any;
  stats: { daysLeftInTrial: number };
  suspendedAt: Date | null;
  suspendedReasons: [];
  updatedAt: Date;
}

export interface ProjectDetails extends Project {
  environments: { [key: string]: EnvironmentDetails };
  hasGitSource: boolean;
  isTrial: boolean;
}

interface Environment {
  branch: string;
  failedChecks: [];
  hasLiveDeployment: boolean;
  id: string;
  isProduction: boolean;
  url: string;
}

interface EnvironmentDetails extends Environment {
  internalName: string;
}

interface ProjectsResponse {
  data: Project[];
}

interface ProjectResponse {
  data: ProjectDetails;
}

interface CreateProjectParams {
  displayName: string;
  region: string;
  nodeVersion: string;
  planPriceId: string;
}

const cloudApi = adminApi.injectEndpoints({
  endpoints: (build) => {
    return {
      getCloudUser: build.query<MeResponse, null>({
        query() {
          return {
            url: '/cloud/me',
            method: 'GET',
          };
        },
      }),
      getCloudProjects: build.query<ProjectsResponse, null>({
        query() {
          return {
            url: '/cloud/projects',
            method: 'GET',
          };
        },
      }),
      getCloudProject: build.query<ProjectResponse, string>({
        query(projectName) {
          return {
            url: `/cloud/projects/${projectName}`,
            method: 'GET',
          };
        },
      }),
      createCloudProject: build.mutation<any, CreateProjectParams>({
        query(params) {
          return {
            url: '/cloud/projects',
            method: 'POST',
            data: params,
          };
        },
      }),
      deployProject: build.mutation<any, string>({
        query(projectName) {
          return {
            url: `/cloud/deploy`,
            method: 'POST',
            data: { project: projectName },
          };
        },
      }),
    };
  },
});

const {
  useGetCloudUserQuery,
  useGetCloudProjectsQuery,
  useGetCloudProjectQuery,
  useDeployProjectMutation,
  useCreateCloudProjectMutation,
} = cloudApi;

export {
  useGetCloudUserQuery,
  useGetCloudProjectsQuery,
  useGetCloudProjectQuery,
  useDeployProjectMutation,
  useCreateCloudProjectMutation,
};
