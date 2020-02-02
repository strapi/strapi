// FIXME: eslint-disable
/* eslint-disable */
import { bindActionCreators, compose } from 'redux';
import { connect } from 'react-redux';
import { ContainerFluid, PluginHeader, Button } from 'strapi-helper-plugin';
import { FormattedMessage } from 'react-intl';
import { onChange, submit, getMenu } from '../redux/actions';
import MenuEditor from '../components/MenuEditor';
import Modal from 'react-modal';
import pluginId from '../pluginId';
import PropTypes from 'prop-types';
import React, { Fragment } from 'react';
import reducer from '../redux/reducer';
import saga from '../redux/saga';
import selectMenuEditorPlugin from '../redux/selectors';

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
  },
};

class MenuEditorPlugin extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      editMode: false,
      modalOpen: false,
    };
  }

  componentDidMount() {
    this.getMenu();
  }

  getMenu = () => {
    this.props.getMenu();
  };

  handleShowModal = () => {
    this.setState({ modalOpen: true });
  };

  handleCloseModal = () => {
    this.setState({ modalOpen: false });
  };

  handleSubmit = () => {
    this.setState({ editMode: false, modalOpen: false });

    return this.props.submit();
  };

  cancelEditMode = () => {
    this.props.getMenu();
    this.setState({ editMode: false });
  };

  pluginHeaderActions = [
    {
      kind: 'secondary',
      label: 'menu-editor.MenuEditor.cancelEditMode',
      onClick: this.handleShowModal,
      type: 'button',
    },
    {
      kind: 'primary',
      label: 'app.components.Button.save',
      onClick: this.handleShowModal,
      type: 'submit',
    },
  ];

  actionEdit = [
    {
      kind: 'primary',
      label: 'menu-editor.MenuEditor.editMode',
      onClick: () => this.setState({ editMode: true }),
      type: 'button',
    },
  ];

  render() {
    return (
      <>
        <ContainerFluid>
          <Modal
            isOpen={this.state.modalOpen}
            onRequestClose={this.handleCloseModal}
            style={customStyles}
            contentLabel="Example Modal"
          >
            <p>
              <FormattedMessage id="menu-editor.MenuEditor.confirmSaveStructure" />
            </p>
            <Button kind="primary" onClick={this.handleSubmit}>
              <FormattedMessage id="menu-editor.MenuEditor.yes" />
            </Button>
            <Button kind="secondary" onClick={this.handleCloseModal}>
              <FormattedMessage id="menu-editor.MenuEditor.no" />
            </Button>
          </Modal>
          <PluginHeader
            title={{ id: 'menu-editor.MenuEditor.title' }}
            description={{ id: 'menu-editor.MenuEditor.description' }}
            actions={
              this.state.editMode ? this.pluginHeaderActions : this.actionEdit
            }
          />
          <MenuEditor
            menuItems={this.props.menuItems}
            editMode={this.state.editMode}
            onChange={this.props.onChange}
          />
        </ContainerFluid>
      </>
    );
  }
}

MenuEditorPlugin.defaultProps = {
  menuItems: [],
};

MenuEditorPlugin.propTypes = {
  menuItems: PropTypes.array.isRequired,
  getMenu: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getMenu,
      onChange,
      submit,
    },
    dispatch
  );
}

const mapStateToProps = selectMenuEditorPlugin();

const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withReducer = strapi.injectReducer({
  key: 'menuEditor',
  reducer,
  pluginId,
});

const withStrapiSaga = strapi.injectSaga({ key: 'menuEditor', saga, pluginId });

export default compose(
  withReducer,
  withStrapiSaga,
  withConnect
)(MenuEditorPlugin);
