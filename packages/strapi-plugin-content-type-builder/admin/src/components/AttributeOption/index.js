/**
 *
 * AttributeOption
 *
 */

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { AttributeIcon } from '@buffetjs/core';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { useHistory } from 'react-router-dom';
import { useGlobalContext } from 'strapi-helper-plugin';
import getTrad from '../../utils/getTrad';
import makeSearch from '../../utils/makeSearch';
import useQuery from '../../hooks/useQuery';
import Button from './Button';
import Card from './Card';

const AttributeOption = forwardRef(({ tabIndex, type }, ref) => {
  const buttonRef = useRef();
  const tabRef = useRef();
  const query = useQuery();
  const { push } = useHistory();
  const { emitEvent } = useGlobalContext();
  tabRef.current = tabIndex;

  useImperativeHandle(ref, () => ({
    focus: () => {
      buttonRef.current.focus();
    },
  }));

  useEffect(() => {
    if (tabRef.current === 0) {
      buttonRef.current.focus();
    }
  }, []);

  const handleClick = () => {
    const forTarget = query.get('forTarget');
    const targetUid = query.get('targetUid');
    const headerDisplayName = query.get('headerDisplayName');
    const header_label_1 = query.get('header_label_1');

    const header_info_category_1 = query.get('header_info_category_1');
    const header_info_name_1 = query.get('header_info_name_1');

    const search = makeSearch({
      modalType: 'attribute',
      actionType: 'create',
      settingType: 'base',
      forTarget,
      targetUid,
      attributeType: type,
      headerDisplayName,
      step: type === 'component' ? '1' : null,
      // TODO to remove
      headerDisplayCategory: query.get('headerDisplayCategory'),
      // TODO to remove
      headerDisplaySubCategory: query.get('headerDisplaySubCategory'),
      subTargetUid: query.get('subTargetUid'),
      header_label_1,
      header_icon_isCustom_1: false,
      header_info_category_1,
      header_info_name_1,
      header_icon_name_1: type,
    });

    if (forTarget === 'contentType') {
      emitEvent('didSelectContentTypeFieldType', { type });
    }

    push({
      search,
    });
  };

  return (
    <div className="col-6">
      <Button ref={buttonRef} type="button" onClick={handleClick}>
        <Card>
          <AttributeIcon
            type={type}
            style={{ marginRight: 10 }}
            className="attributeIcon"
          />
          <FormattedMessage id={getTrad(`attribute.${type}`)}>
            {message => <span className="attributeType">{message}</span>}
          </FormattedMessage>
          <FormattedMessage id={getTrad(`attribute.${type}.description`)} />
        </Card>
      </Button>
    </div>
  );
});

AttributeOption.displayName = 'AttributeOption';

AttributeOption.defaultProps = {
  tabIndex: 0,
  type: 'text',
};

AttributeOption.propTypes = {
  tabIndex: PropTypes.number,
  type: PropTypes.string,
};

export default AttributeOption;
