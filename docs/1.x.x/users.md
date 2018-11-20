# Users

Most of the web applications require a user management system: registration, login,
reset password, etc.

To avoid you to reinvent the wheel, Strapi embedded a full featured user management
system powered by [Grant](https://github.com/simov/grant) and JSON Web Token (JWT).

## Local Registration

Route used to register a user to your application: `POST /auth/local/register`.

Request payload:

```js
{
  "username": "John DOE",
  "email": "contact@company.com",
  "password": "123456"
}
```

Response payload:

```js
{
  "user": {},
  "jwt": ""
}
```

## Local Login

Route used to login a user to your application: `POST /auth/local`.

Request payload:

```js
{
  "identifier": "contact@company.com",
  "password": "123456"
}
```

Response payload:

```js
{
  "user": {},
  "jwt": ""
}
```

## Authentication

JWT does not use session. Once you get the token, it has to be stored in front (for
example in the `localstorage`), and sent within each request. The token can be sent:
- in the header (`Bearer`)
- in the body (`token` field)
- in the querystring (`token` field)

## Providers

Thanks to [Grant](https://github.com/simov/grant) and [Purest](https://github.com/simov/purest), you can easily use OAuth and OAuth2
providers to enable authentication in your application. By default,
Strapi comes with four providers:
- Facebook
- Google
- Github
- Linkedin2 (Oauth2 Provider for Linkedin)

To use the providers authentication, set your credentials in
`./api/user/config/environments/development/grant.json`.

Redirect your user to: `GET /connect/:provider`.

After their approval, they will be redirected to `/auth/:provider/callback`. The jwt and user will be available in the querystring.

Response payload:

```js
{
  "user": {},
  "jwt": ""
}
```

## Custom providers

Strapi comes with 5 providers. If you want to add another one, it can be easily done thanks to [Purest](https://github.com/simov/purest), by adding it in the Grant service.

## Forgot password

Send an email to the user with an activation code: `POST /auth/forgot-password`.

Request payload:

```js
{
  "email": "contact@company.com"
}
```

## Change password

Route used to update the password of a user after he asked for a
"forgot-password" email: `POST /auth/change-password`.

Request payload:

```js
{
  "code": "",
  "password": "123456",
  "passwordConfirmation": "123456"
}
```

Response payload:

```js
{
  "user": {},
  "jwt": ""
}
```


## Accessing user from requests.

If you want to access attributes of the logged in user, you can use `this.user` inside of your controller action. 
