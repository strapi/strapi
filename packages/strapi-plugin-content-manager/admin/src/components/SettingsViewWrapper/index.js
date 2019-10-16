import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { withRouter } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { Inputs as Input } from '@buffetjs/custom';
import {
  BackHeader,
  PluginHeader,
  LoadingIndicatorPage,
} from 'strapi-helper-plugin';
import Block from '../Block';
import Container from '../Container';
import SectionTitle from '../SectionTitle';
import Separator from '../Separator';

const SettingsViewWrapper = ({
  children,
  getSelectOptions,
  history: { goBack },
  inputs,
  isLoading,
  modifiedData,
  onChange,
  onSubmit,
  pluginHeaderProps,
}) => {
  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <>
      <BackHeader onClick={goBack} />
      <Container className="container-fluid">
        <form onSubmit={onSubmit}>
          <PluginHeader {...pluginHeaderProps} />
          <div className="row">
            <Block
              style={{
                marginBottom: '13px',
                paddingBottom: '30px',
                paddingTop: '24px',
              }}
            >
              <SectionTitle isSettings />
              <div className="row">
                {inputs.map(input => {
                  return (
                    <FormattedMessage key={input.name} id={input.label.id}>
                      {label => (
                        <div className={input.customBootstrapClass}>
                          <FormattedMessage
                            id={get(
                              input,
                              'description.id',
                              'app.utils.defaultMessage'
                            )}
                          >
                            {description => (
                              <Input
                                {...input}
                                description={description}
                                label={label === ' ' ? null : label}
                                onChange={onChange}
                                options={getSelectOptions(input)}
                                value={get(modifiedData, input.name, '')}
                              />
                            )}
                          </FormattedMessage>
                        </div>
                      )}
                    </FormattedMessage>
                  );
                })}
                <div className="col-12">
                  <Separator />
                </div>
              </div>
              <SectionTitle />
              {children}
            </Block>
          </div>
        </form>
      </Container>
    </>
  );
};

SettingsViewWrapper.defaultProps = {
  getSelectOptions: () => {},
  inputs: [],
  modifiedData: {},
  onSubmit: () => {},
  pluginHeaderProps: {
    actions: [],
    description: {
      id: 'app.utils.defaultMessage',
    },
    title: {
      id: 'app.utils.defaultMessage',
      values: {},
    },
  },
};

SettingsViewWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  getSelectOptions: PropTypes.func,
  history: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
  }).isRequired,
  inputs: PropTypes.array,
  isLoading: PropTypes.bool.isRequired,
  modifiedData: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
  pluginHeaderProps: PropTypes.shape({
    actions: PropTypes.array,
    description: PropTypes.shape({
      id: PropTypes.string,
    }),
    title: PropTypes.shape({
      id: PropTypes.string,
      values: PropTypes.object,
    }),
  }),
};

export default withRouter(SettingsViewWrapper);
