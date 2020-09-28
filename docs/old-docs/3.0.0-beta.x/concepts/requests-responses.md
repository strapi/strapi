# Requests and responses

## Request

The context object (`ctx`) contains all the requests related information. They are accessible through `ctx.request`, from [controllers](controllers.md) and [policies](policies.md).

Strapi passes the `body` on `ctx.request.body` and `files` through `ctx.request.files`

For more information, please refer to the [Koa request documentation](http://koajs.com/#request).

## Responses

The context object (`ctx`) contains a list of values and functions useful to manage server responses. They are accessible through `ctx.response`, from [controllers](controllers.md) and [policies](policies.md).

For more information, please refer to the [Koa response documentation](http://koajs.com/#response).
