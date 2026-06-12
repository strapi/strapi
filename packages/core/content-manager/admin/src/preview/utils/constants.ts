import { NotificationConfig } from '@strapi/admin/strapi-admin';
import { MessageDescriptor } from 'react-intl';

import { previewScript } from './previewScript';

export const PREVIEW_HIGHLIGHT_COLORS = {
  highlightHoverColor: 'transparent',
  highlightActiveColor: 'transparent',
} as const;

const scriptResponse = previewScript({ shouldRun: false, colors: PREVIEW_HIGHLIGHT_COLORS });

/**
 * These events can be changed safely. They're used by the content manager admin on one side, and by
 * the preview script on the other. We own both ends, and they're not documented to users, so we can
 * do what we want with them.
 */
export const INTERNAL_EVENTS = scriptResponse!.INTERNAL_EVENTS;

/**
 * These events are documented to users, and will be hardcoded in their frontends.
 * Changing any of these would be a breaking change.
 */
export const PUBLIC_EVENTS = {
  PREVIEW_READY: 'previewReady',
  STRAPI_UPDATE: 'strapiUpdate',
  STRAPI_SCRIPT: 'strapiScript',
} as const;

/**
 * Error messages for preview field operations.
 * This information is used to trigger notifications.
 */
export const PREVIEW_ERROR_MESSAGES = {
  INVALID_FIELD_PATH: {
    type: 'danger',
    message: {
      id: 'content-manager.preview.error.invalid-field-path',
      defaultMessage: 'Could not locate this field in the current document',
    },
  },
  RELATIONS_NOT_HANDLED: {
    type: 'info',
    message: {
      id: 'content-manager.preview.error.relations-not-handled',
      defaultMessage: 'Inline editing for relations is not currently supported.',
    },
  },
  INCOMPLETE_STRAPI_SOURCE: {
    type: 'danger',
    message: {
      id: 'content-manager.preview.error.incomplete-strapi-source',
      defaultMessage: 'This field is missing some required preview information',
    },
  },
  DIFFERENT_DOCUMENT: {
    type: 'info',
    message: {
      id: 'content-manager.preview.error.different-document',
      defaultMessage: 'This field comes from a different document',
    },
  },
} as const satisfies Record<
  string,
  { message: MessageDescriptor; type: NonNullable<NotificationConfig['type']> }
>;
