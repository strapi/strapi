import React from 'react';
import PropTypes from 'prop-types';
import { useGlobalContext } from 'strapi-helper-plugin';
import { Header as HeaderCompo } from '@buffetjs/custom';

const Header = ({ count, dataToDelete, isLoading, onClickAddUser }) => {
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
            type: 'button',
          },

          {
            color: 'primary',
            icon: true,
            label: formatMessage({ id: 'Settings.permissions.users.create' }),
            onClick: onClickAddUser,
            type: 'button',
          },
        ],
    content: formatMessage({ id: `${tradBaseId}${headerDescriptionSuffix}` }, { number: count }),
    title: { label: formatMessage({ id: `${tradBaseId}header.title` }) },
  };
  /* eslint-enable indent */

  return <HeaderCompo {...headerProps} isLoading={isLoading} />;
};

Header.defaultProps = {
  count: 0,
  dataToDelete: [],
  isLoading: false,
  onClickAddUser: () => {},
};

Header.propTypes = {
  count: PropTypes.number,
  dataToDelete: PropTypes.array,
  isLoading: PropTypes.bool,
  onClickAddUser: PropTypes.func,
};

export default Header;
