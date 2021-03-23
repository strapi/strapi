import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { useQueryParams } from 'strapi-helper-plugin';
import { resetProps, setLayout } from '../ListView/actions';
import useSyncRbac from '../RBACManager/useSyncRbac';
import Permissions from './Permissions';

const ListViewLayout = ({ layout, ...props }) => {
  const dispatch = useDispatch();
  const initialParams = useSelector(state => state.get('content-manager_listView').initialParams);
  const [{ query, rawQuery }, setQuery] = useQueryParams(initialParams);
  const permissions = useSyncRbac(query, props.slug, 'listView');
  const setQueryRef = useRef(setQuery);

  useEffect(() => {
    dispatch(setLayout(layout.contentType));
  }, [dispatch, layout]);

  useEffect(() => {
    // We need to keep the search when reloading the page
    if (initialParams && !rawQuery) {
      setQueryRef.current(initialParams);
    }
  }, [initialParams, rawQuery]);

  useEffect(() => {
    return () => {
      dispatch(resetProps());
    };
  }, [dispatch]);

  if (!permissions || !initialParams) {
    return null;
  }

  return <Permissions {...props} layout={layout} permissions={permissions} />;
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
  slug: PropTypes.string.isRequired,
};

export default ListViewLayout;
