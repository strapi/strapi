import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { GenericInput, ConfirmDialog, useTracking } from '@strapi/helper-plugin';
import { get, isEqual, upperFirst } from 'lodash';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { Layout, HeaderLayout, ContentLayout } from '@strapi/parts/Layout';
import { Link } from '@strapi/parts/Link';
import { Main } from '@strapi/parts/Main';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { Select, Option } from '@strapi/parts/Select';
import { H3 } from '@strapi/parts/Text';
import { Button } from '@strapi/parts/Button';
import CheckIcon from '@strapi/icons/CheckIcon';
import BackIcon from '@strapi/icons/BackIcon';
import { usePluginsQueryParams } from '../../../hooks';

const RowGap = styled(Row)`
  gap: ${({ theme }) => theme.spaces[4]};
`;

const SettingsForm = ({
  children,
  initialData,
  isEditSettings,
  isSubmittingForm,
  modifiedData,
  collectionName,
  onChange,
  onConfirmSubmit,
  sortOptions,
}) => {
  const pluginsQueryParams = usePluginsQueryParams();
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const [showWarningSubmit, setWarningSubmit] = useState(false);
  const toggleWarningSubmit = () => setWarningSubmit(prevState => !prevState);

  const handleSubmit = e => {
    e.preventDefault();
    toggleWarningSubmit();
    trackUsage('willSaveContentTypeLayout');
  };

  const goBackUrl = () => {
    const {
      settings: { pageSize, defaultSortBy, defaultSortOrder },
      kind,
      uid,
    } = modifiedData;
    const sort = `${defaultSortBy}:${defaultSortOrder}`;
    const goBackSearch = `${stringify(
      {
        page: 1,
        pageSize,
        sort,
      },
      { encode: false }
    )}${pluginsQueryParams ? `&${pluginsQueryParams}` : ''}`;

    return `/content-manager/${kind}/${uid}?${goBackSearch}`;
  };

  return (
    <Layout>
      <Main aria-busy={isSubmittingForm}>
        <form onSubmit={handleSubmit}>
          <HeaderLayout
            navigationAction={
              <Link startIcon={<BackIcon />} to={goBackUrl}>
                go back
              </Link>
            }
            primaryAction={
              <Button
                size="L"
                startIcon={<CheckIcon />}
                disabled={isEqual(modifiedData, initialData)}
                type="submit"
              >
                {formatMessage({ id: 'form.button.save', defaultMessage: 'Save' })}
              </Button>
            }
            subtitle={formatMessage({
              id: `components.SettingsViewWrapper.pluginHeader.description.${
                isEditSettings ? 'edit' : 'list'
              }-settings`,
              defaultMessage: `Define the settings of the ${
                isEditSettings ? 'edit' : 'list'
              } view.`,
            })}
            title={formatMessage(
              {
                id: 'components.SettingsViewWrapper.pluginHeader.title',
                defaultMessage: 'Configure the view - {name}',
              },
              { name: upperFirst(collectionName) }
            )}
          />
          <ContentLayout>
            <Box
              background="neutral0"
              hasRadius
              shadow="tableShadow"
              paddingTop={6}
              paddingBottom={6}
              paddingLeft={7}
              paddingRight={7}
            >
              <Box paddingBottom={4}>
                <H3>
                  {formatMessage({
                    id: 'content-manager.containers.SettingPage.settings',
                    defaultMessage: 'Settings',
                  })}
                </H3>
              </Box>
              <RowGap justifyContent="space-between" wrap="wrap" paddingBottom={6}>
                <GenericInput
                  value={get(modifiedData, 'settings.searchable', '')}
                  name="settings.searchable"
                  intlLabel={{
                    id: 'content-manager.form.Input.search',
                    defaultMessage: 'Enable search',
                  }}
                  onChange={onChange}
                  type="bool"
                />
                <GenericInput
                  value={get(modifiedData, 'settings.filterable', '')}
                  name="settings.filterable"
                  intlLabel={{
                    id: 'content-manager.form.Input.filters',
                    defaultMessage: 'Enable filters',
                  }}
                  onChange={onChange}
                  type="bool"
                />
                <GenericInput
                  value={get(modifiedData, 'settings.bulkable', '')}
                  name="settings.bulkable"
                  intlLabel={{
                    id: 'content-manager.form.Input.bulkActions',
                    defaultMessage: 'Enable bulk actions',
                  }}
                  onChange={onChange}
                  type="bool"
                />
              </RowGap>
              <Grid gap={4}>
                <GridItem s={12} col={6}>
                  <Select
                    label={formatMessage({
                      id: 'content-manager.form.Input.pageEntries',
                      defaultMessage: 'Entries per page',
                    })}
                    hint={formatMessage({
                      id: 'content-manager.form.Input.pageEntries.inputDescription',
                      defaultMessage:
                        'Note: You can override this value in the Collection Type settings page.',
                    })}
                    onChange={e => onChange({ target: { name: 'settings.pageSize', value: e } })}
                    name="settings.pageSize"
                    value={get(modifiedData, 'settings.pageSize', '')}
                  >
                    {[10, 20, 50, 100].map(pageSize => (
                      <Option key={pageSize} value={pageSize}>
                        {pageSize}
                      </Option>
                    ))}
                  </Select>
                </GridItem>
                <GridItem s={12} col={3}>
                  <Select
                    label={formatMessage({
                      id: 'content-manager.form.Input.defaultSort',
                      defaultMessage: 'Default sort attribute',
                    })}
                    onChange={e =>
                      onChange({ target: { name: 'settings.defaultSortBy', value: e } })}
                    name="settings.defaultSortBy"
                    value={get(modifiedData, 'settings.defaultSortBy', '')}
                  >
                    {sortOptions.map(sortBy => (
                      <Option key={sortBy} value={sortBy}>
                        {sortBy}
                      </Option>
                    ))}
                  </Select>
                </GridItem>
                <GridItem s={12} col={3}>
                  <Select
                    label={formatMessage({
                      id: 'content-manager.form.Input.sort.order',
                      defaultMessage: 'Default sort order',
                    })}
                    onChange={e =>
                      onChange({ target: { name: 'settings.defaultSortOrder', value: e } })}
                    name="settings.defaultSortOrder"
                    value={get(modifiedData, 'settings.defaultSortOrder', '')}
                  >
                    {['ASC', 'DESC'].map(order => (
                      <Option key={order} value={order}>
                        {order}
                      </Option>
                    ))}
                  </Select>
                </GridItem>
              </Grid>
              {children}
            </Box>
          </ContentLayout>
          <ConfirmDialog
            bodyText={{
              id: 'content-manager.popUpWarning.warning.updateAllSettings',
              defaultMessage: 'This will modify all your settings',
            }}
            iconRightButton={<CheckIcon />}
            isConfirmButtonLoading={isSubmittingForm}
            isOpen={showWarningSubmit}
            onToggleDialog={toggleWarningSubmit}
            onConfirm={onConfirmSubmit}
            variantRightButton="success-light"
          />
        </form>
      </Main>
    </Layout>
  );
};

SettingsForm.defaultProps = {
  collectionName: '',
  initialData: {},
  isEditSettings: false,
  isSubmittingForm: false,
  modifiedData: {},
  onConfirmSubmit: () => {},
  sortOptions: [],
};

SettingsForm.propTypes = {
  children: PropTypes.node.isRequired,
  collectionName: PropTypes.string,
  initialData: PropTypes.object,
  isEditSettings: PropTypes.bool,
  isSubmittingForm: PropTypes.bool,
  modifiedData: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  onConfirmSubmit: PropTypes.func,
  sortOptions: PropTypes.array,
};

export default SettingsForm;
