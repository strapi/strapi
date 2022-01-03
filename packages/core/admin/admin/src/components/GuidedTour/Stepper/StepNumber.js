import React from 'react';
import PropTypes from 'prop-types';
import { pxToRem } from '@strapi/helper-plugin';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import { Icon } from '@strapi/design-system/Icon';
import Check from '@strapi/icons/Check';

const StepNumber = ({ type, number }) => {
  if (type === 'isDone') {
    return (
      <Flex
        background="primary600"
        padding={2}
        borderRadius="50%"
        width={pxToRem(30)}
        height={pxToRem(30)}
        justifyContent="center"
      >
        <Icon as={Check} aria-hidden width="16px" color="neutral0" />
      </Flex>
    );
  }

  if (type === 'isActive') {
    return (
      <Flex
        background="primary600"
        padding={2}
        borderRadius="50%"
        width={pxToRem(30)}
        height={pxToRem(30)}
        justifyContent="center"
      >
        <Typography fontWeight="semiBold" textColor="neutral0">
          {number}
        </Typography>
      </Flex>
    );
  }

  return (
    <Flex
      borderColor="neutral500"
      borderWidth="1px"
      borderStyle="solid"
      padding={2}
      borderRadius="50%"
      width={pxToRem(30)}
      height={pxToRem(30)}
      justifyContent="center"
    >
      <Typography fontWeight="semiBold" textColor="neutral600">
        {number}
      </Typography>
    </Flex>
  );
};

StepNumber.defaultProps = {
  number: undefined,
  type: 'isNotDone',
};

StepNumber.propTypes = {
  number: PropTypes.number,
  type: PropTypes.oneOf(['isActive', 'isDone', 'isNotDone']),
};

export default StepNumber;
