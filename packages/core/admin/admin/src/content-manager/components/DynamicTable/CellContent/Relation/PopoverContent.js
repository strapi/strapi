import React from 'react';
import { useQuery } from 'react-query';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { Loader } from '@strapi/design-system/Loader';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';
import { axiosInstance } from '../../../../../core/utils';
import { getRequestUrl, getTrad } from '../../../../utils';
import CellValue from '../CellValue';

const fetchRelation = async (endPoint, notifyStatus) => {
  const {
    data: { results, pagination },
  } = await axiosInstance.get(endPoint);

  notifyStatus();

  return { results, pagination };
};

const PopoverContent = ({ fieldSchema, name, rowId, targetModel, queryInfos }) => {
  const requestURL = getRequestUrl(`${queryInfos.endPoint}/${rowId}/${name.split('.')[0]}`);
  const { notifyStatus } = useNotifyAT();
  const { formatMessage } = useIntl();

  const notify = () => {
    const message = formatMessage({
      id: getTrad('DynamicTable.relation-loaded'),
      defaultMessage: 'The relations have been loaded',
    });
    notifyStatus(message);
  };

  const { data, status } = useQuery([targetModel, rowId], () => fetchRelation(requestURL, notify), {
    staleTime: 0,
  });

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
            <Typography>
              {value ? (
                <CellValue type={fieldSchema.schema.type} value={entry[fieldSchema.name]} />
              ) : (
                '-'
              )}
            </Typography>
          </Box>
        );
      })}
      {data?.pagination.total > 10 && (
        <Box as="li" padding={3}>
          <Typography>[...]</Typography>
        </Box>
      )}
    </ul>
  );
};

PopoverContent.propTypes = {
  fieldSchema: PropTypes.shape({
    name: PropTypes.string,
    schema: PropTypes.shape({ type: PropTypes.string }).isRequired,
  }).isRequired,
  name: PropTypes.string.isRequired,
  rowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  targetModel: PropTypes.string.isRequired,
  queryInfos: PropTypes.shape({
    endPoint: PropTypes.string,
  }).isRequired,
};

export default PopoverContent;
