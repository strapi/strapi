# Forgot Password Email

## Customize forgot password email

You may want to customize the forgot password email.
You can do it by providing your own template (formatted as a [lodash template](https://lodash.com/docs/4.17.15#template)).

The template will be compiled with the following variables: `url`, `resetPasswordToken`, `user.email`, `user.username`.

### Example

**Path -** `./config/servers.js`

```js
const forgotPasswordTemplate = require('./email-templates/forgot-password');

module.exports = ({ env }) => ({
  // ...
  admin: {
    // ...
    forgotPassword: {
      from: 'support@mywebsite.fr',
      replyTo: 'support@mywebsite.fr',
      emailTemplate: forgotPasswordTemplate,
    },
    // ...
  },
  // ...
});
```

**Path -** `./config/email-templates/forgot-password.js`

```js
const subject = `Reset password`;

const html = `<p>Hi <%= user.username %></p>
<p>Sorry you lost your password. You can click here to reset it: <%= url %>?code=<%= resetPasswordToken %></p>`;

const text = `Hi <%= user.username %>
Sorry you lost your password. You can click here to reset it: <%= url %>?code=<%= resetPasswordToken %>`;

module.exports = {
  subject,
  text,
  html,
};
```
