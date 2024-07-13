import { compressFilesToTar, upload } from '../services/deploy';

const CLOUD_API = 'https://platform-api-jimi.tunnel.cloud.strapi.team';
// const CLOUD_API = 'https://api.qa-chicken.cloud.strapi.team';
const REMI_TOKEN =
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ikk5SzY1aHdYV21jM1ZnM2JyWVRCMCJ9.eyJpc3MiOiJodHRwczovL3N0cmFwaS51cy5hdXRoMC5jb20vIiwic3ViIjoiYXV0aDB8NjY5MjZiZWE0YmVhZjlmNWVhZjdlMmJkIiwiYXVkIjoiaHR0cDovL2Nsb3VkLnN0cmFwaS5pbyIsImlhdCI6MTcyMDg3MTkxNCwiZXhwIjoxNzIwOTU4MzE0LCJzY29wZSI6ImZlYXR1cmU6YmlsbGluZyBjcmVhdGU6dXNlcnMgcmVhZDp1c2VycyByZWFkOnByb2ZpbGUiLCJndHkiOiJwYXNzd29yZCIsImF6cCI6ImhRc1ZkSGlrclo4Y1lJRW1oNHlrVkt5YXlQNUFyUGVTIn0.RRYoibsnDJrkDrvvVwVjKV4HrCUIRS1_Qu4HF64xiOjNAUSmeq47iNo-F-hEaaUw38Edz7ltnyJyUGqavV5aBDMlX6jgkibyJpcJbf3g0DHBrPzLZtLZyHdxmsyvrAl1OVk2loTCIYZcz2UogzZua1arUgi5Za5JO5gVWdp1mcBLqcyTEWbT78WucqLI6giMrZzhg377JbqJCWmtO3l0cgJPDiHYag2hUyFFZ_Ce0kS7Kh3hMlpHVX5NZKTfqswNZHzpkkXddyOhb23xaVAgGS3qezTBhx9upFvMLxOtAJlASNfD94_28b_AxIlXhoiM4ycwgvSXTnAIUvE9e9Uolw';

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
    async createProject(ctx: any) {
      // Create a new project
      const project = ctx.request.body;
      const createProjectResponse = await fetch(`${CLOUD_API}/projects/trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${REMI_TOKEN}`, // ctx.state.cloudUser.token,
        },
        body: JSON.stringify(project),
      });
      const newProject = await createProjectResponse.json();
      ctx.response.body = { data: newProject };
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
