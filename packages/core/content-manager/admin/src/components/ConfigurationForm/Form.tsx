import * as React from 'react';

import {
  Form,
  FormProps,
  useForm,
  InputRenderer,
  BackButton,
  Layouts,
} from '@strapi/admin/strapi-admin';
import { Button, Divider, Flex, Grid, Main, Typography } from '@strapi/design-system';
import { generateNKeysBetween } from 'fractional-indexing';
import pipe from 'lodash/fp/pipe';
import { useIntl } from 'react-intl';

import { ATTRIBUTE_TYPES_THAT_CANNOT_BE_MAIN_FIELD } from '../../constants/attributes';
import { capitalise } from '../../utils/strings';
import { getTranslation } from '../../utils/translations';

import { Fields, FieldsProps, TEMP_FIELD_NAME } from './Fields';

import type { EditFieldLayout, EditLayout } from '../../hooks/useDocumentLayout';

/* -------------------------------------------------------------------------------------------------
 * ConfigurationForm
 * -----------------------------------------------------------------------------------------------*/

interface ConfigurationFormProps extends Pick<FieldsProps, 'attributes' | 'fieldSizes'> {
  layout: EditLayout;
  onSubmit: FormProps<ConfigurationFormData>['onSubmit'];
}

/**
 * Every key in EditFieldLayout is turned to optional never and then we overwrite the ones we are using.
 */

type EditFieldSpacerLayout = {
  [key in keyof Omit<EditFieldLayout, 'name' | 'size'>]?: never;
} & {
  description?: never;
  editable?: never;
  name: '_TEMP_';
  size: number;
  __temp_key__: string;
};

interface ConfigurationFormData extends Pick<EditLayout, 'settings'> {
  layout: Array<{
    __temp_key__: string;
    children: Array<
      | (Pick<EditFieldLayout, 'label' | 'size' | 'name' | 'placeholder' | 'mainField'> & {
          description: EditFieldLayout['hint'];
          editable: EditFieldLayout['disabled'];
          __temp_key__: string;
        })
      | EditFieldSpacerLayout
    >;
  }>;
}

const ConfigurationForm = ({
  attributes,
  fieldSizes,
  layout: editLayout,
  onSubmit,
}: ConfigurationFormProps) => {
  const { components, settings, layout, metadatas } = editLayout;

  const { formatMessage } = useIntl();

  const initialValues: ConfigurationFormData = React.useMemo(() => {
    const transformations = pipe(
      flattenPanels,
      replaceMainFieldWithNameOnly,
      extractMetadata,
      addTmpSpaceToLayout,
      addTmpKeysToLayout
    );

    return {
      layout: transformations(layout),
      settings,
    };
  }, [layout, settings]);

  return (
    <Layouts.Root>
      <Main>
        <Form initialValues={initialValues} onSubmit={onSubmit} method="PUT">
          <Header name={settings.displayName ?? ''} />
          <Layouts.Content>
            <Flex
              alignItems="stretch"
              background="neutral0"
              direction="column"
              gap={6}
              hasRadius
              shadow="tableShadow"
              paddingTop={6}
              paddingBottom={6}
              paddingLeft={7}
              paddingRight={7}
            >
              <Typography variant="delta" tag="h2">
                {formatMessage({
                  id: getTranslation('containers.SettingPage.settings'),
                  defaultMessage: 'Settings',
                })}
              </Typography>
              <Grid.Root>
                <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
                  <InputRenderer
                    type="enumeration"
                    label={formatMessage({
                      id: getTranslation('containers.SettingPage.editSettings.entry.title'),
                      defaultMessage: 'Entry title',
                    })}
                    hint={formatMessage({
                      id: getTranslation(
                        'containers.SettingPage.editSettings.entry.title.description'
                      ),
                      defaultMessage: 'Set the display field of your entry',
                    })}
                    name="settings.mainField"
                    options={Object.entries(attributes).reduce<
                      Array<{ label: string; value: string }>
                    >((acc, [key, attribute]) => {
                      if (!attribute) {
                        return acc;
                      }

                      /**
                       * Create the list of attributes from the schema as to which can
                       * be our `mainField` and dictate the display name of the schema
                       * we're editing.
                       */
                      if (!ATTRIBUTE_TYPES_THAT_CANNOT_BE_MAIN_FIELD.includes(attribute.type)) {
                        acc.push({
                          label: key,
                          value: key,
                        });
                      }

                      return acc;
                    }, [])}
                  />
                </Grid.Item>
                <Grid.Item
                  paddingTop={6}
                  paddingBottom={6}
                  col={12}
                  s={12}
                  direction="column"
                  alignItems="stretch"
                >
                  <Divider />
                </Grid.Item>
                <Grid.Item col={12} s={12} direction="column" alignItems="stretch">
                  <Typography variant="delta" tag="h3">
                    {formatMessage({
                      id: getTranslation('containers.SettingPage.view'),
                      defaultMessage: 'View',
                    })}
                  </Typography>
                </Grid.Item>
                <Grid.Item col={12} s={12} direction="column" alignItems="stretch">
                  <Fields
                    attributes={attributes}
                    components={components}
                    fieldSizes={fieldSizes}
                    metadatas={metadatas}
                  />
                </Grid.Item>
              </Grid.Root>
            </Flex>
          </Layouts.Content>
        </Form>
      </Main>
    </Layouts.Root>
  );
};

/**
 * @internal
 * @description Panels don't exist in the layout, so we flatten by one.
 */
const flattenPanels = (layout: EditLayout['layout']): EditLayout['layout'][number] =>
  layout.flat(1);

/**
 * @internal
 * @description We don't need the mainField object in the layout, we only need the name.
 */
const replaceMainFieldWithNameOnly = (layout: EditLayout['layout'][number]) =>
  layout.map((row) =>
    row.map((field) => ({
      ...field,
      mainField: field.mainField?.name,
    }))
  );

/**
 * @internal
 * @description We extract the metadata values from the field layout, because these are editable by the user.
 */
const extractMetadata = (
  layout: EditLayout['layout'][number]
): Array<Exclude<ConfigurationFormData['layout'], { name: '_TEMP_' }>[number]['children']> => {
  return layout.map((row) =>
    row.map(({ label, disabled, hint, placeholder, size, name, mainField }) => ({
      label,
      editable: !disabled,
      description: hint,
      mainField,
      placeholder,
      size,
      name,
      __temp_key__: '',
    }))
  );
};

/**
 * @internal
 * @description Each row of the layout has a max size of 12 (based on bootstrap grid system)
 * So in order to offer a better drop zone we add the _TEMP_ div to complete the remaining substract (12 - existing)
 */
const addTmpSpaceToLayout = (
  layout: ReturnType<typeof extractMetadata>
): Array<ConfigurationFormData['layout'][number]['children']> => [
  ...layout.map((row) => {
    const totalSpaceTaken = row.reduce((acc, field) => acc + field.size, 0);

    if (totalSpaceTaken < 12) {
      return [
        ...row,
        {
          name: TEMP_FIELD_NAME,
          size: 12 - totalSpaceTaken,
          __temp_key__: '',
        } satisfies EditFieldSpacerLayout,
      ];
    }

    return row;
  }),
];

/**
 * @internal
 * @description At this point of the transformations we have Field[][], but each row for the form should have a __temp_key__
 * applied. This means we need to change it so `Field` is nested under the children property.
 */
const addTmpKeysToLayout = (
  layout: ReturnType<typeof addTmpSpaceToLayout>
): ConfigurationFormData['layout'] => {
  const keys = generateNKeysBetween(undefined, undefined, layout.length);

  return layout.map((row, rowIndex) => {
    const fieldKeys = generateNKeysBetween(undefined, undefined, row.length);

    return {
      __temp_key__: keys[rowIndex],
      children: row.map((field, fieldIndex) => {
        return {
          ...field,
          __temp_key__: fieldKeys[fieldIndex],
        };
      }),
    };
  });
};

/* -------------------------------------------------------------------------------------------------
 * Header
 * -----------------------------------------------------------------------------------------------*/

interface HeaderProps {
  name: string;
}

const Header = ({ name }: HeaderProps) => {
  const { formatMessage } = useIntl();
  const modified = useForm('Header', (state) => state.modified);
  const isSubmitting = useForm('Header', (state) => state.isSubmitting);

  return (
    <Layouts.Header
      title={formatMessage(
        {
          id: getTranslation('components.SettingsViewWrapper.pluginHeader.title'),
          defaultMessage: `Configure the view - {name}`,
        },
        { name: capitalise(name) }
      )}
      subtitle={formatMessage({
        id: getTranslation('components.SettingsViewWrapper.pluginHeader.description.edit-settings'),
        defaultMessage: 'Customize how the edit view will look like.',
      })}
      navigationAction={<BackButton />}
      primaryAction={
        <Button disabled={!modified} loading={isSubmitting} type="submit">
          {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
        </Button>
      }
    />
  );
};

export { ConfigurationForm };
export type { ConfigurationFormProps, ConfigurationFormData, EditFieldSpacerLayout };
