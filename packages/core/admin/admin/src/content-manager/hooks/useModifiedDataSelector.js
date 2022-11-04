import { useEffect, useState } from 'react';
import get from 'lodash/get';
import isEqual from 'react-fast-compare';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';

export const useModifiedDataSelector = (path, defaultValue) => {
  const { modifiedData } = useCMEditViewDataManager();

  const [value, setValue] = useState(get(modifiedData, path, defaultValue));

  useEffect(() => {
    const newValue = get(modifiedData, path, defaultValue);

    if (!isEqual(newValue, value)) {
      setValue(newValue);
    }
  }, [modifiedData, path, defaultValue, value]);

  return value;
};
