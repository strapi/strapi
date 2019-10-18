import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { get, isEqual, upperFirst } from 'lodash';
import { withRouter } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { Inputs as Input } from '@buffetjs/custom';
import {
  BackHeader,
  PluginHeader,
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
  getListDisplayedFields,
  inputs,
  initialData,
  isEditSettings,
  isLoading,
  modifiedData,
  onChange,
  onConfirmReset,
  onConfirmSubmit,
  slug,
}) => {
  const { emitEvent } = useGlobalContext();
  const [showWarningCancel, setWarningCancel] = useState(false);
  const [showWarningSubmit, setWarningSubmit] = useState(false);

  const getAttributes = useMemo(() => {
    return get(modifiedData, ['schema', 'attributes'], {});
  }, [modifiedData]);

  const toggleWarningCancel = () => setWarningCancel(prevState => !prevState);
  const toggleWarningSubmit = () => setWarningSubmit(prevState => !prevState);

  const getPluginHeaderActions = () => {
    if (isEqual(modifiedData, initialData)) {
      return [];
    }

    return [
      {
        label: `${pluginId}.popUpWarning.button.cancel`,
        kind: 'secondary',
        onClick: toggleWarningCancel,
        type: 'button',
      },
      {
        kind: 'primary',
        label: `${pluginId}.containers.Edit.submit`,
        type: 'submit',
      },
    ];
  };

  const pluginHeaderProps = {
    actions: getPluginHeaderActions(),
    title: {
      id: `${pluginId}.components.SettingsViewWrapper.pluginHeader.title`,
      values: { name: upperFirst(slug) },
    },
    description: {
      id: `${pluginId}.components.SettingsViewWrapper.pluginHeader.description.${
        isEditSettings ? 'edit' : 'list'
      }-settings`,
    },
  };

  const getSelectOptions = input => {
    if (input.name === 'settings.defaultSortBy') {
      return [
        'id',
        ...getListDisplayedFields().filter(
          name =>
            get(getAttributes, [name, 'type'], '') !== 'media' &&
            name !== 'id' &&
            get(getAttributes, [name, 'type'], '') !== 'richtext'
        ),
      ];
    }

    if (input.name === 'settings.mainField') {
      const attributes = getAttributes;
      const options = Object.keys(attributes).filter(attr => {
        const type = get(attributes, [attr, 'type'], '');

        return (
          ![
            'json',
            'text',
            'relation',
            'group',
            'boolean',
            'date',
            'media',
            'richtext',
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
          <PopUpWarning
            isOpen={showWarningCancel}
            toggleModal={toggleWarningCancel}
            content={{
              title: `${pluginId}.popUpWarning.title`,
              message: `${pluginId}.popUpWarning.warning.cancelAllSettings`,
              cancel: `${pluginId}.popUpWarning.button.cancel`,
              confirm: `${pluginId}.popUpWarning.button.confirm`,
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
              title: `${pluginId}.popUpWarning.title`,
              message: `${pluginId}.popUpWarning.warning.updateAllSettings`,
              cancel: `${pluginId}.popUpWarning.button.cancel`,
              confirm: `${pluginId}.popUpWarning.button.confirm`,
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
  getListDisplayedFields: () => [],
  inputs: [],
  initialData: {},
  isEditSettings: false,
  modifiedData: {},
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
  slug: '',
};

SettingsViewWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  getListDisplayedFields: PropTypes.func,
  history: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
  }).isRequired,
  initialData: PropTypes.object,
  inputs: PropTypes.array,
  isEditSettings: PropTypes.bool,
  isLoading: PropTypes.bool.isRequired,
  modifiedData: PropTypes.object,
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
  slug: PropTypes.string,
};

export default withRouter(SettingsViewWrapper);
