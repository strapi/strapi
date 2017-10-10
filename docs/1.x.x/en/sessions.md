# Sessions

Since HTTP driven applications are stateless, sessions provide a way to store information
about the user across requests.

Strapi provides "guest" sessions, meaning any visitor will have a session,
authenticated or not. If a session is new a `Set-Cookie` will be produced regardless
of populating the session.

Strapi only supports cookie sessions, for now.

The current session is available in `this.session` inside a controller action.

```js
module.exports = {
  find: function *() {

    // Limit request rate to 100
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
