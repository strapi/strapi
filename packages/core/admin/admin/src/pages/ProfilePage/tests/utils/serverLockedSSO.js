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
            id: 1
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

const serverLockedSSO = setupServer(...handlers);

export default serverLockedSSO;
