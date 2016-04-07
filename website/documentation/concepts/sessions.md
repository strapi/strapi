# Sessions

Since HTTP driven applications are stateless, sessions provide a way to store information about the user across requests.

Strapi provides "guest" sessions, meaning any visitor will have a session, authenticated or not. If a session is new a `Set-Cookie` will be produced regardless of populating the session.

!!! warning
    Strapi only supports cookie sessions, for now.

## Configuration

Configuration:

- Key: `session`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `object`

Example:

```js
{
  "session": {
    "key": "myApp",
    "secretKeys": [
      "mySecretKey1"
    ],
    "maxAge": 86400000
  }
}
```

Options:

- `key` (string): The cookie name.
- `secretKeys` (array): Keys used to encrypt the session cookie.
- `maxAge` (integer): Sets the time in seconds for when a cookie will be deleted.

Notes:

- Set to `false` to disable sessions.

## Usage

The current session is available in `this.session` inside a controller actions and policies.

```js
module.exports = {
  find: function *() {
    if (this.session.views < 100) {
      try {
        this.session.views++;
        this.body = yield Post.find(this.params);
      } catch (error) {
        this.body = error;
      }
    } else {
      this.body = 'You have reached your request rate limit';
    }
  }
};  
```

To destroy an active session, simply set it to `null`:

```js
module.exports = {
  logout: function () {
    try {
      this.session = null;
      this.redirect('./');
    } catch (error) {
      this.body = error;
    }
  }
};  
```
