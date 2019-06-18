import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Prompt } from 'react-router';
import { get, isEqual, pickBy } from 'lodash';

import pluginId from '../../pluginId';

import ViewContainer from '../ViewContainer';

import { submitGroup, submitTempGroup } from '../App/actions';

class GroupPage extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  state = { attrToDelete: null, removePrompt: true, showWarning: false };

  getGroupName = () => {
    const {
      match: {
        params: { groupName },
      },
    } = this.props;

    return groupName;
  };

  getSearch = () => {
    const {
      location: { search },
    } = this.props;

    return search;
  };

  hasGroupBeenModified = () => {
    const { initialDataGroup, modifiedDataGroup } = this.props;
    const currentModel = this.getGroupName();

    // console.log('!!!!!!!');
    // console.log(modifiedDataGroup);
    // console.log(initialDataGroup);
    // console.log(initialDataGroup[currentModel]);

    return (
      !isEqual(
        initialDataGroup[currentModel],
        modifiedDataGroup[currentModel]
      ) && this.getSearch() === ''
    );
  };

  isUpdatingTemporaryGroup = (groupName = this.getGroupName()) => {
    const { groups } = this.props;
    /* istanbul ignore next */
    const currentGroup = groups.find(group => group.name === groupName) || {
      isTemporary: true,
    };

    const { isTemporary } = currentGroup;

    return isTemporary;
  };

  setPrompt = () => this.setState({ removePrompt: false });

  removePrompt = () => this.setState({ removePrompt: true });

  render() {
    const {
      initialDataGroup,
      modifiedDataGroup,
      newGroup,
      temporaryAttribute,
    } = this.props;
    const { removePrompt } = this.state;

    return (
      <div>
        <FormattedMessage id={`${pluginId}.prompt.content.unsaved`}>
          {msg => (
            <Prompt
              when={this.hasGroupBeenModified() && !removePrompt}
              message={msg}
            />
          )}
        </FormattedMessage>
        <ViewContainer
          {...this.props}
          featureData={initialDataGroup}
          featureType="group"
          modifiedData={modifiedDataGroup}
          newFeature={newGroup}
          tempData={temporaryAttribute}
          // resetEditTempFeature={resetEditTempGroup}
          // resetEditExistingFeature={resetEditExistingGroup()}
          removePrompt={this.removePrompt}
          submitFeature={submitGroup}
          submitTempFeature={submitTempGroup}
        >
          <p>GROUPS LIST</p>
        </ViewContainer>
      </div>
    );
  }
}

GroupPage.contextTypes = {
  emitEvent: PropTypes.func,
};

GroupPage.protoType = {
  resetEditTempGroup: PropTypes.func.isRequired,
};

export default GroupPage;
