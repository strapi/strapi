import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { Text, Padded } from '@buffetjs/core';
import { LoadingIndicator, request } from 'strapi-helper-plugin';
import PropTypes from 'prop-types';

import getRequestUrl from '../../utils/getRequestUrl';
import Tooltip from '../Tooltip';
import getDisplayedValue from '../CustomTable/Row/utils/getDisplayedValue';

const RelationPreviewTooltip = ({ tooltipId, rowId, mainField, name }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [relationData, setRelationData] = useState([]);
  const tooltipRef = useRef();
  const { endPoint } = mainField.queryInfos;

  const fetchRelationData = useCallback(
    async signal => {
      const requestURL = getRequestUrl(`${endPoint}/${rowId}/${name}`);
      try {
        const { results } = await request(requestURL, {
          method: 'GET',
          signal,
        });

        setRelationData(results);
        setIsLoading(false);
      } catch (err) {
        console.error({ err });
        setIsLoading(false);
      }
    },
    [endPoint, name, rowId]
  );

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    const timeout = setTimeout(() => {
      fetchRelationData(signal);
    }, 500);

    return () => {
      clearTimeout(timeout);
      abortController.abort();
    };
  }, [fetchRelationData]);

  const getValueToDisplay = useCallback(
    item => {
      return getDisplayedValue(mainField.schema.type, item[mainField.name], mainField.name);
    },
    [mainField]
  );

  // Used to update the position after the loader
  useLayoutEffect(() => {
    if (!isLoading && tooltipRef.current) {
      // A react-tooltip uncaught error is triggered when updatePosition is called in firefox.
      // https://github.com/wwayne/react-tooltip/issues/619
      try {
        tooltipRef.current.updatePosition();
      } catch (err) {
        console.log(err);
      }
    }
  }, [isLoading]);

  return (
    <Tooltip ref={tooltipRef} id={tooltipId}>
      <div>
        {isLoading ? (
          <Padded left right size="sm">
            <LoadingIndicator small />
          </Padded>
        ) : (
          <>
            {relationData.map(item => (
              <Padded key={item.id} top bottom size="xs">
                <Text ellipsis color="white">
                  {getValueToDisplay(item)}
                </Text>
              </Padded>
            ))}
            {relationData.length > 10 && <Text color="white">[...]</Text>}
          </>
        )}
      </div>
    </Tooltip>
  );
};

RelationPreviewTooltip.propTypes = {
  tooltipId: PropTypes.string.isRequired,
  mainField: PropTypes.shape({
    name: PropTypes.string.isRequired,
    schema: PropTypes.object.isRequired,
    queryInfos: PropTypes.object.isRequired,
  }).isRequired,
  name: PropTypes.string.isRequired,
  rowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default RelationPreviewTooltip;
