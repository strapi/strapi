import React from 'react';
import PropTypes from 'prop-types';
import {
  ModalHeader,
  HeaderModal,
  HeaderModalTitle,
  ModalForm,
  Tabs,
  TabsNav,
  Tab,
  TabsPanel,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { getTrad } from '../utils';

const SettingsModal = ({ children, title, breadCrumb, tabsAriaLabel, tabsId }) => {
  const { formatMessage } = useIntl();

  return (
    <>
      <HeaderModal>
        <ModalHeader headerBreadcrumbs={breadCrumb} />
      </HeaderModal>

      <div className="container-fluid">
        <div className="container-fluid">
          <HeaderModalTitle
            style={{
              fontSize: '1.8rem',
              height: '65px',
              fontWeight: 'bold',
              alignItems: 'center',
              marginBottom: '-39px',
              paddingTop: '16px',
            }}
          >
            {title}
          </HeaderModalTitle>

          <ModalForm>
            <div style={{ marginTop: '-40px' }}>
              <TabsNav defaultSelection={0} label={tabsAriaLabel} id={tabsId}>
                <Tabs position="right">
                  <Tab>{formatMessage({ id: getTrad('Settings.locales.modal.base') })}</Tab>
                  <Tab>{formatMessage({ id: getTrad('Settings.locales.modal.advanced') })}</Tab>
                </Tabs>

                <TabsPanel>{children}</TabsPanel>
              </TabsNav>
            </div>
          </ModalForm>
        </div>
      </div>
    </>
  );
};

SettingsModal.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  breadCrumb: PropTypes.arrayOf(PropTypes.string).isRequired,
  tabsAriaLabel: PropTypes.string.isRequired,
  tabsId: PropTypes.string.isRequired,
};

export default SettingsModal;
