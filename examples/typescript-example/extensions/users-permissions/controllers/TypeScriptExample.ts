import { Context } from 'koa';
import strapi from 'strapi';

export async function verifyJWT(ctx: Context) {
  // get token from the POST request
  const { jwt } = ctx.body;

  // check token requirement
  if (!jwt)
    return ctx.badRequest('`jwt` param is missing');

  try {
    // decrypt the jwt
    const obj = await strapi.plugins['users-permissions'].services.jwt.verify(jwt);

    // send the decrypted object
    return obj;
  } catch (err) {
    // if the token is not a valid token it will throw and error
    return ctx.badRequest(err.toString());
  }
}
