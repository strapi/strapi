import { Field, MultiSelect, MultiSelectOption } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useField } from '../../../../../components/Form';
import { useContentTypes } from '../../../../../hooks/useContentTypes';

const ContentTypesInput = () => {
  const { formatMessage } = useIntl();
  const { collectionTypes, singleTypes } = useContentTypes();
  const { value = [], onChange, error } = useField<string[]>('contentTypes');

  const contentTypes = [...collectionTypes, ...singleTypes];

  return (
    <Field.Root
      error={error}
      hint={formatMessage({
        id: 'Settings.webhooks.form.contentTypes.hint',
        defaultMessage:
          'Restrict this webhook to the selected content types. Leave empty to fire for every content type.',
      })}
      name="contentTypes"
    >
      <Field.Label>
        {formatMessage({
          id: 'Settings.webhooks.form.contentTypes',
          defaultMessage: 'Content Types',
        })}
      </Field.Label>
      <MultiSelect
        onChange={(v) => {
          onChange('contentTypes', v);
        }}
        placeholder={formatMessage({
          id: 'app.components.Select.placeholder',
          defaultMessage: 'Select',
        })}
        value={value}
        withTags
      >
        {contentTypes.map((contentType) => (
          <MultiSelectOption key={contentType.uid} value={contentType.uid}>
            {contentType.info.displayName}
          </MultiSelectOption>
        ))}
      </MultiSelect>
      <Field.Error />
      <Field.Hint />
    </Field.Root>
  );
};

export { ContentTypesInput };
