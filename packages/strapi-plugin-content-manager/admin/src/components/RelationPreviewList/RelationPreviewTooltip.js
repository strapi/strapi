import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { Text, Padded } from '@buffetjs/core';
import { LoadingIndicator, request } from 'strapi-helper-plugin';
import PropTypes from 'prop-types';

import getRequestUrl from '../../utils/getRequestUrl';
import getMockData from './mockData';
import Tooltip from '../Tooltip';

const RelationPreviewTooltip = ({ tooltipId, rowId, mainField, name }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [relationData, setRelationData] = useState([]);
  const tooltipRef = useRef();
  const abortController = new AbortController();
  const { endPoint } = mainField.queryInfos;
  const { signal } = abortController;

  const fetchRelationData = useCallback(async () => {
    const requestURL = getRequestUrl(`${endPoint}/${rowId}/${name}`);
    try {
      // TODO : Wait for the API
      const { data } = await request(requestURL, {
        method: 'GET',
        signal,
      });

      console.log(data);
      setRelationData(getMockData(mainField));
      setIsLoading(false);
    } catch (err) {
      console.error({ err });
      setIsLoading(false);
    }
  }, [endPoint, mainField, name, rowId, signal]);

  useEffect(() => {
    // temp : Should remove the setTimeout and fetch the data
    const timeout = setTimeout(() => {
      fetchRelationData();
    }, 1000);

    return () => {
      clearTimeout(timeout);
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchRelationData]);

  // Used to update the position after the loader
  useLayoutEffect(() => {
    if (!isLoading && tooltipRef.current) {
      tooltipRef.current.updatePosition();
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
                  {item[mainField.name]}
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
