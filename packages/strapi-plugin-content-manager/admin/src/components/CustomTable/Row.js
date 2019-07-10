import React, { memo } from 'react';
import { withRouter } from 'react-router';
import PropTypes from 'prop-types';
import { toString } from 'lodash';

import { IcoContainer } from 'strapi-helper-plugin';
import { useListView } from '../../contexts/ListView';

import CustomInputCheckbox from '../CustomInputCheckbox';

import { ActionContainer, Truncate, Truncated } from './styledComponents';

function Row({ goTo, isBulkable, row, headers }) {
  const { entriesToDelete, onChangeBulk, onClickDelete, slug } = useListView();

  return (
    <>
      {isBulkable && (
        <td key="i">
          <CustomInputCheckbox
            name={row.id}
            onChange={onChangeBulk}
            value={
              entriesToDelete.filter(id => toString(id) === toString(row.id))
                .length > 0
            }
          />
        </td>
      )}
      {headers.map(header => {
        //

        return (
          <td key={header.name}>
            <Truncate>
              <Truncated>{row[header.name]}</Truncated>
            </Truncate>
          </td>
        );
      })}
      <ActionContainer>
        <IcoContainer
          icons={[
            {
              icoType: 'pencil',
              onClick: () => {
                goTo(row.id);
              },
            },
            {
              id: row.id,
              icoType: 'trash',
              onClick: () => {
                onClickDelete(row.id);
              },
            },
          ]}
        />
      </ActionContainer>
    </>
  );
}

Row.propTypes = {
  goTo: PropTypes.func.isRequired,
  headers: PropTypes.array.isRequired,
  isBulkable: PropTypes.bool.isRequired,
  row: PropTypes.object.isRequired,
};

export default withRouter(memo(Row));
