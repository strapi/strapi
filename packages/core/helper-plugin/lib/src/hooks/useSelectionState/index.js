import { useState } from 'react';

export const useSelectionState = (key, initialValue) => {
  const [selections, setSelections] = useState(initialValue);

  const selectOne = selection => {
    const index = selections.findIndex(
      currentSelection => currentSelection[key] === selection[key]
    );

    if (index > -1) {
      setSelections(prevSelected => [
        ...prevSelected.slice(0, index),
        ...prevSelected.slice(index + 1),
      ]);
    } else {
      setSelections(prevSelected => [...prevSelected, selection]);
    }
  };

  const selectAll = nextSelections => {
    if (selections.length > 0) {
      setSelections(initialValue);
    } else {
      setSelections(nextSelections);
    }
  };

  return [selections, { selectOne, selectAll }];
};
