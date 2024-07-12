import { compressFilesToTar, upload } from '../services/deploy';

const CLOUD_API = 'https://platform-api-jimi.tunnel.cloud.strapi.team';
const REMI_TOKEN =
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ikk5SzY1aHdYV21jM1ZnM2JyWVRCMCJ9.eyJpc3MiOiJodHRwczovL3N0cmFwaS51cy5hdXRoMC5jb20vIiwic3ViIjoiYXV0aDB8NjY4ZmVlODQ2ZWJjM2QzZmEyYTcyOTRmIiwiYXVkIjoiaHR0cDovL2Nsb3VkLnN0cmFwaS5pbyIsImlhdCI6MTcyMDcwODc0MSwiZXhwIjoxNzIwNzk1MTQxLCJzY29wZSI6ImZlYXR1cmU6YmlsbGluZyBjcmVhdGU6dXNlcnMgcmVhZDp1c2VycyByZWFkOnByb2ZpbGUiLCJndHkiOiJwYXNzd29yZCIsImF6cCI6ImhRc1ZkSGlrclo4Y1lJRW1oNHlrVkt5YXlQNUFyUGVTIn0.dWrxuuzwxloM1VMiDC26O-ul4UG7N6vtuos3YZXVpoqpCGxSYpnCdm2gtakNWFssI6XQbnBCl-J96np-I4GuY_8w4fJPjdPZYZ7c5bUk2C_j-APvk2FUs9arfnLhJY54ztUy5qKZ0ndLEcRY8k8nAKMGUbVu23O0Fb24j-kwUDIIpbkWzObKiV_0vASwAnjX_VlKaSXU9zRegQFGeSOUfWVUkhu5P4juT_SDb-vt9PA6P9O72XUCz7C9B7oKRpF0N2qs2bP_xYU83aayYwqz4DnfWeEuAOBhJHBq9ttLeHS9enaBvciUMrrRb_MtXSc6zE7tJbTquO3i7hUA93iRQw';

const controllers = {
  userController: {
    async getProfile(ctx: any) {
      // Fetch the cloud user profile
      const profileResponse = await fetch(`${CLOUD_API}/me`, {
        headers: {
          Authorization: `Bearer ${REMI_TOKEN}`, // ctx.state.cloudUser.token,
        },
      });
      const profile = await profileResponse.json();
      ctx.response.body = { data: profile };
    },
  },
  projectsController: {
    async getProjects(ctx: any) {
      // Fetch the cloud user projects
      const profileResponse = await fetch(`${CLOUD_API}/projects`, {
        headers: {
          Authorization: `Bearer ${REMI_TOKEN}`, // ctx.state.cloudUser.token,
        },
      });
      const projects = await profileResponse.json();
      ctx.response.body = { data: projects };
    },
    async getProject(ctx: any) {
      // Fetch the cloud user project
      const projectName = ctx.params.projectName;
      const profileResponse = await fetch(`${CLOUD_API}/projects/${projectName}`, {
        headers: {
          Authorization: `Bearer ${REMI_TOKEN}`, // ctx.state.cloudUser.token,
        },
      });
      const project = await profileResponse.json();
      ctx.response.body = { data: project };
    },
  },
  deployController: {
    async deploy(ctx: any) {
      // Compress the project and upload it to the cloud
      const projectName = ctx.request.body.project;
      const fileName = await compressFilesToTar();
      try {
        const buildResponse = await upload(projectName, fileName);
        ctx.response.body = {
          data: { fileName, projectName, build: { status: buildResponse.status } },
        };
      } catch (error) {
        console.error(error);
        ctx.response.status = 500;
      }
    },
  },
};

export { controllers };
