import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { Text, Padded } from '@buffetjs/core';
import { LoadingIndicator, Tooltip } from '@buffetjs/styles';
import PropTypes from 'prop-types';
import axios from 'axios';
import { axiosInstance } from '../../../core/utils';
import { getDisplayedValue, getRequestUrl } from '../../utils';

const RelationPreviewTooltip = ({
  tooltipId,
  rowId,
  mainField,
  name,
  queryInfos: { endPoint },
  size,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [relationData, setRelationData] = useState([]);
  const tooltipRef = useRef();

  const fetchRelationData = useCallback(
    async source => {
      const requestURL = getRequestUrl(`${endPoint}/${rowId}/${name}`);

      try {
        const {
          data: { results },
        } = await axiosInstance.get(requestURL, { cancelToken: source.token });

        setRelationData(results);
        setIsLoading(false);
      } catch (err) {
        if (axios.isCancel(err)) {
          return;
        }

        console.error({ err });
        setIsLoading(false);
      }
    },
    [endPoint, name, rowId]
  );

  useEffect(() => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();

    const timeout = setTimeout(() => {
      fetchRelationData(source);
    }, 500);

    return () => {
      clearTimeout(timeout);

      source.cancel('Operation canceled by the user.');
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
            <LoadingIndicator borderWidth="3px" size="2rem" />
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
            {size > 10 && (
              <Padded top size="xs">
                <Text color="white">[...]</Text>
              </Padded>
            )}
          </>
        )}
      </div>
    </Tooltip>
  );
};

RelationPreviewTooltip.propTypes = {
  tooltipId: PropTypes.string.isRequired,
  mainField: PropTypes.exact({
    name: PropTypes.string.isRequired,
    schema: PropTypes.shape({
      type: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  name: PropTypes.string.isRequired,
  size: PropTypes.number.isRequired,
  rowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  queryInfos: PropTypes.shape({
    endPoint: PropTypes.string.isRequired,
  }).isRequired,
};

export default RelationPreviewTooltip;
