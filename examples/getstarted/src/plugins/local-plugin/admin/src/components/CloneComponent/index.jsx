import React from 'react';

import { Duplicate } from '@strapi/icons';
import { useState } from 'react';
import { IconButton } from '@strapi/design-system';
import { DesignSystemProvider } from '@strapi/design-system';

import { unstable_useContentManagerContext as useContentManagerContext } from '@strapi/strapi/admin';
import { getNestedComponentValue } from '../../utils/getNestedComponentValue';
import { getNewTempKey } from '../../utils/updateTempKey';

export const DuplicateButton = ({ name, index }) => {
  const { form } = useContentManagerContext();

  const [isDisabled, setIsDisabled] = useState(false);

  async function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDisabled(true);

    try {
      let componentValues = form.values[name];
      if (name.indexOf('.') > 0) {
        componentValues = getNestedComponentValue(form.values, name);
      }

      if (!componentValues) {
        return;
      }

      const newTempKey = getNewTempKey(index, componentValues);
      const currentValue = { ...componentValues[index] };

      delete currentValue.id;
      currentValue.__temp_key__ = newTempKey;

      form.addFieldRow(name, currentValue, index + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDisabled(false);
    }
  }

  return (
    <DesignSystemProvider>
      <IconButton onClick={onClick} disabled={isDisabled} label="Duplicate" variant="ghost">
        <Duplicate />
      </IconButton>
    </DesignSystemProvider>
  );
};
