import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { useQueryParams } from 'strapi-helper-plugin';
import RBACManager from '../RBACManager';
import { setLayout } from './actions';
import ListView from './index';

const ListViewLayout = ({ layout, ...props }) => {
  const dispatch = useDispatch();
  const initialParams = useSelector(state => state.get('content-manager_listView').initialParams);
  const [, setQuery] = useQueryParams(initialParams);

  useEffect(() => {
    dispatch(setLayout(layout.contentType));
  }, [dispatch, layout]);

  useEffect(() => {
    if (initialParams) {
      setQuery(initialParams);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialParams]);

  if (!initialParams) {
    return null;
  }

  return (
    <RBACManager {...props}>
      <ListView {...props} layout={layout} />
    </RBACManager>
  );
};

ListViewLayout.propTypes = {
  layout: PropTypes.exact({
    components: PropTypes.object.isRequired,
    contentType: PropTypes.shape({
      attributes: PropTypes.object.isRequired,
      metadatas: PropTypes.object.isRequired,
      info: PropTypes.shape({ label: PropTypes.string.isRequired }).isRequired,
      layouts: PropTypes.shape({
        list: PropTypes.array.isRequired,
        editRelations: PropTypes.array,
      }).isRequired,
      options: PropTypes.object.isRequired,
      settings: PropTypes.object.isRequired,
      pluginOptions: PropTypes.object,
    }).isRequired,
  }).isRequired,
};

export default ListViewLayout;
