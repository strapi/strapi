import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import upperFirst from 'lodash/upperFirst';
import {
  ModalLayout,
  ModalHeader,
  ModalFooter,
  ModalBody,
} from '@strapi/design-system/ModalLayout';
import { ButtonText } from '@strapi/design-system/Text';
import { Button } from '@strapi/design-system/Button';
import { Flex } from '@strapi/design-system/Flex';
import { Grid } from '@strapi/design-system/Grid';
import styled from 'styled-components';
import { getTrad } from '../../../utils';
import { useLayoutDnd } from '../../../hooks';
import FieldTypeIcon from '../../../components/FieldTypeIcon';
import ModalForm from './ModalForm';

const HeaderContainer = styled(Flex)`
  svg {
    width: ${32 / 16}rem;
    height: ${24 / 16}rem;
    margin-right: ${({ theme }) => theme.spaces[3]};
  }
`;

const FormModal = ({ onToggle, onChange, onSubmit, type }) => {
  const { selectedField } = useLayoutDnd();
  const { formatMessage } = useIntl();

  const getAttrType = () => {
    if (type === 'timestamp') {
      return 'date';
    }

    if (['decimal', 'float', 'integer', 'biginter'].includes(type)) {
      return 'number';
    }

    return type;
  };

  return (
    <ModalLayout onClose={onToggle} labelledBy="title">
      <form onSubmit={onSubmit}>
        <ModalHeader>
          <HeaderContainer>
            <FieldTypeIcon type={getAttrType(type)} />
            <ButtonText textColor="neutral800" as="h2" id="title">
              {formatMessage(
                {
                  id: getTrad('containers.ListSettingsView.modal-form.edit-label'),
                  defaultMessage: 'Edit {fieldName}',
                },
                { fieldName: upperFirst(selectedField) }
              )}
            </ButtonText>
          </HeaderContainer>
        </ModalHeader>
        <ModalBody>
          <Grid gap={4}>
            <ModalForm onChange={onChange} />
          </Grid>
        </ModalBody>
        <ModalFooter
          startActions={
            <Button onClick={onToggle} variant="tertiary">
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Button>
          }
          endActions={
            <Button type="submit">
              {formatMessage({ id: 'form.button.finish', defaultMessage: 'Finish' })}
            </Button>
          }
        />
      </form>
    </ModalLayout>
  );
};

FormModal.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string.isRequired,
};

export default FormModal;

// import React from 'react';
// import PropTypes from 'prop-types';
// import {
//   HeaderModal,
//   HeaderModalTitle,
//   Modal,
//   ModalBody,
//   ModalFooter,
//   ModalForm,
// } from '@strapi/helper-plugin';
// import { FormattedMessage } from 'react-intl';
// import upperFirst from 'lodash/upperFirst';
// import { AttributeIcon, Button } from '@buffetjs/core';

// const PopupForm = ({
//   headerId,
//   isOpen,
//   onClosed,
//   onSubmit,
//   onToggle,
//   renderForm,
//   subHeaderContent,
//   type,
// }) => {
//   const getAttrType = () => {
//     if (type === 'timestamp') {
//       return 'date';
//     }

//     if (['decimal', 'float', 'integer', 'biginter'].includes(type)) {
//       return 'number';
//     }

//     return type;
//   };

//   return (
//     <Modal isOpen={isOpen} onClosed={onClosed} onToggle={onToggle}>
//       <HeaderModal>
//         <section>
//           <HeaderModalTitle style={{ textTransform: 'none' }}>
//             <AttributeIcon type={getAttrType()} style={{ margin: 'auto 20px auto 0' }} />
//             <FormattedMessage id={headerId} />
//           </HeaderModalTitle>
//         </section>
//         <section>
//           <HeaderModalTitle>
//             <span>{upperFirst(subHeaderContent)}</span>
//             <hr />
//           </HeaderModalTitle>
//         </section>
//       </HeaderModal>
//       <form onSubmit={onSubmit}>
//         <ModalForm>
//           <ModalBody>{renderForm()}</ModalBody>
//         </ModalForm>
//         <ModalFooter>
//           <section>
//             <Button onClick={onToggle} color="cancel">
//               <FormattedMessage id="app.components.Button.cancel" />
//             </Button>
//             <Button type="submit" color="success">
//               <FormattedMessage id="form.button.done" />
//             </Button>
//           </section>
//         </ModalFooter>
//       </form>
//     </Modal>
//   );
// };

// PopupForm.defaultProps = {
//   isOpen: false,
//   onClosed: () => {},
//   onSubmit: () => {},
//   onToggle: () => {},
//   renderForm: () => {},
//   subHeaderContent: '',
//   type: '',
// };

// PopupForm.propTypes = {
//   headerId: PropTypes.string.isRequired,
//   isOpen: PropTypes.bool,
//   onClosed: PropTypes.func,
//   onSubmit: PropTypes.func,
//   onToggle: PropTypes.func,
//   renderForm: PropTypes.func,
//   subHeaderContent: PropTypes.string,
//   type: PropTypes.string,
// };

// export default PopupForm;
