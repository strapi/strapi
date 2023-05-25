import { setupServer } from 'msw/node';
import { rest } from 'msw';

const handlers = [
  rest.get('*/me', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: {
          email: 'michka@michka.fr',
          firstname: 'michoko',
          lastname: 'ronronscelestes',
          username: 'yolo',
          preferedLanguage: 'en',
          roles: [{
            id: 2
          }]
        },
      })
    );
  }),
  rest.get('*/providers/options', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: {
          autoRegister: false,
          defaultRole: "1",
          ssoLockedRoles: ["1"],
        }
      })
    )
  })
];

const server = setupServer(...handlers);

export default server;
