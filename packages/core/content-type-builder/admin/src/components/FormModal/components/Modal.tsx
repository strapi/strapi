import { useState } from 'react';

import {
  Box,
  Breadcrumbs,
  Button,
  Crumb,
  Divider,
  Flex,
  Modal,
  Tabs,
  Typography,
  Grid,
} from '@strapi/design-system';
import { Form, useFormikContext } from 'formik';
import get from 'lodash/get';
import { useIntl } from 'react-intl';

import { useFormsAPI } from '../../../hooks/useFormsAPI';
import { getTrad } from '../../../utils/getTrad';
import { AttributeIcon, IconByType } from '../../AttributeIcon';
import { useFormModalNavigation } from '../../FormModalNavigation/useFormModalNavigation';
import { GenericInput } from '../../GenericInputs';

import type { IntlLabel } from '../../../types';

// TODO: find a way to use formik here directly
const Root = ({ children, onClose }) => {
  return (
    <Modal.Root open onOpenChange={onClose}>
      <Modal.Content>
        <Form>{children}</Form>
      </Modal.Content>
    </Modal.Root>
  );
};

const Header = ({ icon, label, backLink, breadcrumbs }: HeaderProps) => {
  return (
    <Modal.Header>
      <Flex gap={3}>
        {backLink}
        <AttributeIcon type={icon} />
        {label && <Modal.Title>{label}</Modal.Title>}
        {breadcrumbs && (
          <Breadcrumbs label={label ?? 'Breadcrumb'}>
            {breadcrumbs.map(({ label }, index, arr) => {
              if (!label) {
                return null;
              }

              const key = `${label}.${index}`;

              return (
                <Crumb isCurrent={index === arr.length - 1} key={key}>
                  {label}
                </Crumb>
              );
            })}
          </Breadcrumbs>
        )}
      </Flex>
    </Modal.Header>
  );
};

const Footer = ({ onClose, endActions }: FooterProps) => {
  const { formatMessage } = useIntl();
  const { onCloseModal } = useFormModalNavigation();

  return (
    <Modal.Footer>
      <Modal.Close>
        <Button
          type="button"
          variant="tertiary"
          onClick={(e) => {
            e.preventDefault();
            if (onClose) {
              onClose();
            } else {
              onCloseModal();
            }
          }}
        >
          {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
        </Button>
      </Modal.Close>
      {endActions}
    </Modal.Footer>
  );
};

const Body = ({
  header: { title, subTitle },
  baseForm,
  advancedForm,
}: {
  header: {
    title: string;
    subTitle?: string;
  };
  baseForm?: any;
  advancedForm?: any;
}) => {
  const { formatMessage } = useIntl();
  const [activeTab, setActiveTab] = useState('basic');
  const { values, handleChange } = useFormikContext();

  return (
    <Modal.Body>
      <Tabs.Root
        variant="simple"
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          // TODO: re-add
          // sendAdvancedTabEvent(value);
        }}
        // hasError="advanced"
        // doesBaseFormHasError ? 'basic' : doesAdvancedFormHasError ? 'advanced' : undefined
      >
        <Flex justifyContent="space-between">
          <Flex direction="column" alignItems="flex-start" paddingBottom={1} gap={1}>
            <Typography tag="h2" variant="beta">
              {title}
            </Typography>
            {subTitle && (
              <Typography variant="pi" textColor="neutral600">
                {subTitle}
              </Typography>
            )}
          </Flex>
          <Tabs.List>
            <Tabs.Trigger
              value="basic"
              disabled={!baseForm || !baseForm.sections || !baseForm.sections.length}
            >
              {formatMessage({
                id: getTrad('popUpForm.navContainer.base'),
                defaultMessage: 'Basic settings',
              })}
            </Tabs.Trigger>
            <Tabs.Trigger
              value="advanced"
              disabled={!advancedForm || !advancedForm.sections || !advancedForm.sections.length}
            >
              {formatMessage({
                id: getTrad('popUpForm.navContainer.advanced'),
                defaultMessage: 'Advanced settings',
              })}
            </Tabs.Trigger>
          </Tabs.List>
        </Flex>
        <Divider marginBottom={6} />
        <Tabs.Content value="basic">
          <Flex direction="column" alignItems="stretch" gap={6}>
            <TabForm form={baseForm} />
          </Flex>
        </Tabs.Content>
        <Tabs.Content value="advanced">
          <Flex direction="column" alignItems="stretch" gap={6}>
            <TabForm form={advancedForm} />
          </Flex>
        </Tabs.Content>
      </Tabs.Root>
    </Modal.Body>
  );
};

export const FormModal = {
  Root,
  Header,
  Body,
  Footer,
};

type FooterProps = {
  onClose?: () => void;
  endActions?: React.ReactNode;
};

type HeaderProps = {
  icon: IconByType;
  label?: string;
  backLink?: React.ReactNode;
  breadcrumbs?: {
    label: string;
  }[];
};

type Form = {
  sections: FormSection[];
};

type FormSection = {
  sectionTitle: IntlLabel;
  items: FormItem[];
};

type FormItem = {
  description: IntlLabel;
  intlLabel: IntlLabel;
  name: string;
  type: string;
  size?: number;
  // TODO: support inputProps instead of any key
  [key: string]: any;
};

interface TabFormProps {
  form: Form;
  // formErrors: Record<string, any>;
  // genericInputProps: Record<string, any>;
  // modifiedData: Record<string, any>;
  // onChange: (value: any) => void;
}

const TabForm = ({
  form,
  // formErrors,
  // genericInputProps,
  // modifiedData,
  // onChange,
}: TabFormProps) => {
  const { formatMessage } = useIntl();
  const { values, errors, handleChange } = useFormikContext();
  const formsAPi = useFormsAPI();

  const { actionType, dynamicZoneTarget, forTarget, targetUid } = useFormModalNavigation();

  const genericInputProps = {
    customInputs: {
      ...formsAPi.components.inputs,
    },
    // componentToCreate,
    dynamicZoneTarget,
    // formErrors,
    // isAddingAComponentToAnotherComponent,
    // isCreatingComponentWhileAddingAField,
    // mainBoxHeader: 'coucou', // get(type, ['info', 'displayName'], ''),
    modifiedData: values,
    naturePickerType: forTarget,
    // TODO: get ride of this
    isCreating: actionType === 'create',
    targetUid,
    forTarget,
  };

  return (
    <>
      {form.sections.map((section, sectionIndex) => {
        // Don't display an empty section
        if (!section.items || section.items.length === 0) {
          return null;
        }

        return (
          <Box key={sectionIndex}>
            {section.sectionTitle && (
              <Box paddingBottom={4}>
                <Typography variant="delta" tag="h3">
                  {formatMessage(section.sectionTitle)}
                </Typography>
              </Box>
            )}
            <Grid.Root gap={4}>
              {section.items.map((input, idx) => {
                const key = `${sectionIndex}.${idx}`;

                const value = get(values, input.name);
                const error = get(errors, input.name);

                // /**
                //  * Use undefined as the default value because not every input wants a string e.g. Date pickers
                //  */
                // const value = get(modifiedData, input.name, undefined);

                // // When extending the yup schema of an existing field (like in https://github.com/strapi/strapi/blob/293ff3b8f9559236609d123a2774e3be05ce8274/packages/strapi-plugin-i18n/admin/src/index.js#L52)
                // // and triggering a yup validation error in the UI (missing a required field for example)
                // // We got an object that looks like: formErrors = { "pluginOptions.i18n.localized": {...} }
                // // In order to deal with this error, we can't rely on lodash.get to resolve this key
                // // - lodash will try to access {pluginOptions: {i18n: {localized: true}}})
                // // - and we just want to access { "pluginOptions.i18n.localized": {...} }
                // // NOTE: this is a hack
                // const pluginOptionError = Object.keys(formErrors).find((key) => key === input.name);

                // // Retrieve the error for a specific input
                // const errorId = pluginOptionError
                //   ? formErrors[pluginOptionError].id
                //   : get(
                //       formErrors,
                //       [
                //         ...input.name
                //           .split('.')
                //           // The filter here is used when creating a component
                //           // in the component step 1 modal
                //           // Since the component info is stored in the
                //           // componentToCreate object we can access the error
                //           // By removing the key
                //           .filter((key: string) => key !== 'componentToCreate'),
                //         'id',
                //       ],
                //       null
                //     );

                if (input.type === 'pushRight') {
                  return (
                    <Grid.Item
                      col={input.size || 6}
                      key={input.name || key}
                      direction="column"
                      alignItems="stretch"
                    >
                      <div />
                    </Grid.Item>
                  );
                }

                return (
                  <Grid.Item
                    col={input.size ?? 6}
                    key={input.name ?? key}
                    direction="column"
                    alignItems="stretch"
                  >
                    <GenericInput
                      {...input}
                      {...genericInputProps}
                      error={error}
                      onChange={handleChange}
                      value={value}
                      autoFocus={idx === 0}
                    />
                  </Grid.Item>
                );
              })}
            </Grid.Root>
          </Box>
        );
      })}
    </>
  );
};
