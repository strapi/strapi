import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { get, isEqual, upperFirst } from 'lodash';
import { withRouter } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { Inputs as Input, Header } from '@buffetjs/custom';
import {
  BackHeader,
  LoadingIndicatorPage,
  PopUpWarning,
  // contexts
  useGlobalContext,
} from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import Block from '../Block';
import Container from '../Container';
import SectionTitle from '../SectionTitle';
import Separator from '../Separator';

const SettingsViewWrapper = ({
  children,
  history: { goBack },
  displayedFields,
  inputs,
  initialData,
  isEditSettings,
  isLoading,
  modifiedData,
  onChange,
  onConfirmReset,
  onConfirmSubmit,
  name,
}) => {
  const { emitEvent, formatMessage } = useGlobalContext();
  const [showWarningCancel, setWarningCancel] = useState(false);
  const [showWarningSubmit, setWarningSubmit] = useState(false);

  const attributes = useMemo(() => {
    return get(modifiedData, ['attributes'], {});
  }, [modifiedData]);

  const toggleWarningCancel = () => setWarningCancel(prevState => !prevState);
  const toggleWarningSubmit = () => setWarningSubmit(prevState => !prevState);

  const getPluginHeaderActions = () => {
    return [
      {
        color: 'cancel',
        onClick: toggleWarningCancel,
        label: formatMessage({
          id: 'app.components.Button.reset',
        }),
        type: 'button',
        disabled: isEqual(modifiedData, initialData),
        style: {
          fontWeight: 600,
          paddingLeft: 15,
          paddingRight: 15,
        },
      },
      {
        color: 'success',
        label: formatMessage({
          id: `${pluginId}.containers.Edit.submit`,
        }),
        type: 'submit',
        disabled: isEqual(modifiedData, initialData),
        style: {
          minWidth: 150,
          fontWeight: 600,
        },
      },
    ];
  };

  const headerProps = {
    actions: getPluginHeaderActions(),
    title: {
      label: formatMessage(
        {
          id: `${pluginId}.components.SettingsViewWrapper.pluginHeader.title`,
        },
        { name: upperFirst(name) }
      ),
    },
    content: formatMessage({
      id: `${pluginId}.components.SettingsViewWrapper.pluginHeader.description.${
        isEditSettings ? 'edit' : 'list'
      }-settings`,
    }),
  };

  const getSelectOptions = input => {
    if (input.name === 'settings.defaultSortBy') {
      return [
        'id',
        ...displayedFields.filter(name => {
          const type = get(attributes, [name, 'type']);

          return !['media', 'richtext', 'dynamiczone', 'relation'].includes(type) && name !== 'id';
        }),
      ];
    }

    if (input.name === 'settings.mainField') {
      const options = Object.keys(attributes).filter(attr => {
        const type = get(attributes, [attr, 'type'], '');

        return (
          ![
            'dynamiczone',
            'json',
            'text',
            'relation',
            'component',
            'boolean',
            'date',
            'media',
            'richtext',
            'timestamp',
          ].includes(type) && !!type
        );
      });

      return options;
    }

    return input.options;
  };

  const handleSubmit = e => {
    e.preventDefault();
    toggleWarningSubmit();
    emitEvent('willSaveContentTypeLayout');
  };

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <>
      <BackHeader onClick={goBack} />
      <Container className="container-fluid">
        <form onSubmit={handleSubmit}>
          <Header {...headerProps} />
          <div
            className="row"
            style={{
              paddingTop: '3px',
            }}
          >
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
                            id={get(input, 'description.id', 'app.utils.defaultMessage')}
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
                  <Separator style={{ marginBottom: 20 }} />
                </div>
              </div>
              <SectionTitle />
              {children}
            </Block>
          </div>
          <PopUpWarning
            isOpen={showWarningCancel}
            toggleModal={toggleWarningCancel}
            content={{
              message: `${pluginId}.popUpWarning.warning.cancelAllSettings`,
            }}
            popUpWarningType="danger"
            onConfirm={() => {
              onConfirmReset();
              toggleWarningCancel();
            }}
          />
          <PopUpWarning
            isOpen={showWarningSubmit}
            toggleModal={toggleWarningSubmit}
            content={{
              message: `${pluginId}.popUpWarning.warning.updateAllSettings`,
            }}
            popUpWarningType="danger"
            onConfirm={async () => {
              await onConfirmSubmit();
              toggleWarningSubmit();
            }}
          />
        </form>
      </Container>
    </>
  );
};

SettingsViewWrapper.defaultProps = {
  displayedFields: [],
  inputs: [],
  initialData: {},
  isEditSettings: false,
  modifiedData: {},
  name: '',
  onConfirmReset: () => {},
  onConfirmSubmit: async () => {},
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
  displayedFields: PropTypes.array,
  history: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
  }).isRequired,
  initialData: PropTypes.object,
  inputs: PropTypes.array,
  isEditSettings: PropTypes.bool,
  isLoading: PropTypes.bool.isRequired,
  modifiedData: PropTypes.object,
  name: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onConfirmReset: PropTypes.func,
  onConfirmSubmit: PropTypes.func,
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
