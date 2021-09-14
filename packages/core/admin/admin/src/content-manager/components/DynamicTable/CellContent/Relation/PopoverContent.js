import React from 'react';
import { useQuery } from 'react-query';
import PropTypes from 'prop-types';
import { Box } from '@strapi/parts/Box';
import { Text } from '@strapi/parts/Text';
import { Loader } from '@strapi/parts/Loader';
import { useNotifyAT } from '@strapi/parts/LiveRegions';
import { axiosInstance } from '../../../../../core/utils';
import { getRequestUrl } from '../../../../utils';
import CellValue from '../CellValue';

const fetchRelation = async (endPoint, notifyStatus) => {
  const {
    data: { results, pagination },
  } = await axiosInstance.get(endPoint);

  notifyStatus('The relations has been loaded');

  return { results, pagination };
};

const PopoverContent = ({ fieldSchema, name, rowId, targetModel, queryInfos }) => {
  const requestURL = getRequestUrl(`${queryInfos.endPoint}/${rowId}/${name}`);
  const { notifyStatus } = useNotifyAT();

  const { data, status } = useQuery(
    [targetModel, rowId],
    () => fetchRelation(requestURL, notifyStatus),
    { staleTime: 0 }
  );

  if (status !== 'success') {
    return (
      <Box>
        <Loader>Loading content</Loader>
      </Box>
    );
  }

  return (
    <ul>
      {data?.results.map(entry => {
        const value = entry[fieldSchema.name];

        return (
          <Box as="li" key={entry.id} padding={3}>
            <Text>
              {value ? <CellValue type={fieldSchema.type} value={entry[fieldSchema.name]} /> : '-'}
            </Text>
          </Box>
        );
      })}
      {data?.pagination.total > 10 && (
        <Box as="li" padding={3}>
          <Text>[...]</Text>
        </Box>
      )}
    </ul>
  );
};

PopoverContent.propTypes = {
  fieldSchema: PropTypes.shape({ name: PropTypes.string, type: PropTypes.string }).isRequired,
  name: PropTypes.string.isRequired,
  rowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  targetModel: PropTypes.string.isRequired,
  queryInfos: PropTypes.shape({
    endPoint: PropTypes.string,
  }).isRequired,
};

export default PopoverContent;
