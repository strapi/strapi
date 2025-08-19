/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import { InputRenderer } from '@strapi/content-manager/strapi-admin';
import {
  Flex,
  VisuallyHidden,
  Modal,
  Button,
  Typography,
  Popover,
  Tooltip,
  Checkbox,
  Badge,
  Box,
} from '@strapi/design-system';
import { Earth } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useGetLocalesQuery } from '../services/locales';
import { getTranslation } from '../utils/getTranslation';

import type { EditFieldLayout, EditLayout } from '@strapi/content-manager/strapi-admin';

interface MutateEditViewArgs {
  layout: EditLayout;
}

const mutateEditViewHook = ({ layout }: MutateEditViewArgs): MutateEditViewArgs => {
  // If i18n isn't explicitly enabled on the content type, then no field can be localized
  if (
    !('i18n' in layout.options) ||
    (typeof layout.options.i18n === 'object' &&
      layout.options.i18n !== null &&
      'localized' in layout.options.i18n &&
      !layout.options.i18n.localized)
  ) {
    return { layout };
  }

  const components = Object.entries(layout.components).reduce<EditLayout['components']>(
    (acc, [key, componentLayout]) => {
      return {
        ...acc,
        [key]: {
          ...componentLayout,
          layout: componentLayout.layout.map((row) => row.map(addLabelActionToField)),
        },
      };
    },
    {}
  );

  return {
    layout: {
      ...layout,
      components,
      layout: layout.layout.map((panel) => panel.map((row) => row.map(addLabelActionToField))),
    },
  } satisfies Pick<MutateEditViewArgs, 'layout'>;
};

const addLabelActionToField = (field: EditFieldLayout) => {
  const isFieldLocalized = doesFieldHaveI18nPluginOpt(field.attribute.pluginOptions)
    ? field.attribute.pluginOptions.i18n.localized
    : true || ['uid', 'relation'].includes(field.attribute.type);

  if (!isFieldLocalized) {
    return field;
  }

  return {
    ...field,
    labelAction: <LabelAction field={field} />,
  };
};

const doesFieldHaveI18nPluginOpt = (
  pluginOpts?: object
): pluginOpts is { i18n: { localized: boolean } } => {
  if (!pluginOpts) {
    return false;
  }

  return (
    'i18n' in pluginOpts &&
    typeof pluginOpts.i18n === 'object' &&
    pluginOpts.i18n !== null &&
    'localized' in pluginOpts.i18n
  );
};

/* -------------------------------------------------------------------------------------------------
 * LabelAction
 * -----------------------------------------------------------------------------------------------*/

const LabelAction = ({ field }: { field: EditFieldLayout }) => {
  const { formatMessage } = useIntl();
  const { data: locales = [] } = useGetLocalesQuery();

  console.log('locales', locales);

  if (!Array.isArray(locales) || locales.length <= 1) {
    return null;
  }

  return (
    <Modal.Root>
      <Tooltip delayDuration={100} label={'See this field in other locales'}>
        <Modal.Trigger>
          <Flex
            borderRadius="100px"
            background="neutral200"
            paddingLeft={1}
            paddingRight={1}
            gap="2px"
            color="neutral500"
            tag="button"
            cursor="pointer"
          >
            <Earth aria-hidden />
            <Typography variant="pi">+{locales.length - 1}</Typography>
          </Flex>
        </Modal.Trigger>
      </Tooltip>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>{field.name} — All localizations</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Flex direction="column" gap={4} alignItems="stretch">
            {locales.map((locale) => (
              <Flex key={locale.id} direction="column" alignItems="flex-start" width="100%" gap={1}>
                <Badge size="S">{locale.name}</Badge>
                <Flex key={locale.id} gap={2} width="100%">
                  <Checkbox defaultChecked={true} />
                  <Box flex={1}>
                    <InputRenderer {...field} label={''} document={{} as any} />
                  </Box>
                </Flex>
              </Flex>
            ))}
          </Flex>
          <Button variant="secondary" marginTop={4}>
            Translate selected localizations with AI
          </Button>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="tertiary">
              {formatMessage({
                id: 'global.cancel',
                defaultMessage: 'Cancel',
              })}
            </Button>
          </Modal.Close>
          <Button>Save all</Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export { mutateEditViewHook };
