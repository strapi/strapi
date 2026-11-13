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
      sender: false,
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
      sender: false,
    });
  });

  it('translates the subject', () => {
    expect(
      translateUpTemplate('reset_password', {
        options: {
          object: 'Hi <%= USER.username %>',
          message: '<p><%= URL %>?code=<%= TOKEN %></p>',
        },
      })
    ).toMatchObject({ kind: 'translated', subject: 'Hi {{ user.name }}' });
  });

  it('leaves a bare URL untranslated', () => {
    expect(translateUpTemplate('reset_password', stored('<p><%= URL %></p>'))).toMatchObject({
      kind: 'untranslated',
      placeholders: ['URL'],
    });
  });

  it('sets the sender flag from response_email alone, on every kind', () => {
    const reply = { response_email: 'help@acme.test' };

    expect(
      translateUpTemplate('reset_password', stored('<p><%= URL %>?code=<%= TOKEN %></p>', reply))
    ).toMatchObject({ kind: 'translated', sender: true });
    expect(
      translateUpTemplate('reset_password', stored('<p><%= SERVER_URL %></p>', reply))
    ).toMatchObject({
      kind: 'untranslated',
      sender: true,
    });
    expect(
      translateUpTemplate('reset_password', {
        options: { ...reply, object: 'Reset password', message: '' },
      })
    ).toEqual({ kind: 'default', key: 'end-users.reset-password', sender: true });
  });

  it('decodes &amp; last, so &amp;lt; stays &lt;', () => {
    const result = translateUpTemplate(
      'reset_password',
      stored('<p>a &amp;lt; b &lt; c <%= URL %>?code=<%= TOKEN %></p>')
    );

    expect(result).toMatchObject({ kind: 'translated', text: 'a &lt; b < c {{ url }}' });
  });
});
