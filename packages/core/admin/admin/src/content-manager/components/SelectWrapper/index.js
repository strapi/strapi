import React, { memo } from 'react';

import { useCMEditViewDataManager } from '@strapi/helper-plugin';

import { connect, select } from './utils';
import { useRelation } from '../../hooks/useRelation';

function SelectWrapper({ name }) {
  const { addRelation, removeRelation, modifiedData } = useCMEditViewDataManager();
  const { relations, searchResults, search } = useRelation({ relationsToShow: 2 });

  const relationWillBeDeleted = relation =>
    !modifiedData?.[name]?.remove?.find(curr => curr.title === relation.title);

  return (
    <>
      {relations.hasNextPage ? (
        <button type="button" onClick={() => relations.fetchNextPage()}>
          Load 2 more
        </button>
      ) : 'No more pages'}

      <hr />

      {!relations.isLoading && (
        <ol>
          {relations?.data?.pages?.flat().reverse().filter(relationWillBeDeleted).map(relation => (
            <li key={`relation-${relation.title}`}>
              Existing: {relation.title}{' '}
              <button
                type="button"
                onClick={() => removeRelation({ target: { name, value: relation } })}
              >
                Remove
              </button>
            </li>
          ))}

          {modifiedData?.something?.add?.filter(relationWillBeDeleted).map(relationToAdd => (
            <li key={`relation-add-${relationToAdd.title}`}>
              Add: {relationToAdd.title}{' '}
              <button
                type="button"
                onClick={() =>
                  removeRelation({ target: { name, value: relationToAdd } })}
              >
                Remove
              </button>
            </li>
          ))}
        </ol>
      )}

      <hr />

      <input type="text" onKeyUp={event => search(event.target.value)} />

      <hr />

      {!searchResults.isLoading && (
        <ol>
          {searchResults?.data?.map(search => (
            <li key={`search-result-${search.title}`}>
              Search:{' '}
              <button
                type="button"
                onClick={() => addRelation({ target: { name: 'something', value: search } })}
              >
                {search.title}
              </button>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

const Memoized = memo(SelectWrapper);

export default connect(Memoized, select);
