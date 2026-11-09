import { describe, expect, it } from 'vitest';

import { translateUpTemplate } from '../map-templates';

const stored = (message: string, extra: Record<string, unknown> = {}) => ({
  options: { object: 'Welcome', message, ...extra },
});

describe('translateUpTemplate', () => {
  it('translates URL with code or confirmation, USER.email and USER.username', () => {
    expect(
      translateUpTemplate(
        'reset_password',
        stored('<p>Hi <%= USER.username %>: <%= URL %>?code=<%= TOKEN %></p>')
      )
    ).toEqual({
      kind: 'translated',
      key: 'end-users.reset-password',
      locale: 'en',
      subject: 'Welcome',
      html: '<p>Hi {{ user.name }}: {{ url }}</p>',
      text: 'Hi {{ user.name }}: {{ url }}',
      sender: false,
    });

    expect(
      translateUpTemplate(
        'email_confirmation',
        stored('<p><%- USER.email %>: <%= URL %>?confirmation=<%= CODE %></p>')
      )
    ).toMatchObject({
      kind: 'translated',
      key: 'end-users.verify-email',
      html: '<p>{{ user.email }}: {{ url }}</p>',
      text: '{{ user.email }}: {{ url }}',
    });
  });

  it('flags a changed sender or reply-to', () => {
    const result = translateUpTemplate(
      'reset_password',
      stored('<p><%= URL %>?code=<%= TOKEN %></p>', {
        from: { name: 'Acme', email: 'help@acme.test' },
      })
    );

    expect(result).toMatchObject({ kind: 'translated', sender: true });
  });

  it('leaves a template naming SERVER_URL untranslated and names the placeholder', () => {
    expect(
      translateUpTemplate(
        'reset_password',
        stored('<p><%= SERVER_URL %>/x <%= URL %>?code=<%= TOKEN %></p>')
      )
    ).toEqual({
      kind: 'untranslated',
      key: 'end-users.reset-password',
      placeholders: ['SERVER_URL'],
    });
  });

  it('skips a template that is still the seeded default', () => {
    const seeded = {
      options: {
        from: { name: 'Administration Panel', email: 'no-reply@strapi.io' },
        response_email: '',
        object: 'Account confirmation',
        message: `<p>Thank you for registering!</p>

<p>You have to confirm your email address.   Please click on the link below.</p>
<p><%= URL %>?confirmation=<%= CODE %></p>
<p>Thanks.</p>`,
      },
    };

    expect(translateUpTemplate('email_confirmation', seeded)).toEqual({
      kind: 'default',
      key: 'end-users.verify-email',
    });
  });
});
