import * as React from 'react';

export const useSelectionState = <TValues extends object>(
  keys: Array<keyof TValues>,
  initialValue: TValues[]
) => {
  const [selections, setSelections] = React.useState(initialValue);

  const selectOne = (selection: TValues) => {
    const index = selections.findIndex((currentSelection) =>
      keys.every((key) => currentSelection[key] === selection[key])
    );

    if (index > -1) {
      setSelections((prevSelected) => [
        ...prevSelected.slice(0, index),
        ...prevSelected.slice(index + 1),
      ]);
    } else {
      setSelections((prevSelected) => [...prevSelected, selection]);
    }
  };

  const selectAll = (nextSelections: TValues[]) => {
    if (selections.length > 0) {
      setSelections([]);
    } else {
      setSelections(nextSelections);
    }
  };

  const selectOnly = (nextSelection: TValues) => {
    const index = selections.findIndex((currentSelection) =>
      keys.every((key) => currentSelection[key] === nextSelection[key])
    );

    if (index > -1) {
      setSelections([]);
    } else {
      setSelections([nextSelection]);
    }
  };

  const selectMultiple = (nextSelections: TValues[]) => {
    setSelections((currSelections) => [
      // already selected items
      ...currSelections,
      // filter out already selected items from nextSelections
      ...nextSelections.filter(
        (nextSelection) =>
          currSelections.findIndex((currentSelection) =>
            keys.every((key) => currentSelection[key] === nextSelection[key])
          ) === -1
      ),
    ]);
  };

  const deselectMultiple = (nextSelections: TValues[]) => {
    setSelections((currSelections) => [
      // filter out items in currSelections that are in nextSelections
      ...currSelections.filter(
        (currentSelection) =>
          nextSelections.findIndex((nextSelection) =>
            keys.every((key) => currentSelection[key] === nextSelection[key])
          ) === -1
      ),
    ]);
  };

  return [
    selections,
    { selectOne, selectAll, selectOnly, selectMultiple, deselectMultiple, setSelections },
  ] as const;
};
