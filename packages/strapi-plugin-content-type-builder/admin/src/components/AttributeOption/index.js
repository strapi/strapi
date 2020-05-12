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
    const header_label_1 = query.get('header_label_1');
    const header_info_category_1 = query.get('header_info_category_1');
    const header_info_name_1 = query.get('header_info_name_1');
    const header_label_2 = query.get('header_label_2');
    const header_icon_name_2 = query.get('header_icon_name_2');
    const header_icon_isCustom_2 = query.get('header_icon_isCustom_2');
    const header_info_category_2 = query.get('header_info_category_2');
    const header_info_name_2 = query.get('header_info_name_2');
    const header_label_3 = query.get('header_label_3');
    const header_icon_name_3 = query.get('header_icon_name_3');
    const header_icon_isCustom_3 = query.get('header_icon_isCustom_3');
    const header_info_category_3 = query.get('header_info_category_3');
    const header_info_name_3 = query.get('header_info_name_3');
    const header_label_4 = query.get('header_label_4');
    const header_icon_name_4 = query.get('header_icon_name_4');
    const header_icon_isCustom_4 = query.get('header_icon_isCustom_4');
    const header_info_category_4 = query.get('header_info_category_4');
    const header_info_name_4 = query.get('header_info_name_4');

    const search = makeSearch({
      modalType: 'attribute',
      actionType: 'create',
      settingType: 'base',
      forTarget,
      targetUid,
      attributeType: type,
      step: type === 'component' ? '1' : null,

      header_label_1,
      header_info_name_1,
      header_info_category_1,
      header_label_2,
      header_icon_name_2,
      header_icon_isCustom_2,
      header_info_name_2,
      header_info_category_2,
      header_label_3,
      header_icon_name_3,
      header_icon_isCustom_3,
      header_info_name_3,
      header_info_category_3,
      header_label_4,
      header_icon_name_4,
      header_icon_isCustom_4,
      header_info_name_4,
      header_info_category_4,
      header_icon_isCustom_1: false,
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
