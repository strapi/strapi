# Email

Strapi contains a set of tools to send emails. This part is based on the
famous email node module: [Nodemailer](http://nodemailer.com).

## Email config

To change the STMP config, edit the `./api/email/config/environments/development/smtp.json` file.

```js
{
  "smtp": {
    "from": "test<no-reply@test.com>",
    "service": {
      "name": "",
      "user": "",
      "pass": ""
    }
  }
}
```

Options:
- `from` (string): The email address used to send emails.
- `service` (object): The SMTP service info:
  - `name` (string): Name of the service used to send emails (eg. `Gmail`).
  - `user` (string): Username of the service used (eg. `john@gmail.com`).
  - `pass` (string): Password of the username used (eg. `12356`).

## Email service

The email service allows you to easily send emails from anywhere in your application.

Usage as a promise (yieldable) :

```js
strapi.api.email.services.email.send({
    from: 'contact@company.com', // Sender (defaults to `strapi.config.smtp.from`).
    to: ['john@doe.com'], // Recipients list.
    html: '<p>Hello John</p>', // HTML version of the email content.
    text: 'Hello John' // Text version of the email content.
  })
  .then(function (data) {
    console.log(data);
  })
  .catch(function (err) {
    console.log(err);
  });
```

Usage with a callback :

```js
strapi.api.email.services.email.send({
    from: 'contact@company.com', // Sender (defaults to `strapi.config.smtp.from`).
    to: ['john@doe.com'], // Recipients list.
    html: '<p>Hello John</p>', // HTML version of the email content.
    text: 'Hello John' // Text version of the email content.
  }, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log(data);
    }
  });
```

## Email API

The email API is a simple API which can be used from your client (front-end, mobile...) application.

Route used to send emails:

```bash
POST /email
```

Request payload:

```js
{
  from: 'contact@company.com', // Optional : sender (defaults to `strapi.config.smtp.from`).
  to: ['john@doe.com'], // Recipients list.
  html: '<p>Hello John</p>', // HTML version of the email content.
  text: 'Hello John' // Text version of the email content.
}
```

Response payload:

```js
{
  "sent": true,
  "from": "contact@company.com",
  "to": "john@doe.com",
  "html": "<p>Hello John</p>",
  "text": "Hello John",
  "template": "default",
  "lang": "en",
  "createdAt": "2015-10-21T09:10:36.486Z",
  "updatedAt": "2015-10-21T09:10:36.871Z",
  "id": 2
}
```

## Email model

Each sent email is registered in the database. So you can retrieve them whenever
you want. However, you can disable this option by overriding the email service logic.
