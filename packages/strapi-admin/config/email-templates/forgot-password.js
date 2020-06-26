const subject = `Reset password`;

const html = `<p>We heard that you lost your password. Sorry about that!</p>

<p>But don’t worry! You can use the following link to reset your password:</p>

<p><%= url %>?code=<%= resetPasswordToken %></p>

<p>Thanks.</p>`;

const text = `We heard that you lost your password. Sorry about that!

But don’t worry! You can use the following link to reset your password:

<%= url %>?code=<%= resetPasswordToken %>

Thanks.`;

module.exports = {
  subject,
  text,
  html,
};
