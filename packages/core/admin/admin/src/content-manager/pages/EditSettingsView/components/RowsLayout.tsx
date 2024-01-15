import { Grid } from '@strapi/design-system';

import { RowItemsLayout } from './RowItemsLayout';

interface RowsLayoutProps {
  onRemoveField: (rowIndex: number, index: number) => void;
  row: {
    rowId: number;
    rowContent: {
      name: string;
      size: number;
    }[];
  };
  rowIndex: number;
}

const RowsLayout = ({ row, onRemoveField, rowIndex }: RowsLayoutProps) => {
  return (
    <Grid>
      {row.rowContent.map((rowItem, index) => {
        return (
          <RowItemsLayout
            key={rowItem.name}
            rowItem={rowItem}
            index={index}
            rowId={row.rowId}
            onRemoveField={onRemoveField}
            rowIndex={rowIndex}
            lastIndex={row.rowContent.length - 1}
          />
        );
      })}
    </Grid>
  );
};

export { RowsLayout };
