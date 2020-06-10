import { useEffect, useRef, useState } from 'react';

import PropTypes from 'prop-types';
import useUser from '../../hooks/useUser';
import hasPermissions from '../../utils/hasPermissions';

// NOTE: this component is very similar to the WithPagePermissions
// except that it does not handle redirections nor loading state

const WithPermissions = ({ permissions, children }) => {
  const userPermissions = useUser();
  const [state, setState] = useState({ isLoading: true, canAccess: false });
  const isMounted = useRef(true);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        setState({ isLoading: true, canAccess: false });

        const canAccess = await hasPermissions(userPermissions, permissions);

        if (isMounted.current) {
          setState({ isLoading: false, canAccess });
        }
      } catch (err) {
        if (isMounted.current) {
          console.error(err);
          strapi.notification.error('notification.error');

          setState({ isLoading: false });
        }
      }
    };

    checkPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
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
