import React, { memo } from 'react';

import { useCMEditViewDataManager } from '@strapi/helper-plugin';

import { connect, select } from './utils';
import { useRelation } from '../../hooks/useRelation';

function SelectWrapper() {
  const { addRelation, removeRelation, modifiedData } = useCMEditViewDataManager();
  const { relations, searchResults, search, load } = useRelation({ relationsToShow: 2 });

  const relationWillBeDeleted = relation =>
    !modifiedData?.something?.remove?.find(curr => curr.title === relation.title);

  return (
    <>
      <button type="button" onClick={() => load(relations?.data?.length ?? 0, 2)}>
        Load 2 more
      </button>

      <hr />

      {!relations.isLoading && (
        <ol>
          {relations?.data?.filter(relationWillBeDeleted).map(relation => (
            <li key={`relation-${relation.title}`}>
              Existing Relation: {relation.title}{' '}
              <button
                type="button"
                onClick={() => removeRelation({ target: { name: 'something', value: relation } })}
              >
                Remove
              </button>
            </li>
          ))}

          {modifiedData?.something?.add?.filter(relationWillBeDeleted).map(relationToAdd => (
            <li key={`relation-add-${relationToAdd.title}`}>
              Relation to add : {relationToAdd.title}{' '}
              <button
                type="button"
                onClick={() =>
                  removeRelation({ target: { name: 'something', value: relationToAdd } })}
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
              Search Result:{' '}
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
