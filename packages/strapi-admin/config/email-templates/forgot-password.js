'use strict';

const subject = `Reset password`;

const html = `<p>We heard that you lost your password. Sorry about that!</p>

<p>But don’t worry! You can use the following link to reset your password:</p>

<p><%= url %></p>

<p>Thanks.</p>`;

const text = `We heard that you lost your password. Sorry about that!

But don’t worry! You can use the following link to reset your password:

<%= url %>

Thanks.`;

module.exports = {
  subject,
  text,
  html,
};
