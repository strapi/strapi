import React from 'react';
import { Pencil } from '@strapi/icons';
import { useModels } from '../../../hooks';
import Item from '../Item';
import { useCommand } from '../context';

const ContentManager = () => {
  const { isLoading, collectionTypes, singleTypes } = useModels();
  const { goTo, page } = useCommand();

  if (isLoading) {
    return null;
  }

  const displayOnSearchOnly = page !== 'content-manager';

  return (
    <>
      {collectionTypes.map((ct) => {
        const label = `Create ${ct.info.displayName}`;

        return (
          <Item
            displayOnSearchOnly={displayOnSearchOnly}
            onSelect={() => {
              goTo(`/content-manager/collectionType/${ct.uid}/create`);
            }}
            value={label}
          >
            <Pencil />
            {label}
          </Item>
        );
      })}
      {singleTypes.map((ct) => {
        const label = `Edit ${ct.info.displayName}`;

        return (
          <Item
            displayOnSearchOnly={displayOnSearchOnly}
            onSelect={() => {
              goTo(`/content-manager/singleType/${ct.uid}`);
            }}
            value={label}
          >
            <Pencil />
            {label}
          </Item>
        );
      })}
    </>
  );
};

export default ContentManager;
