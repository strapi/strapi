'use strict';

const subject = `Two Factor Authentication`;

const html = `<p>Two-factor code has been requested for the Strapi account associated with this email address.</p>

<p>In order to login, please copy the following two-factor code into the application.</p>

<p><%= url %></p>

<p>Thanks.</p>`;

const text = `Two-factor code has been requested for the Strapi account associated with this email address.

In order to login, please copy the following two-factor code into the application.

<%= url %>

Thanks.`;

module.exports = {
  subject,
  text,
  html,
};
