import React, { useState, createRef, useEffect, useRef } from 'react';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import { Inputs } from '@buffetjs/custom';
import { useGlobalContext } from 'strapi-helper-plugin';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import CardControl from '../CardControl';
import CardControlsWrapper from '../CardControlsWrapper';
import ModalSection from '../ModalSection';
import FileDetailsBox from './FileDetailsBox';
import FileWrapper from './FileWrapper';
import FormWrapper from './FormWrapper';
import Row from './Row';
import Wrapper from './Wrapper';
import form from './utils/form';
import isImageType from './utils/isImageType';

const EditForm = ({
  fileToEdit,
  onChange,
  onSubmitEditNewFile,
  setCropResult,
}) => {
  const { formatMessage } = useGlobalContext();
  const [isCropping, setIsCropping] = useState(false);
  const [src, setSrc] = useState(null);

  const mimeType = get(fileToEdit, ['file', 'type'], '');
  const isImg = isImageType(mimeType);
  // TODO
  const canCrop = isImg && !mimeType.includes('svg');

  const imgRef = createRef();
  let cropper = useRef();

  useEffect(() => {
    if (isImg) {
      // TODO: update when editing existing file
      const reader = new FileReader();

      reader.onloadend = () => {
        setSrc(reader.result);
      };

      reader.readAsDataURL(fileToEdit.file);
    }
  }, [isImg, fileToEdit]);

  useEffect(() => {
    if (isCropping) {
      cropper.current = new Cropper(imgRef.current, {
        modal: false,
        initialAspectRatio: 16 / 9,
        movable: true,
        zoomable: false,
        cropBoxResizable: true,
        background: false,
      });
    } else if (cropper.current) {
      cropper.current.destroy();
    }

    return () => {
      if (cropper.current) {
        cropper.current.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropper, isCropping]);

  const handleToggleCropMode = () => {
    setIsCropping(prev => !prev);
  };

  const handleClick = () => {
    if (cropper) {
      const canvas = cropper.current.getCroppedCanvas();
      canvas.toBlob(blob => {
        const {
          file: { lastModifiedDate, lastModified, name },
        } = fileToEdit;

        setCropResult(
          new File([blob], name, {
            type: mimeType,
            lastModified,
            lastModifiedDate,
          })
        );
      });
    }

    setIsCropping(false);
  };

  const handleSubmit = e => {
    e.preventDefault();

    onSubmitEditNewFile(e);
  };

  return (
    <form onSubmit={handleSubmit}>
      <ModalSection>
        <Wrapper>
          <div className="row">
            <div className="col-6">
              <FileWrapper>
                <CardControlsWrapper className="card-control-wrapper">
                  {!isCropping ? (
                    <>
                      <CardControl color="#9EA7B8" type="trash" />
                      {canCrop && (
                        <CardControl
                          type="crop"
                          color="#9EA7B8"
                          onClick={handleToggleCropMode}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <CardControl
                        type="clear"
                        color="#F64D0A"
                        onClick={handleToggleCropMode}
                      />
                      <CardControl
                        type="check"
                        color="#6DBB1A"
                        onClick={handleClick}
                      />
                    </>
                  )}
                </CardControlsWrapper>

                {isImg ? (
                  <img src={src} alt="" ref={isCropping ? imgRef : null} />
                ) : null}
              </FileWrapper>
            </div>
            <div className="col-6">
              <FileDetailsBox file={fileToEdit.file} />
              <FormWrapper>
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
              </FormWrapper>
            </div>
          </div>
        </Wrapper>
        <button type="submit" style={{ display: 'none' }}>
          hidden button to make to get the native form event
        </button>
      </ModalSection>
    </form>
  );
};

EditForm.defaultProps = {
  fileToEdit: null,
  onChange: () => {},
  onSubmitEditNewFile: e => e.preventDefault(),
  setCropResult: () => {},
};

EditForm.propTypes = {
  fileToEdit: PropTypes.object,
  onChange: PropTypes.func,
  onSubmitEditNewFile: PropTypes.func,
  setCropResult: PropTypes.func,
};

export default EditForm;
