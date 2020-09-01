/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import { isEmpty } from 'lodash';
import { useIntl } from 'react-intl';
import { getTrad } from '../../utils';
import IconRemove from '../../assets/images/icon_remove.svg';
import RelationDPState from '../RelationDPState';
import { Span } from './components';

/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */

const Relation = ({
  data,
  hasDraftAndPublish,
  isDisabled,
  isDragging,
  mainField,
  onRemove,
  to,
}) => {
  const { formatMessage } = useIntl();
  const cursor = isDisabled ? 'not-allowed' : 'pointer';
  const { pathname } = useLocation();
  const isDraft = isEmpty(data.published_at);
  const titleLabelID = isDraft
    ? 'components.Select.draft-info-title'
    : 'components.Select.publish-info-title';
  let title = hasDraftAndPublish
    ? formatMessage({ id: getTrad(titleLabelID) })
    : formatMessage({ id: getTrad('containers.Edit.clickToJump') });

  if (isDragging) {
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
        <Link to={{ pathname: to, state: { from: pathname } }} title={title}>
          <Span>{data[mainField]}</Span>
        </Link>
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
  hasDraftAndPublish: PropTypes.bool.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  isDragging: PropTypes.bool,
  mainField: PropTypes.string.isRequired,
  onRemove: PropTypes.func,
  to: PropTypes.string,
};

export default memo(Relation);
