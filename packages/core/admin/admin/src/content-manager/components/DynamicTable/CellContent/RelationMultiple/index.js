import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from 'react-query';
import { useIntl } from 'react-intl';
import { Typography } from '@strapi/design-system/Typography';
import { Box } from '@strapi/design-system/Box';
import { Badge } from '@strapi/design-system/Badge';
import { SimpleMenu, MenuItem } from '@strapi/design-system/SimpleMenu';
import { Loader } from '@strapi/design-system/Loader';
import styled from 'styled-components';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';
import { stopPropagation } from '@strapi/helper-plugin';
import CellValue from '../CellValue';
import { axiosInstance } from '../../../../../core/utils';
import { getRequestUrl, getTrad } from '../../../../utils';

const TypographyMaxWidth = styled(Typography)`
  max-width: 500px;
`;

const fetchRelation = async (endPoint, notifyStatus) => {
  const {
    data: { results, pagination },
  } = await axiosInstance.get(endPoint);

  notifyStatus();

  return { results, pagination };
};

const RelationMultiple = ({ fieldSchema, metadatas, queryInfos, name, rowId, value }) => {
  const { formatMessage } = useIntl();
  const { notifyStatus } = useNotifyAT();
  const requestURL = getRequestUrl(`${queryInfos.endPoint}/${rowId}/${name.split('.')[0]}`);
  const [isOpen, setIsOpen] = useState(false);

  const Label = (
    <>
      <Badge>{value.count}</Badge>{' '}
      {formatMessage(
        {
          id: 'content-manager.containers.ListPage.items',
          defaultMessage: '{number, plural, =0 {items} one {item} other {items}}',
        },
        { number: value.count }
      )}
    </>
  );

  const notify = () => {
    const message = formatMessage({
      id: getTrad('DynamicTable.relation-loaded'),
      defaultMessage: 'Relations have been loaded',
    });
    notifyStatus(message);
  };

  const { data, status } = useQuery(
    [fieldSchema.targetModel, rowId],
    () => fetchRelation(requestURL, notify),
    {
      enabled: isOpen,
      staleTime: 0,
    }
  );

  return (
    <Box {...stopPropagation}>
      <SimpleMenu
        label={Label}
        size="S"
        onOpen={() => setIsOpen(true)}
        onClose={() => setIsOpen(false)}
      >
        {status !== 'success' && (
          <MenuItem aria-disabled>
            <Loader small>
              {formatMessage({
                id: getTrad('DynamicTable.relation-loading'),
                defaultMessage: 'Relations are loading',
              })}
            </Loader>
          </MenuItem>
        )}

        {status === 'success' && (
          <>
            {data?.results.map((entry) => (
              <MenuItem key={entry.id} aria-disabled>
                <TypographyMaxWidth ellipsis>
                  <CellValue
                    type={metadatas.mainField.schema.type}
                    value={entry[metadatas.mainField.name] || entry.id}
                  />
                </TypographyMaxWidth>
              </MenuItem>
            ))}

            {data?.pagination.total > 10 && (
              <MenuItem
                aria-disabled
                aria-label={formatMessage({
                  id: getTrad('DynamicTable.relation-more'),
                  defaultMessage: 'This relation contains more entities than displayed',
                })}
              >
                <Typography>...</Typography>
              </MenuItem>
            )}
          </>
        )}
      </SimpleMenu>
    </Box>
  );
};

RelationMultiple.propTypes = {
  fieldSchema: PropTypes.shape({
    relation: PropTypes.string,
    targetModel: PropTypes.string,
    type: PropTypes.string.isRequired,
  }).isRequired,
  metadatas: PropTypes.shape({
    mainField: PropTypes.shape({
      name: PropTypes.string.isRequired,
      schema: PropTypes.shape({ type: PropTypes.string.isRequired }).isRequired,
    }),
  }).isRequired,
  name: PropTypes.string.isRequired,
  rowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  queryInfos: PropTypes.shape({ endPoint: PropTypes.string.isRequired }).isRequired,
  value: PropTypes.object.isRequired,
};

export default RelationMultiple;
