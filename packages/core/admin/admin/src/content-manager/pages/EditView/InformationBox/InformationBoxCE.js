import React from 'react';

import Information from '../Information';

// This component is overwritten by the EE counterpart
export function InformationBoxCE() {
  return (
    <Information.Root>
      <Information.Title />
      <Information.Body />
    </Information.Root>
  );
}
