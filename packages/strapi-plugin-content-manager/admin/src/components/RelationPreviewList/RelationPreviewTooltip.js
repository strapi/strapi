import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { Text, Padded } from '@buffetjs/core';
import { LoadingIndicator } from 'strapi-helper-plugin';
import PropTypes from 'prop-types';

import getRequestUrl from '../../utils/getRequestUrl';
import getMockData from './mockData';
import { useListView } from '../../hooks';
import Tooltip from '../Tooltip';

const RelationPreviewTooltip = ({ tooltipId, rowId, mainField, name }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [relationData, setRelationData] = useState([]);
  const { slug } = useListView();
  const tooltipRef = useRef();

  const fetchRelationData = useCallback(async () => {
    const requestURL = getRequestUrl(`collection-types/${slug}/${rowId}/${name}`);
    try {
      // TODO : Wait for the API
      // const { data } = await request(requestURL, {
      //   method: 'GET',
      // });

      console.log(requestURL);
      setRelationData(getMockData(mainField));
      setIsLoading(false);
    } catch (err) {
      console.error({ err });
      setIsLoading(false);
    }
  }, [mainField, name, rowId, slug]);

  useEffect(() => {
    // temp : Should remove the setTimeout and fetch the data
    const timeout = setTimeout(() => {
      fetchRelationData();
    }, 1000);

    return () => clearTimeout(timeout);
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
                  {item[mainField]}
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
  mainField: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  rowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default RelationPreviewTooltip;
