import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Inputs } from '@buffetjs/custom';
import { useGlobalContext } from 'strapi-helper-plugin';
import CardControl from '../CardControl';
import CardControlsWrapper from '../CardControlsWrapper';
import ModalSection from '../ModalSection';
import FileDetailsBox from './FileDetailsBox';
import FileWrapper from './FileWrapper';
import Form from './Form';
import Row from './Row';
import Wrapper from './Wrapper';
import form from './utils/form';

const EditForm = ({ onChange, onSubmit }) => {
  const { formatMessage } = useGlobalContext();
  const [isCropping, setIsCropping] = useState(false);

  const handleToggleCropMode = () => {
    setIsCropping(prev => !prev);
  };

  return (
    <ModalSection>
      <Wrapper>
        <div className="row">
          <div className="col-6">
            <FileWrapper>
              <CardControlsWrapper className="card-control-wrapper">
                {!isCropping ? (
                  <>
                    <CardControl color="#9EA7B8" type="trash" />
                    <CardControl
                      type="crop"
                      color="#9EA7B8"
                      onClick={handleToggleCropMode}
                    />
                  </>
                ) : (
                  <>
                    <CardControl
                      type="clear"
                      color="#F64D0A"
                      onClick={handleToggleCropMode}
                    />
                    <CardControl type="check" color="#6DBB1A" />
                  </>
                )}
              </CardControlsWrapper>
            </FileWrapper>
          </div>
          <div className="col-6">
            <FileDetailsBox />
            <Form onSubmit={onSubmit}>
              {form.map(({ key, inputs }) => {
                return (
                  <Row key={key}>
                    {inputs.map(input => {
                      return (
                        <div className="col-12" key={input.name}>
                          <Inputs
                            type="text"
                            onChange={onChange}
                            {...input}
                            label={formatMessage(input.label)}
                            description={
                              input.description
                                ? formatMessage(input.description)
                                : null
                            }
                          />
                        </div>
                      );
                    })}
                  </Row>
                );
              })}
            </Form>
          </div>
        </div>
      </Wrapper>
    </ModalSection>
  );
};

EditForm.defaultProps = {
  onChange: () => {},
  onSubmit: e => e.preventDefault(),
};

EditForm.propTypes = {
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
};

export default EditForm;
