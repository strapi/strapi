import React from 'react';
import ViewContainer from '../ViewContainer';

export class GroupPage extends React.Component {
  // getGroupName = () => {
  //   const {
  //     match: {
  //       params: { groupName },
  //     },
  //   } = this.props;

  //   return modelName.split('&')[0];
  // };

  getFeatureType = () => {
    const {
      match: {
        params: { type },
      },
    } = this.props;

    return type === 'models' ? 'model' : 'group';
  };

  render() {
    console.log('Group props', this.props);

    return (
      <ViewContainer
        featureData={this.props.initialDataGroups}
        modifiedData={this.props.modifiedDataGroups}
        match={this.props.match}
        featureType={this.getFeatureType()}
      >
        <p>GROUPS LIST</p>
      </ViewContainer>
    );
  }
}

export default GroupPage;
