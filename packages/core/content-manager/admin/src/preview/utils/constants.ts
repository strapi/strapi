import { NotificationConfig } from '@strapi/admin/strapi-admin';
import { MessageDescriptor } from 'react-intl';

/**
 * These events are not part of the public API, changing them is not a breaking change.
 */
export const INTERNAL_EVENTS = {
  STRAPI_FIELD_FOCUS: 'strapiFieldFocus',
  STRAPI_FIELD_BLUR: 'strapiFieldBlur',
  STRAPI_FIELD_CHANGE: 'strapiFieldChange',
  STRAPI_FIELD_FOCUS_INTENT: 'strapiFieldFocusIntent',
  STRAPI_FIELD_SINGLE_CLICK_HINT: 'strapiFieldSingleClickHint',
  STRAPI_BLOCKS_EDIT_START: 'strapiBlocksEditStart',
  STRAPI_BLOCKS_EDIT_END: 'strapiBlocksEditEnd',
  STRAPI_SCROLL: 'strapiScroll',
  STRAPI_CLICK_OUTSIDE_BLOCKS: 'strapiClickOutsideBlocks',
  STRAPI_FIELD_POSITION_SYNC: 'strapiFieldPositionSync',
} as const;

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
