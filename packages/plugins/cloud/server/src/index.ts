import { type Core } from '@strapi/types';

const CLOUD_API = 'https://platform-api-jimi.tunnel.cloud.strapi.team';
const REMI_TOKEN =
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ikk5SzY1aHdYV21jM1ZnM2JyWVRCMCJ9.eyJpc3MiOiJodHRwczovL3N0cmFwaS51cy5hdXRoMC5jb20vIiwic3ViIjoiYXV0aDB8NjY4ZmVlODQ2ZWJjM2QzZmEyYTcyOTRmIiwiYXVkIjoiaHR0cDovL2Nsb3VkLnN0cmFwaS5pbyIsImlhdCI6MTcyMDcwODc0MSwiZXhwIjoxNzIwNzk1MTQxLCJzY29wZSI6ImZlYXR1cmU6YmlsbGluZyBjcmVhdGU6dXNlcnMgcmVhZDp1c2VycyByZWFkOnByb2ZpbGUiLCJndHkiOiJwYXNzd29yZCIsImF6cCI6ImhRc1ZkSGlrclo4Y1lJRW1oNHlrVkt5YXlQNUFyUGVTIn0.dWrxuuzwxloM1VMiDC26O-ul4UG7N6vtuos3YZXVpoqpCGxSYpnCdm2gtakNWFssI6XQbnBCl-J96np-I4GuY_8w4fJPjdPZYZ7c5bUk2C_j-APvk2FUs9arfnLhJY54ztUy5qKZ0ndLEcRY8k8nAKMGUbVu23O0Fb24j-kwUDIIpbkWzObKiV_0vASwAnjX_VlKaSXU9zRegQFGeSOUfWVUkhu5P4juT_SDb-vt9PA6P9O72XUCz7C9B7oKRpF0N2qs2bP_xYU83aayYwqz4DnfWeEuAOBhJHBq9ttLeHS9enaBvciUMrrRb_MtXSc6zE7tJbTquO3i7hUA93iRQw';

export default () =>
  ({
    async register({ strapi }) {
      console.log('registering cloud plugin');

      // Intercept the admin user creation to also register the user on the cloud if they opted in
      strapi.server.use(async (ctx, next) => {
        await next();
        if (ctx.path === '/admin/register-admin') {
          const { email, password, registerCloud, firstname } = ctx.request.body as any;

          if (registerCloud) {
            // Register the user on the cloud
            const response = await fetch(`${CLOUD_API}/auth/register`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email, password, firstname }),
            });
            const { token } = await response.json();
            ctx.state.cloudUser = { token };
          }
        }
      });

      strapi.server.router.get('/cloud-plugin/me', async (ctx) => {
        // Fetch the cloud user profile
        const profileResponse = await fetch(`${CLOUD_API}/me`, {
          headers: {
            Authorization: `Bearer ${REMI_TOKEN}`, // ctx.state.cloudUser.token,
          },
        });
        const profile = await profileResponse.json();
        ctx.response.body = { data: profile };
      });

      strapi.server.router.get('/cloud-plugin/projects', async (ctx) => {
        // Fetch the cloud user profile
        const profileResponse = await fetch(`${CLOUD_API}/projects`, {
          headers: {
            Authorization: `Bearer ${REMI_TOKEN}`, // ctx.state.cloudUser.token,
          },
        });
        const projects = await profileResponse.json();
        ctx.response.body = { data: projects };
      });
    },
  }) as Core.Plugin;
