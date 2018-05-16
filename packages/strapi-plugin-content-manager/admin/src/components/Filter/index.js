/**
 *
 * Filter
 */


import React from 'react';

import Flex from './Flex';
import Remove from './Remove';
import Separator from './Separator';


function Filter() {
  return (
    <Flex>
      <span>This is a filter</span>
      <Separator />
      <Remove />
    </Flex>
  );
}

export default Filter;
