import { memo, useCallback, useRef } from 'react';
import {
  useTracking,
  useNotification,
  useAPIErrorHandler,
  useFetchClient,
} from '@strapi/helper-plugin';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import isEqual from 'react-fast-compare';
import { getTrad, getRequestUrl } from '../../utils';
import { useFindRedirectionLink } from '../../hooks';
import { setStatus } from '../../sharedReducers/crudReducer/actions';
import selectCrudReducer from '../../sharedReducers/crudReducer/selectors';

// This container is used to handle the CRUD
const CollectionTypeFormWrapper = ({ children, slug, id }) => {
  const toggleNotification = useNotification();
  const { trackUsage } = useTracking();
  const dispatch = useDispatch();
  const { componentsDataStructure, contentTypeDataStructure, data, status } =
    useSelector(selectCrudReducer);
  const redirectionLink = useFindRedirectionLink(slug);
  const { formatAPIError } = useAPIErrorHandler(getTrad);
  const trackUsageRef = useRef(trackUsage);

  const fetchClient = useFetchClient();

  const displayErrors = useCallback(
    (err) => {
      toggleNotification({ type: 'warning', message: formatAPIError(err) });
    },
    [toggleNotification, formatAPIError]
  );

  const onDraftRelationCheck = useCallback(async () => {
    try {
      trackUsageRef.current('willCheckDraftRelations');

      const endPoint = getRequestUrl(
        `collection-types/${slug}/${id}/actions/numberOfDraftRelations`
      );
      dispatch(setStatus('draft-relation-check-pending'));

      const numberOfDraftRelations = await fetchClient.get(endPoint);
      trackUsageRef.current('didCheckDraftRelations');

      dispatch(setStatus('resolved'));

      return numberOfDraftRelations.data.data;
    } catch (err) {
      displayErrors(err);
      dispatch(setStatus('resolved'));

      return Promise.reject(err);
    }
  }, [displayErrors, id, slug, dispatch, fetchClient]);

  return children({
    componentsDataStructure,
    contentTypeDataStructure,
    data,
    onDraftRelationCheck,
    status,
    redirectionLink,
  });
};

CollectionTypeFormWrapper.defaultProps = {
  id: null,
  origin: null,
};

CollectionTypeFormWrapper.propTypes = {
  children: PropTypes.func.isRequired,
  id: PropTypes.string,
  origin: PropTypes.string,
  slug: PropTypes.string.isRequired,
};

export default memo(CollectionTypeFormWrapper, isEqual);
