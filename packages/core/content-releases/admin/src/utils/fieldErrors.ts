import type { ReleaseActionReason } from '../../../shared/contracts/release-actions';
import type { IntlShape } from 'react-intl';

type FieldError = NonNullable<ReleaseActionReason['validation']>['errors'][number];

// `metaTitle` or `meta_title` reads as "Meta title"
const humanize = (name: string) => {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();

  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * The field's name, readable through its components: "Seo › Meta title", or "Sections #2 › Title"
 * in a repeatable component. Built from the path alone: the edit view's labels would take a
 * request, and Content Manager permissions, per content type.
 */
const getFieldLabel = (path: string[]) =>
  path
    .reduce<string[]>((labels, segment) => {
      // An index in a repeatable component or a dynamic zone
      if (/^\d+$/.test(segment)) {
        return labels.length > 0
          ? [...labels.slice(0, -1), `${labels[labels.length - 1]} #${Number(segment) + 1}`]
          : labels;
      }

      return [...labels, humanize(segment)];
    }, [])
    .join(' › ');

const getProblem = (
  { path, message }: FieldError,
  formatMessage: IntlShape['formatMessage']
): string => {
  if (/must be defined|is a required field|must be a `\w+` type/.test(message)) {
    return formatMessage({
      id: 'content-releases.pages.ReleaseDetails.field-error.required',
      defaultMessage: 'Required, or not a valid value',
    });
  }

  if (/must be unique/i.test(message)) {
    return formatMessage({
      id: 'content-releases.pages.ReleaseDetails.field-error.unique',
      defaultMessage: 'Already used by another entry',
    });
  }

  const minItems = /must have at least (\d+) items/.exec(message);
  if (minItems) {
    return formatMessage(
      {
        id: 'content-releases.pages.ReleaseDetails.field-error.min-items',
        defaultMessage: 'Needs at least {count, plural, one {# item} other {# items}}',
      },
      { count: Number(minItems[1]) }
    );
  }

  const maxItems = /must have at most (\d+) items/.exec(message);
  if (maxItems) {
    return formatMessage(
      {
        id: 'content-releases.pages.ReleaseDetails.field-error.max-items',
        defaultMessage: 'Allows at most {count, plural, one {# item} other {# items}}',
      },
      { count: Number(maxItems[1]) }
    );
  }

  const minLength = /at least (\d+) characters/.exec(message);
  if (minLength) {
    return formatMessage(
      {
        id: 'content-releases.pages.ReleaseDetails.field-error.min-length',
        defaultMessage: 'Too short: at least {count} characters',
      },
      { count: Number(minLength[1]) }
    );
  }

  const maxLength = /at most (\d+) characters/.exec(message);
  if (maxLength) {
    return formatMessage(
      {
        id: 'content-releases.pages.ReleaseDetails.field-error.max-length',
        defaultMessage: 'Too long: at most {count} characters',
      },
      { count: Number(maxLength[1]) }
    );
  }

  if (/valid email/.test(message)) {
    return formatMessage({
      id: 'content-releases.pages.ReleaseDetails.field-error.email',
      defaultMessage: 'Not a valid email',
    });
  }

  if (/valid link|valid url/i.test(message)) {
    return formatMessage({
      id: 'content-releases.pages.ReleaseDetails.field-error.link',
      defaultMessage: 'Not a valid link',
    });
  }

  if (/must match the following/.test(message)) {
    return formatMessage({
      id: 'content-releases.pages.ReleaseDetails.field-error.format',
      defaultMessage: 'Doesn’t match the expected format',
    });
  }

  const fieldPath = path.join('.');
  const withoutField = message.startsWith(fieldPath)
    ? message.slice(fieldPath.length).trim()
    : message;
  const text = withoutField.replace(/`/g, '').replace(/\.$/, '');

  return text.charAt(0).toUpperCase() + text.slice(1);
};

export { getFieldLabel, getProblem };
export type { FieldError };
