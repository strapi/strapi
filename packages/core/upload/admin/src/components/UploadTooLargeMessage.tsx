import * as React from 'react';

import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { formatSizeLimit, type UploadTooLargeError } from '../utils/getUploadTooLargeError';
import { getTranslationKey } from '../utils/translations';

import type { MessageDescriptor } from 'react-intl';

const SettingName = styled.code`
  font-family:
    'SF Mono', SFMono-Regular, ui-monospace, 'DejaVu Sans Mono', Menlo, Consolas, monospace;
  color: inherit;
`;

const SETTINGS = {
  maxFileSize: 'formidable.maxFileSize',
  bodyMiddleware: 'strapi::body',
  sizeLimit: 'upload.config.sizeLimit',
} as const;

const MESSAGES = {
  requestLimit: {
    cause: {
      id: getTranslationKey('upload.tooLarge.requestLimit'),
      defaultMessage: 'Exceeds the server request limit of {limit}.',
    },
    hint: {
      id: getTranslationKey('upload.tooLarge.requestLimit.hint'),
      defaultMessage:
        'To raise it, a developer can increase {maxFileSize} on the {bodyMiddleware} middleware, together with {sizeLimit}.',
    },
  },
  sizeLimit: {
    cause: {
      id: getTranslationKey('upload.tooLarge.sizeLimit'),
      defaultMessage: 'Exceeds the Media Library upload limit of {limit}.',
    },
    hint: {
      id: getTranslationKey('upload.tooLarge.sizeLimit.hint'),
      defaultMessage: 'To raise it, a developer can increase {sizeLimit}.',
    },
  },
  external: {
    cause: {
      id: getTranslationKey('upload.tooLarge.external'),
      defaultMessage: 'Rejected as too large before reaching Strapi.',
    },
    hint: {
      id: getTranslationKey('upload.tooLarge.external.hint'),
      defaultMessage: 'A limit outside Strapi, such as a reverse proxy, is the likely cause.',
    },
  },
} satisfies Record<
  UploadTooLargeError['reason'],
  { cause: MessageDescriptor; hint: MessageDescriptor }
>;

const COMBINED_MESSAGE: MessageDescriptor = {
  id: getTranslationKey('upload.tooLarge.combined'),
  defaultMessage: '{cause} {hint}',
};

/**
 * Splits a too-large error into its plain cause and a sentence for the developer naming the
 * setting to change. Only the cause is meant to be announced to assistive tech.
 *
 * `hint` renders the setting names as inline code; `text` is both sentences as a plain string,
 * for surfaces that only take one.
 */
export const useUploadTooLargeMessage = () => {
  const { formatMessage } = useIntl();

  return React.useCallback(
    (error: UploadTooLargeError) => {
      const messages = MESSAGES[error.reason];
      const settings = {
        ...SETTINGS,
        sizeLimit: (error.reason === 'sizeLimit' && error.setting) || SETTINGS.sizeLimit,
      };
      const cause = formatMessage(messages.cause, {
        limit: 'limit' in error ? formatSizeLimit(error.limit) : undefined,
      });
      const hint = formatMessage(messages.hint, {
        maxFileSize: <SettingName>{settings.maxFileSize}</SettingName>,
        bodyMiddleware: <SettingName>{settings.bodyMiddleware}</SettingName>,
        sizeLimit: <SettingName>{settings.sizeLimit}</SettingName>,
      });

      return {
        cause,
        hint,
        combined: formatMessage(COMBINED_MESSAGE, { cause, hint }),
        text: formatMessage(COMBINED_MESSAGE, {
          cause,
          hint: formatMessage(messages.hint, settings),
        }),
      };
    },
    [formatMessage]
  );
};

export const UploadTooLargeMessage = ({ error }: { error: UploadTooLargeError }) => {
  const getMessage = useUploadTooLargeMessage();

  return <>{getMessage(error).combined}</>;
};
