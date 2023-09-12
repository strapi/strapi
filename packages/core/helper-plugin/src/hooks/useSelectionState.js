import { useState } from 'react';

export const useSelectionState = (keys, initialValue) => {
  const [selections, setSelections] = useState(initialValue);

  const selectOne = (selection) => {
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

  const selectAll = (nextSelections) => {
    if (selections.length > 0) {
      setSelections([]);
    } else {
      setSelections(nextSelections);
    }
  };

  const selectOnly = (nextSelection) => {
    if (selections.indexOf(nextSelection) > -1) {
      setSelections([]);
    } else {
      setSelections([nextSelection]);
    }
  };

  const selectMultiple = (nextSelections) => {
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

  const deselectMultiple = (nextSelections) => {
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
  ];
};
