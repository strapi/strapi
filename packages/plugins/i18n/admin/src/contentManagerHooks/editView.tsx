/* eslint-disable check-file/filename-naming-convention */
import { Flex, Tooltip, VisuallyHidden } from '@strapi/design-system';
import { Earth } from '@strapi/icons';
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

  const decorateField = (field: EditFieldLayout) => addLabelActionToField(field, layout);

  const components = Object.entries(layout.components).reduce<EditLayout['components']>(
    (acc, [key, componentLayout]) => {
      return {
        ...acc,
        [key]: {
          ...componentLayout,
          layout: componentLayout.layout.map((row) => row.map(decorateField)),
        },
      };
    },
    {}
  );

  return {
    layout: {
      ...layout,
      components,
      layout: layout.layout.map((panel) => panel.map((row) => row.map(decorateField))),
    },
  } satisfies Pick<MutateEditViewArgs, 'layout'>;
};

const isFieldLocalized = (attribute: EditFieldLayout['attribute'], layout: EditLayout) => {
  const contentTypeLocalized =
    !!(layout.options as any)?.i18n && !!(layout.options as any).i18n.localized;

  if (!contentTypeLocalized) {
    return false;
  }

  const pluginOptions =
    attribute && typeof attribute === 'object' && 'pluginOptions' in (attribute as object)
      ? (attribute as { pluginOptions?: { i18n?: { localized?: boolean } } }).pluginOptions
      : undefined;

  return pluginOptions?.i18n?.localized === true;
};

const addLabelActionToField = (field: EditFieldLayout, layout: EditLayout) => {
  const localized = isFieldLocalized(field.attribute, layout);

  if (!localized) {
    return field;
  }

  const title: MessageDescriptor = {
    id: getTranslation('Field.localized'),
    defaultMessage: 'This value is unique for the selected locale',
  };

  return {
    ...field,
    labelAction: <LabelAction title={title} />,
  };
};

/* -------------------------------------------------------------------------------------------------
 * LabelAction
 * -----------------------------------------------------------------------------------------------*/

interface LabelActionProps {
  title: MessageDescriptor;
}

const LabelAction = ({ title }: LabelActionProps) => {
  const { formatMessage } = useIntl();

  return (
    <Span tag="span" title={title}>
      <VisuallyHidden tag="span">{formatMessage(title)}</VisuallyHidden>
      <Tooltip label={formatMessage(title)}>
        <Earth aria-hidden focusable={false} />
      </Tooltip>
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
