/*
 *
 * HomePage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { bindActionCreators, compose } from 'redux';
import { PluginHeader } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import { HomePageContextProvider } from '../../contexts/HomePage';
import MenuEditor from '../../components/MenuEditor';
import selectHomePage from './selectors';
import Wrapper from './Wrapper';
import { getMenu, onChange, submit } from './actions';
import reducer from './reducer';
import saga from './saga';

export class HomePage extends React.Component {
  state = { editMode: false, modalOpen: false };

  componentDidMount() {
    getMenu();
  }

  pluginHeaderActions = [
    {
      kind: 'secondary',
      label: 'menu-editor.MenuEditor.cancelEditMode',
      onClick: () => this.setState({ editMode: false }),
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

  handleShowModal = () => {
    this.setState({ modalOpen: true });
  };

  handleCloseModal = () => {
    this.setState({ modalOpen: false });
  };

  render() {
    const testData = [{ id: 1, name: 'karel', depth: 0 }];

    return (
      <HomePageContextProvider
        pathname={this.props.location.pathname}
        push={this.props.history.push}
      >
        <form onSubmit={e => e.preventDefault()}>
          <Wrapper className="container-fluid">
            <PluginHeader
              title={{ id: 'menu-editor.MenuEditor.title' }}
              description={{ id: 'menu-editor.MenuEditor.description' }}
              actions={this.state.editMode ? this.pluginHeaderActions : this.actionEdit}
            />
            <MenuEditor menuItems={testData} editMode={this.state.editMode} onChange={onChange} />
          </Wrapper>
        </form>
      </HomePageContextProvider>
    );
  }
}

HomePage.propTypes = {
  menuItems: PropTypes.array.isRequired,
  getMenu: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      onChange,
      getMenu,
      submit,
    },
    dispatch
  );
}

const mapStateToProps = selectHomePage();

const withConnect = connect(mapStateToProps, mapDispatchToProps);
const withReducer = strapi.injectReducer({
  key: 'menuEditor',
  reducer,
  pluginId,
});
const withSaga = strapi.injectSaga({ key: 'menuEditor', saga, pluginId });

export default compose(withReducer, withSaga, withConnect)(injectIntl(HomePage));
