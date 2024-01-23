import * as React from 'react';

import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import { Attribute } from '@strapi/types';
import { satisfies } from 'semver';

import { useTypedSelector } from '../../core/store/hooks';
import { selectSchemas } from '../pages/App';
import { useGetContentTypeConfigurationQuery } from '../services/contentTypes';
import { type FormattedLayouts, formatLayouts } from '../utils/layouts';

interface EditFieldLayout {
  name: string;
  size: number;
  // if there's no type, we won't render the field and will show a warning.
  type?: Attribute.Kind;
}

/**
 * An initial array to map with, split into panels, then split into rows containing the fields.
 */
type EditLayout = Array<Array<EditFieldLayout[]>>;

const useContentTypeLayout = (
  contentTypeUID: string,
  type: 'edit' | 'list'
): {
  isLoading: boolean;
  layout: EditLayout | null;
} => {
  const schemas = useTypedSelector(selectSchemas);

  const { data, isLoading } = useGetContentTypeConfigurationQuery(contentTypeUID);

  console.log('data-from-api', data);

  const layout = React.useMemo(
    () =>
      data
        ? type === 'edit'
          ? formatEditLayout(data, schemas)
          : formatLayouts(data, schemas)
        : null,
    [data, schemas, type]
  );

  console.log('formattedLayout', layout);

  return {
    isLoading,
    layout,
  };
};

type LayoutData = Contracts.ContentTypes.FindContentTypeConfiguration.Response['data'];

/**
 * FormatEditLayout
 */
const formatEditLayout = (
  data: LayoutData,
  schemas: Array<Contracts.Components.Component | Contracts.ContentTypes.ContentType>
) => {
  const { contentType, components } = data;
  const schema = schemas.find((schema) => schema.uid === contentType.uid);

  /**
   * A collection of the fields arranged by the rows and reduced to their simplest form.
   */
  const editAttributes = contentType.layouts.edit.map((row) =>
    row.map((field) => {
      const { type } = schema?.attributes[field.name] ?? {};

      return { ...field, type } satisfies EditFieldLayout;
    })
  );

  let currentPanelIndex = 0;
  /**
   * The fields arranged by the panels, new panels are made for dynamic zones only.
   */
  const panelledEditAttributes = editAttributes.reduce<Array<EditFieldLayout[][]>>(
    (panels, row) => {
      if (row.some((field) => field.type === 'dynamiczone')) {
        panels.push([row]);
        currentPanelIndex += 2;
      } else {
        if (!panels[currentPanelIndex]) {
          panels.push([]);
        }
        panels[currentPanelIndex].push(row);
      }

      return panels;
    },
    []
  );

  return panelledEditAttributes;
};

export { useContentTypeLayout };
export type { EditLayout, EditFieldLayout };
