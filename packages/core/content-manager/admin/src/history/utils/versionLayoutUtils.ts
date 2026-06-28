import type { Metadatas } from '../../../../shared/contracts/content-types';
import type { GetInitData } from '../../../../shared/contracts/init';
import type { EditFieldLayout } from '../../hooks/useDocumentLayout';
import type { HistoryContextValue } from '../HistoryContext';

type UnknownField = EditFieldLayout & { name: string };

const createLayoutFromFields = <T extends EditFieldLayout | UnknownField>(fields: T[]) => {
  return fields
    .reduce<Array<T[]>>((rows, field) => {
      if (field.type === 'dynamiczone') {
        rows.push([field]);

        return rows;
      }

      if (!rows[rows.length - 1]) {
        rows.push([]);
      }

      rows[rows.length - 1].push(field);

      return rows;
    }, [])
    .map((row) => [row]);
};

type GetRemainingFieldsLayoutOptions = Pick<HistoryContextValue, 'layout'> &
  Pick<GetInitData.Response['data'], 'fieldSizes'> & {
    schemaAttributes: HistoryContextValue['schema']['attributes'];
    metadatas: Metadatas;
  };

function getRemaingFieldsLayout({
  layout,
  metadatas,
  schemaAttributes,
  fieldSizes,
}: GetRemainingFieldsLayoutOptions) {
  const fieldsInLayout = layout.flatMap((panel) =>
    panel.flatMap((row) => row.flatMap((field) => field.name))
  );
  const remainingFields = Object.entries(metadatas).reduce<EditFieldLayout[]>(
    (currentRemainingFields, [name, field]) => {
      if (!fieldsInLayout.includes(name) && field.edit.visible === true) {
        const attribute = schemaAttributes[name];
        // @ts-expect-error not sure why attribute causes type error
        currentRemainingFields.push({
          attribute,
          type: attribute.type,
          visible: true,
          disabled: true,
          label: field.edit.label || name,
          name: name,
          size: fieldSizes[attribute.type].default ?? 12,
        });
      }

      return currentRemainingFields;
    },
    []
  );

  return createLayoutFromFields(remainingFields);
}

export { createLayoutFromFields, getRemaingFieldsLayout };
export type { GetRemainingFieldsLayoutOptions };
