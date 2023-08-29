import { useState } from 'react';

type JSON = string | number | boolean | null | { [key: string]: JSON } | Array<JSON>;

export type InitialValue = Record<string, JSON>;

export const useSelectionState = (keys: string[], initialValue: InitialValue[]) => {
  const [selections, setSelections] = useState(initialValue);

  const selectOne = (selection: InitialValue) => {
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

  const selectAll = (nextSelections: InitialValue[]) => {
    if (selections.length > 0) {
      setSelections([]);
    } else {
      setSelections(nextSelections);
    }
  };

  const selectOnly = (nextSelection: InitialValue) => {
    if (selections.indexOf(nextSelection) > -1) {
      setSelections([]);
    } else {
      setSelections([nextSelection]);
    }
  };

  const selectMultiple = (nextSelections: InitialValue[]) => {
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

  const deselectMultiple = (nextSelections: InitialValue[]) => {
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
