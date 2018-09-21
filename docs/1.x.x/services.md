# Services

Services can be thought of as libraries which contain functions that you might want to use
in many places of your application. For example, you might have an `Email` service which
wraps some default email message boilerplate code that you would want to use in many parts
of your application.

Simply create a JavaScript file containing a function or an object into your
`./api/<apiName>/services` directory.

For example, you could have an `Email service` like this:
```js
const nodemailer = require('nodemailer');

module.exports = {
  sendEmail: function (from, to, subject, text) {

    // Create reusable transporter object using SMTP transport
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'gmail.user@gmail.com',
        pass: 'userpass'
      }
    });

    // Setup e-mail data
    const options = {
      from: from,
      to: to,
      subject: subject,
      text: text
    };

    // Send mail
    transporter.sendMail(options, function(error, info){
      if (error) {
        console.log(error);
        return false;
      }

      console.log('Message sent: ' + info.response);
    });
  }
};
```
