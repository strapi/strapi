# Services

See the [services concept](../concepts/concepts.md#services) for details.

## How to create a service?

There is two ways to create a service.
 - Using the CLI `strapi generate:service user`. Read the [CLI documentation](../cli/CLI.md) for more information.
 - Manually create a JavaScript file named `User.js` in `./api/**/services/`.

#### Example

The goal of a service is to store reusable functions. An `email` service could be useful, if we plan to send emails from different functions in our codebase:

**Path —** `./api/email/services/Email.js`.
```js
const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport.
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'user@gmail.com',
    pass: 'password'
  }
});

module.exports = {
  send: (from, to, subject, text) => {  
    // Setup e-mail data.
    const options = {
      from,
      to,
      subject,
      text
    };

    // Return a promise of the function that sends the email.
    return transporter.sendMail(options);
  }
};
```

> Note: please make sure you installed `nodemailer` (`npm install nodemailer`) for this example.

The service is now available through the `strapi.services` global variable. We can use it in another part of our codebase. For example a controller like below:

**Path —** `./api/user/controllers/User.js`.
```js
module.exports = {
  // GET /hello
  signup: async (ctx) => {
    // Store the new user in database.
    const user = await User.create(ctx.params);

    // Send an email to validate his subscriptions.
    strapi.services.email.send('welcome@mysite.com', user.email, 'Welcome', '...');

    // Send response to the server.
    ctx.send({
      ok: true
    });
  }
};
```
