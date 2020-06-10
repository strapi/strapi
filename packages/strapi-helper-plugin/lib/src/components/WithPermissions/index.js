import { useEffect, useState } from 'react';

import PropTypes from 'prop-types';
import useUser from '../../hooks/useUser';
import hasPermissions from '../../utils/hasPermissions';

// NOTE: this component is very similar to the WithPagePermissions
// except that it does not handle redirections nor loading state

const WithPermissions = ({ permissions, children }) => {
  const userPermissions = useUser();
  const [state, setState] = useState({ isLoading: true, canAccess: false });

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const canAccess = await hasPermissions(userPermissions, permissions);

        setState({ isLoading: false, canAccess });
      } catch (err) {
        console.error(err);
        strapi.notification.error('notification.error');

        setState({ isLoading: false });
      }
    };

    checkPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.isLoading) {
    return null;
  }

  if (!state.canAccess) {
    return null;
  }

  return children;
};

WithPermissions.defaultProps = {
  permissions: [],
};

WithPermissions.propTypes = {
  children: PropTypes.node.isRequired,
  permissions: PropTypes.array,
};

export default WithPermissions;
