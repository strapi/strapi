import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { useGlobalContext } from 'strapi-helper-plugin';
import { Button } from '@buffetjs/core';
import { Header as HeaderCompo } from '@buffetjs/custom';
import { Envelope } from '@buffetjs/icons';

const Header = ({
  canCreate,
  canDelete,
  canRead,
  count,
  dataToDelete,
  isLoading,
  onClickAddUser,
  onClickDelete,
}) => {
  const { formatMessage } = useGlobalContext();
  const tradBaseId = 'Settings.permissions.users.listview.';
  const headerDescriptionSuffix =
    count > 1 ? 'header.description.plural' : 'header.description.singular';

  /* eslint-disable indent */
  const headerProps = {
    actions: isLoading
      ? []
      : [
          {
            color: 'delete',
            disabled: !dataToDelete.length,
            label: formatMessage({ id: 'app.utils.delete' }),
            onClick: onClickDelete,
            type: 'button',
            Component: props => (canDelete ? <Button {...props} /> : null),
          },

          {
            color: 'primary',
            icon: <Envelope style={{ verticalAlign: 'middle' }} />,
            label: formatMessage({ id: 'Settings.permissions.users.create' }),
            onClick: onClickAddUser,
            type: 'button',
            Component: props => (canCreate ? <Button {...props} /> : null),
          },
        ],
    content: canRead
      ? formatMessage({ id: `${tradBaseId}${headerDescriptionSuffix}` }, { number: count })
      : null,
    title: { label: formatMessage({ id: `${tradBaseId}header.title` }) },
  };
  /* eslint-enable indent */

  return <HeaderCompo {...headerProps} isLoading={isLoading} />;
};

Header.defaultProps = {
  canCreate: false,
  canDelete: false,
  canRead: false,
  count: 0,
  dataToDelete: [],
  isLoading: false,
  onClickAddUser: () => {},
  onClickDelete: () => {},
};

Header.propTypes = {
  canCreate: PropTypes.bool,
  canDelete: PropTypes.bool,
  canRead: PropTypes.bool,
  count: PropTypes.number,
  dataToDelete: PropTypes.array,
  isLoading: PropTypes.bool,
  onClickAddUser: PropTypes.func,
  onClickDelete: PropTypes.func,
};

export default memo(Header);
