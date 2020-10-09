import React, { memo } from 'react';
import { Text } from '@buffetjs/core';
import { FormattedMessage } from 'react-intl';
import Icon from './Icon';
import Link from './Link';
import Notif from './Notif';
import Wrapper from './Wrapper';

const ApplicationDetailLink = () => {
  return (
    <Wrapper>
      <Link to="/settings/application-infos">
        <Icon />
        <Text lineHeight="34px">
          <FormattedMessage id="Settings.application.title" />
        </Text>
        <Notif />
      </Link>
    </Wrapper>
  );
};

export default memo(ApplicationDetailLink);
