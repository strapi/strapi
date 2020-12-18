/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';
import PropTypes from 'prop-types';
import { Flex, Padded, Text } from '@buffetjs/core';
import Tooltip from 'react-tooltip';
import { useHistory } from 'react-router';

import BaseLogin from '../../../../../../admin/src/containers/AuthPage/components/Login/BaseLogin';
import ProviderButton from './ProviderButton';
import Separator from './Separator';
import BaselineAlignment from '../../../../../../admin/src/components/BaselineAlignement';

const FAKE_PROVIDERS = [
  {
    id: 1,
    name: 'OKTA',
    iconUrl: 'https://www.okta.com/themes/custom/okta_www_theme/images/logo.svg',
    providerUrl:
      'https://www.okta.com/fr/free-trial/?utm_campaign=search_google_emea_fr_ao_it_branded-okta_exact&utm_medium=cpc&utm_source=google&utm_term=okta&utm_page={url}&gclid=CjwKCAiAoOz-BRBdEiwAyuvA696s6ysg1ERQsvMyb2KJ5twuHwpbvGF7ioELUYuFHrPPO3NFHKDlzRoCrUkQAvD_BwE',
  },
  {
    id: 2,
    name: 'Microsoft Azure provider long name to handle ellipsis',
    providerUrl:
      'https://www.okta.com/fr/free-trial/?utm_campaign=search_google_emea_fr_ao_it_branded-okta_exact&utm_medium=cpc&utm_source=google&utm_term=okta&utm_page={url}&gclid=CjwKCAiAoOz-BRBdEiwAyuvA696s6ysg1ERQsvMyb2KJ5twuHwpbvGF7ioELUYuFHrPPO3NFHKDlzRoCrUkQAvD_BwE',
  },
  {
    id: 3,
    name: 'OKTA',
    iconUrl: 'https://www.okta.com/themes/custom/okta_www_theme/images/logo.svg',
    providerUrl:
      'https://www.okta.com/fr/free-trial/?utm_campaign=search_google_emea_fr_ao_it_branded-okta_exact&utm_medium=cpc&utm_source=google&utm_term=okta&utm_page={url}&gclid=CjwKCAiAoOz-BRBdEiwAyuvA696s6ysg1ERQsvMyb2KJ5twuHwpbvGF7ioELUYuFHrPPO3NFHKDlzRoCrUkQAvD_BwE',
  },
];

const Login = loginProps => {
  const { push } = useHistory();
  const handleClick = provider => {
    window.open(provider.providerUrl);
  };

  //   useEffect(() => {
  //     fetchSsoProviders();
  //   }, []);

  //   const fetchSsoProviders = async () => {
  //     try {
  //         const { data } = await request('');

  //         console.log(data);
  //     } catch (e) {
  //       console.error(e);
  //     }
  //   };

  return (
    <BaseLogin {...loginProps}>
      <Padded top size="md">
        <BaselineAlignment top size="6px" />
        <Separator />
        <Padded bottom size="md" />
        <Flex justifyContent="center">
          {FAKE_PROVIDERS.slice(0, 2).map(provider => (
            <Padded left right size="sm" key={provider.id.toString()}>
              <ProviderButton
                justifyContent="center"
                alignItems="center"
                onClick={() => handleClick(provider)}
                data-for={provider.id.toString()}
                data-tip={provider.name}
              >
                {provider.iconUrl ? (
                  <img src={provider.iconUrl} alt={provider.name} style={{ maxWidth: 50 }} />
                ) : (
                  <Text ellipsis>{provider.name}</Text>
                )}
              </ProviderButton>
              <Tooltip place="bottom" effect="solid" id={provider.id.toString()} />
            </Padded>
          ))}
          {FAKE_PROVIDERS.length > 2 && (
            <Padded left right size="sm">
              <ProviderButton
                justifyContent="center"
                alignItems="center"
                onClick={() => push('/auth/providers')}
                data-for="see-more-tooltip"
                data-tip="See more"
              >
                <Text>...</Text>
              </ProviderButton>
              <Tooltip place="bottom" effect="solid" id="see-more-tooltip" />
            </Padded>
          )}
        </Flex>
      </Padded>
    </BaseLogin>
  );
};

Login.defaultProps = {
  onSubmit: e => e.preventDefault(),
  requestError: null,
};

Login.propTypes = {
  formErrors: PropTypes.object.isRequired,
  modifiedData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
  requestError: PropTypes.object,
};

export default Login;
