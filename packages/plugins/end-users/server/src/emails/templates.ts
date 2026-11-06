/**
 * The emails the engine sends, as templates of the email plugin: administrators edit their subject
 * and body in the admin, per locale. These are the defaults, used until one is edited.
 *
 * The email plugin picks a template by the user's `preferredLocale`, then `en`, then these. Placeholders are
 * `{{ name }}`, filled from the variables a template declares, and are escaped in the HTML.
 */
import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../constants';

/** The registry key of a template: `end-users.<name>`. */
export const templateKey = (name: EmailTemplateName) => `${PLUGIN_ID}.${name}`;

export type EmailTemplateName =
  | 'verify-email'
  | 'reset-password'
  | 'change-email'
  | 'magic-link'
  | 'email-otp'
  | 'two-factor-otp'
  | 'welcome';

interface EmailTemplate {
  name: EmailTemplateName;
  description: string;
  variables: string[];
  defaults: { subject: string; html: string; text: string };
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    name: 'verify-email',
    description: 'Asks a user to confirm their email address.',
    variables: ['user.name', 'user.email', 'url'],
    defaults: {
      subject: 'Confirm your email address',
      html: [
        '<p>Hi {{ user.name }},</p>',
        '<p>Please confirm your email address, {{ user.email }}, by following this link:</p>',
        '<p><a href="{{ url }}">Confirm my email</a></p>',
        "<p>If you didn't create an account, you can ignore this email.</p>",
      ].join('\n'),
      text: [
        'Hi {{ user.name }},',
        '',
        'Please confirm your email address, {{ user.email }}, by following this link:',
        '{{ url }}',
        '',
        "If you didn't create an account, you can ignore this email.",
      ].join('\n'),
    },
  },
  {
    name: 'reset-password',
    description: 'Gives a user a link to choose a new password.',
    variables: ['user.name', 'user.email', 'url'],
    defaults: {
      subject: 'Reset your password',
      html: [
        '<p>Hi {{ user.name }},</p>',
        '<p>We got a request to reset the password for {{ user.email }}. Follow this link to choose a new one:</p>',
        '<p><a href="{{ url }}">Reset my password</a></p>',
        "<p>If you didn't ask for this, you can ignore this email. Your password stays the same.</p>",
      ].join('\n'),
      text: [
        'Hi {{ user.name }},',
        '',
        'We got a request to reset the password for {{ user.email }}. Follow this link to choose a new one:',
        '{{ url }}',
        '',
        "If you didn't ask for this, you can ignore this email. Your password stays the same.",
      ].join('\n'),
    },
  },
  {
    name: 'change-email',
    description: 'Sent to the new address when a user asks to change their email address.',
    variables: ['user.name', 'user.email', 'newEmail', 'url'],
    defaults: {
      subject: 'Confirm your new email address',
      html: [
        '<p>Hi {{ user.name }},</p>',
        '<p>You asked to change your email address from {{ user.email }} to {{ newEmail }}. Follow this link to confirm it:</p>',
        '<p><a href="{{ url }}">Confirm the change</a></p>',
        "<p>If you didn't ask for this, you can ignore this email.</p>",
      ].join('\n'),
      text: [
        'Hi {{ user.name }},',
        '',
        'You asked to change your email address from {{ user.email }} to {{ newEmail }}. Follow this link to confirm it:',
        '{{ url }}',
        '',
        "If you didn't ask for this, you can ignore this email.",
      ].join('\n'),
    },
  },
  {
    name: 'magic-link',
    description: 'Signs a user in with a link.',
    variables: ['email', 'url'],
    defaults: {
      subject: 'Your sign-in link',
      html: [
        '<p>Hi,</p>',
        '<p>Follow this link to sign in as {{ email }}:</p>',
        '<p><a href="{{ url }}">Sign in</a></p>',
        "<p>If you didn't ask for this, you can ignore this email.</p>",
      ].join('\n'),
      text: [
        'Hi,',
        '',
        'Follow this link to sign in as {{ email }}:',
        '{{ url }}',
        '',
        "If you didn't ask for this, you can ignore this email.",
      ].join('\n'),
    },
  },
  {
    name: 'email-otp',
    description:
      'Sends a one-time code by email. The type is sign-in, email-verification, forget-password or change-email.',
    variables: ['email', 'otp', 'type'],
    defaults: {
      subject: 'Your verification code',
      html: [
        '<p>Hi,</p>',
        '<p>Your verification code for {{ email }} is:</p>',
        '<p><strong>{{ otp }}</strong></p>',
        "<p>If you didn't ask for this, you can ignore this email.</p>",
      ].join('\n'),
      text: [
        'Hi,',
        '',
        'Your verification code for {{ email }} is: {{ otp }}',
        '',
        "If you didn't ask for this, you can ignore this email.",
      ].join('\n'),
    },
  },
  {
    name: 'two-factor-otp',
    description: 'Sends the code a user asked for as their second sign-in step.',
    variables: ['user.name', 'otp'],
    defaults: {
      subject: 'Your sign-in code',
      html: [
        '<p>Hi {{ user.name }},</p>',
        '<p>Your sign-in code is:</p>',
        '<p><strong>{{ otp }}</strong></p>',
        "<p>If you didn't try to sign in, change your password.</p>",
      ].join('\n'),
      text: [
        'Hi {{ user.name }},',
        '',
        'Your sign-in code is: {{ otp }}',
        '',
        "If you didn't try to sign in, change your password.",
      ].join('\n'),
    },
  },
  {
    name: 'welcome',
    description:
      'Sent once to a new user: when their email is verified, or at sign-up when verification is not required.',
    variables: ['user.name', 'user.email'],
    defaults: {
      subject: 'Welcome',
      html: [
        '<p>Hi {{ user.name }},</p>',
        '<p>Welcome! Your account for {{ user.email }} is ready.</p>',
      ].join('\n'),
      text: [
        'Hi {{ user.name }},',
        '',
        'Welcome! Your account for {{ user.email }} is ready.',
      ].join('\n'),
    },
  },
];

/** Registers the plugin's templates with the email plugin. Call it from `register()`. */
export const registerEmailTemplates = (strapi: Core.Strapi) => {
  const templates = strapi.plugin('email').service('templates');

  for (const { name, description, variables, defaults } of EMAIL_TEMPLATES) {
    templates.register(templateKey(name), { description, variables, defaults });
  }
};
