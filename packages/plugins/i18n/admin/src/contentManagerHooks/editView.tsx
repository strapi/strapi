/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import { Flex, VisuallyHidden } from '@strapi/design-system';
import { Earth, EarthStriked } from '@strapi/icons';
import { MessageDescriptor, useIntl } from 'react-intl';
import { styled } from 'styled-components';

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

  const labelActionProps = {
    title: {
      id: isFieldLocalized
        ? getTranslation('Field.localized')
        : getTranslation('Field.not-localized'),
      defaultMessage: isFieldLocalized
        ? 'This value is unique for the selected locale'
        : 'This value is the same across all locales',
    },
    icon: isFieldLocalized ? <Earth /> : <EarthStriked />,
  };

  return {
    ...field,
    labelAction: <LabelAction {...labelActionProps} />,
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

interface LabelActionProps {
  title: MessageDescriptor;
  icon: React.ReactNode;
}

const LabelAction = ({ title, icon }: LabelActionProps) => {
  const { formatMessage } = useIntl();

  return (
    <Span tag="span">
      <VisuallyHidden tag="span">{formatMessage(title)}</VisuallyHidden>
      {React.cloneElement(icon as React.ReactElement, {
        'aria-hidden': true,
        focusable: false, // See: https://allyjs.io/tutorials/focusing-in-svg.html#making-svg-elements-focusable
      })}
    </Span>
  );
};

const Span = styled(Flex)`
  svg {
    width: 12px;
    height: 12px;

    fill: ${({ theme }) => theme.colors.neutral500};

    path {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
  }
`;

export { mutateEditViewHook };
