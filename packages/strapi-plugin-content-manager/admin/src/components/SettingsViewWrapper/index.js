import React from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import { BackHeader, PluginHeader } from 'strapi-helper-plugin';
import Block from '../Block';
import Container from '../Container';
import SectionTitle from '../SectionTitle';

const SettingsViewWrapper = ({
  history: { goBack },
  onSubmit,
  pluginHeaderProps,
}) => {
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
            </Block>
          </div>
        </form>
      </Container>
    </>
  );
};

SettingsViewWrapper.defaultProps = {
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
  history: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
  }).isRequired,
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
