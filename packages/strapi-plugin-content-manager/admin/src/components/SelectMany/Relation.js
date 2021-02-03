/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import { isEmpty } from 'lodash';
import { useIntl } from 'react-intl';
import { getDisplayedValue, getTrad } from '../../utils';
import IconRemove from '../../assets/images/icon_remove.svg';
import RelationDPState from '../RelationDPState';
import { Span } from './components';

/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */

const Relation = ({
  data,
  displayNavigationLink,
  hasDraftAndPublish,
  isDisabled,
  isDragging,
  mainField,
  onRemove,
  to,
}) => {
  const { formatMessage } = useIntl();
  const cursor = useMemo(() => {
    if (isDisabled) {
      return 'not-allowed';
    }

    if (!displayNavigationLink) {
      return 'default';
    }

    return 'pointer';
  }, [displayNavigationLink, isDisabled]);
  const { pathname } = useLocation();
  const isDraft = isEmpty(data.published_at);
  const titleLabelID = isDraft
    ? 'components.Select.draft-info-title'
    : 'components.Select.publish-info-title';
  let title = hasDraftAndPublish
    ? formatMessage({ id: getTrad(titleLabelID) })
    : formatMessage({ id: getTrad('containers.Edit.clickToJump') });

  const value = data[mainField.name];
  const formattedValue = getDisplayedValue(mainField.schema.type, value, mainField.name);

  if (isDragging || !displayNavigationLink) {
    title = '';
  }

  return (
    <>
      <div style={{ cursor }} title={title}>
        <div className="dragHandle">
          <span />
        </div>
        {hasDraftAndPublish && (
          <div>
            <RelationDPState isDraft={isDraft} />
          </div>
        )}
        {displayNavigationLink ? (
          <Link to={{ pathname: to, state: { from: pathname } }} title={title}>
            <Span>{formattedValue}&nbsp;</Span>
          </Link>
        ) : (
          <Span>{formattedValue}&nbsp;</Span>
        )}
      </div>
      <div style={{ cursor }}>
        <img src={IconRemove} alt="Remove Icon" onClick={onRemove} />
      </div>
    </>
  );
};

Relation.defaultProps = {
  isDragging: false,
  onRemove: () => {},
  to: '',
};

Relation.propTypes = {
  data: PropTypes.object.isRequired,
  displayNavigationLink: PropTypes.bool.isRequired,
  hasDraftAndPublish: PropTypes.bool.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  isDragging: PropTypes.bool,
  mainField: PropTypes.shape({
    name: PropTypes.string.isRequired,
    schema: PropTypes.shape({
      type: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  onRemove: PropTypes.func,
  to: PropTypes.string,
};

export default memo(Relation);
