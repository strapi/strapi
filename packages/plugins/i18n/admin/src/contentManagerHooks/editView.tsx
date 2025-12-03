/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import { unstable_useDocumentLayout as useDocumentLayout } from '@strapi/content-manager/strapi-admin';
import { Flex, Tooltip, VisuallyHidden } from '@strapi/design-system';
import { Earth } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';
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

const addLabelActionToField = (field: EditFieldLayout) => ({
  ...field,
  labelAction: (props: { name: string; attribute: unknown }) => (
    <LabelAction name={props.name} attribute={props.attribute as EditFieldLayout['attribute']} />
  ),
});

interface LabelActionProps {
  name: string;
  attribute: EditFieldLayout['attribute'];
}

const LabelAction = ({ name, attribute }: LabelActionProps) => {
  const { formatMessage } = useIntl();
  const { slug: model } = useParams<{ slug: string }>();
  const { edit } = useDocumentLayout(model!);

  const isLocalized = isFieldLocalized(name, attribute, edit);

  if (!isLocalized) {
    return null;
  }

  const title = {
    id: getTranslation('Field.localized'),
    defaultMessage: 'This value is unique for the selected locale',
  } as const;

  return (
    <Span tag="span">
      <VisuallyHidden tag="span">{formatMessage(title)}</VisuallyHidden>
      <Tooltip label={formatMessage(title)}>
        <Earth aria-hidden focusable={false} />
        {/* See: https://allyjs.io/tutorials/focusing-in-svg.html#making-svg-elements-focusable */}
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

/**
 * Compute effective localization for a specific field occurrence based on:
 * - Content type i18n setting
 * - Ancestor attribute (dynamic zone or component) i18n setting
 * - Field-level i18n setting for root fields
 */
const isFieldLocalized = (
  name: string,
  attribute: EditFieldLayout['attribute'],
  edit: EditLayout
) => {
  const contentTypeLocalized =
    !!(edit.options as any)?.i18n && !!(edit.options as any).i18n.localized;

  if (!contentTypeLocalized) {
    return false;
  }

  const path = name.split('.');
  const topLevelAttrName = path[0];
  const topLevelField = getAttributeParentField(edit, topLevelAttrName);
  if (!topLevelField) {
    return false;
  }

  // If the top-level attribute is a component or a dynamic zone, all nested fields inherit it.
  if (
    topLevelField.attribute.type === 'component' ||
    topLevelField.attribute.type === 'dynamiczone'
  ) {
    return getBooleanLocalized(getPluginOptions(topLevelField.attribute));
  }

  // Otherwise, we're dealing with a root-level field.
  return getBooleanLocalized(getPluginOptions(attribute));
};

const getBooleanLocalized = (pluginOptions?: unknown): boolean => {
  if (pluginOptions && typeof pluginOptions === 'object') {
    const i18n = (pluginOptions as { i18n?: { localized?: boolean } }).i18n;
    return i18n?.localized === true;
  }
  return false;
};

const getPluginOptions = (attr: EditFieldLayout['attribute']) => {
  return attr && typeof attr === 'object' && 'pluginOptions' in (attr as object)
    ? (attr as { pluginOptions?: unknown }).pluginOptions
    : undefined;
};

const getAttributeParentField = (edit: EditLayout, name: string) => {
  return edit.layout.flat(2).find((f) => f.name === name) ?? undefined;
};

export { mutateEditViewHook };
