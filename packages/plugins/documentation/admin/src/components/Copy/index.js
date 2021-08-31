import React from 'react';
import { auth, InputsIndex as Input, useNotification } from '@strapi/helper-plugin';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import getTrad from '../../utils/getTrad';

const Copy = () => {
  const toggleNotification = useNotification();

  const handleCopy = () => {
    toggleNotification({
      type: 'info',
      message: { id: getTrad('containers.HomePage.copied') },
    });
  };

  return (
    <CopyToClipboard text={auth.getToken()} onCopy={handleCopy}>
      <div className="row" style={{ zIndex: '99' }}>
        <Input
          style={{ zIndex: '9', cursor: 'pointer' }}
          inputStyle={{ cursor: 'pointer' }}
          name="jwtToken"
          value={auth.getToken()}
          type="string"
          onChange={() => {}}
          label={{ id: getTrad('containers.HomePage.form.jwtToken') }}
          inputDescription={{
            id: getTrad('containers.HomePage.form.jwtToken.description'),
          }}
        />
      </div>
    </CopyToClipboard>
  );
};

export default Copy;
