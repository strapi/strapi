import type { SettingsViewLayout } from '../../../utils/layouts';

type EditLayout = SettingsViewLayout['layouts']['edit'];
type EditLayoutRow = EditLayout[0];

type LayoutRow = {
  rowId: number;
  rowContent: EditLayoutRow;
};

type Layout = Array<LayoutRow>;

const getRowSize = (arr: EditLayoutRow) =>
  arr.reduce(
    (
      sum: number,
      value: {
        size: number;
      }
    ) => sum + value.size,
    0
  );

const createLayout = (arr: EditLayout): Layout => {
  return arr.reduce((acc, current, index: number) => {
    const row = { rowId: index, rowContent: current };

    return acc.concat(row);
  }, [] as Layout);
};

const formatLayout = (arr: Layout) => {
  return arr
    .reduce((acc, current) => {
      let toPush: EditLayoutRow = [];
      const currentRow = current.rowContent.reduce((acc2: EditLayoutRow, curr) => {
        const acc2Size = getRowSize(acc2);

        if (curr.name === '_TEMP_') {
          return acc2;
        }

        if (acc2Size + curr.size <= 12) {
          acc2.push(curr);
        } else {
          toPush.push(curr);
        }

        return acc2;
      }, []);

      const rowId = acc.length === 0 ? 0 : Math.max(...acc.map((o) => o.rowId)) + 1;

      const currentRowSize = getRowSize(currentRow);

      if (currentRowSize < 12) {
        currentRow.push({ name: '_TEMP_', size: 12 - currentRowSize });
      }

      acc.push({ rowId, rowContent: currentRow });

      if (toPush.length > 0) {
        const toPushSize = getRowSize(toPush);

        if (toPushSize < 12) {
          toPush.push({ name: '_TEMP_', size: 12 - toPushSize });
        }

        acc.push({ rowId: rowId + 1, rowContent: toPush });
        toPush = [];
      }

      return acc;
    }, [] as Layout)
    .filter((row) => row.rowContent.length > 0)
    .filter((row) => {
      if (row.rowContent.length === 1) {
        return row.rowContent[0].name !== '_TEMP_';
      }

      return true;
    });
};

const unformatLayout = (arr: Layout): EditLayout => {
  return arr.reduce((acc, current) => {
    const currentRow = current.rowContent.filter((content) => content.name !== '_TEMP_');

    return acc.concat([currentRow]);
  }, [] as EditLayout);
};

const getFieldSize = (name: string, layouts: Layout = []): number | null => {
  return layouts.reduce((acc: number | null, { rowContent }) => {
    const size = rowContent.find((row) => row.name === name)?.size ?? null;

    if (size) {
      acc = size;
    }

    return acc;
  }, null);
};

const setFieldSize = (name: string, size: number, layouts: Layout = []) => {
  return layouts.map((row) => {
    row.rowContent = row.rowContent.map((column) => {
      if (column.name === name) {
        return {
          ...column,
          size,
        };
      }

      return column;
    });

    return row;
  });
};

export { createLayout, formatLayout, getFieldSize, getRowSize, setFieldSize, unformatLayout };
