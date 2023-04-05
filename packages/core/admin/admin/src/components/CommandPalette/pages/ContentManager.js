import React, { useMemo } from 'react';
import { Pencil } from '@strapi/icons';
import { useModels } from '../../../hooks';
import Items from '../Items';
import { useCommand } from '../context';

const useContentTypesItems = () => {
  const { isLoading, collectionTypes, singleTypes } = useModels();

  return useMemo(() => {
    if (isLoading) {
      return [];
    }

    const items = [];
    collectionTypes.forEach((ct) => {
      items.push({
        icon: Pencil,
        label: `Create ${ct.info.displayName}`,
        action({ goTo }) {
          goTo(`/content-manager/collectionType/${ct.uid}/create`);
        },
      });
    });

    singleTypes.forEach((ct) => {
      items.push({
        icon: Pencil,
        label: `Create ${ct.info.displayName}`,
        action({ goTo }) {
          goTo(`/content-manager/singleType/${ct.uid}`);
        },
      });
    });

    return items;
  }, [isLoading, collectionTypes, singleTypes]);
};

const ContentManager = () => {
  const { page } = useCommand();
  const items = useContentTypesItems();

  return <Items items={items} displayOnSearchOnly={page !== 'content-manager'} />;
};

export default ContentManager;
