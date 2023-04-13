import React, { useMemo } from 'react';
import { Cog } from '@strapi/icons';
import { useModels } from '../../../hooks';
import Items from '../Items';
import { useCommand } from '../context';

const ContentTypeBuilder = () => {
  const { page } = useCommand();
  const { isLoading, collectionTypes, singleTypes, components } = useModels();

  const items = useMemo(() => {
    if (isLoading) {
      return [];
    }

    /** @type {import('../types').Items} */
    const items = [];
    [...collectionTypes, ...singleTypes].forEach((ct) => {
      items.push({
        icon: Cog,
        action({ goTo }) {
          goTo(`/plugins/content-type-builder/content-types/${ct.uid}`);
        },
        label: `Edit ${ct.info.displayName} Content Type`,
      });
    });

    components.forEach((ct) => {
      items.push({
        icon: Cog,
        action({ goTo }) {
          goTo(`/plugins/content-type-builder/component-categories/${ct.category}/${ct.uid}`);
        },
        label: `Edit ${ct.info.displayName} Component`,
      });
    });

    return items;
  }, [isLoading, collectionTypes, singleTypes, components]);

  return <Items items={items} displayOnSearchOnly={page !== 'content-type-builder'} />;
};

export default ContentTypeBuilder;
