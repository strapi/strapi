import React from 'react';
import { Cog } from '@strapi/icons';
import { useModels } from '../../../hooks';
import Item from '../Item';
import { useCommand } from '../context';

const ContentTypeBuilder = () => {
  const { isLoading, collectionTypes, singleTypes, components } = useModels();
  const { goTo, page } = useCommand();

  if (isLoading) {
    return null;
  }

  const displayOnSearchOnly = page !== 'content-type-builder';

  return (
    <>
      {collectionTypes.map((ct) => {
        const label = `Edit ${ct.info.displayName} Content Type`;

        return (
          <Item
            displayOnSearchOnly={displayOnSearchOnly}
            onSelect={() => {
              goTo(`/plugins/content-type-builder/content-types/${ct.uid}`);
            }}
            value={label}
          >
            <Cog /> {label}
          </Item>
        );
      })}
      {singleTypes.map((ct) => {
        const label = `Edit ${ct.info.displayName} Content Type`;

        return (
          <Item
            displayOnSearchOnly={displayOnSearchOnly}
            onSelect={() => {
              goTo(`/plugins/content-type-builder/content-types/${ct.uid}`);
            }}
            value={label}
          >
            <Cog /> {label}
          </Item>
        );
      })}
      {components.map((ct) => {
        const label = `Edit ${ct.info.displayName} Component`;

        return (
          <Item
            displayOnSearchOnly={displayOnSearchOnly}
            onSelect={() => {
              goTo(`/plugins/content-type-builder/component-categories/${ct.category}/${ct.uid}`);
            }}
            value={label}
          >
            <Cog /> {label}
          </Item>
        );
      })}
    </>
  );
};

export default ContentTypeBuilder;
