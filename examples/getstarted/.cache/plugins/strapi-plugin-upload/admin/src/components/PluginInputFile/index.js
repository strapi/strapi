/**
 *
 * PluginInputFile
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import styles from './styles.scss';

/* eslint-disable react/no-string-refs */
/* eslint-disable jsx-a11y/label-has-for */
/* eslint-disable react/jsx-tag-spacing */
class PluginInputFile extends React.PureComponent {
  state = { isDraging: false };

  handleChange = (e) => {
    const dataTransfer = e.target;
    this.props.onDrop({ dataTransfer });
  }

  handleDragEnter = () => this.setState({ isDraging: true });

  handleDragLeave = () => this.setState({ isDraging: false });

  handleDrop = (e) => {
    e.preventDefault();
    this.setState({ isDraging: false });
    this.props.onDrop(e);
  }

  render() {
    const {
      name,
      showLoader,
    } = this.props;
    const { isDraging } = this.state;
    const link = (
      <FormattedMessage id="upload.PluginInputFile.link">
        {(message) => <span className={styles.underline}>{message}</span>}
      </FormattedMessage>
    );

    return (
      <label
        className={cn(styles.pluginInputFile, isDraging && styles.pluginInputFileHover, showLoader && styles.quadrat)}
        onDragEnter={this.handleDragEnter}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={this.handleDrop}
      >
        <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 104.40317 83.13328"><g><rect x="5.02914" y="8.63138" width="77.33334" height="62.29167" rx="4" ry="4" transform="translate(-7.45722 9.32921) rotate(-12)" fill="#fafafb"/><rect x="5.52914" y="9.13138" width="76.33334" height="61.29167" rx="4" ry="4" transform="translate(-7.45722 9.32921) rotate(-12)" fill="none" stroke="#979797"/><path d="M74.25543,36.05041l3.94166,18.54405L20.81242,66.79194l-1.68928-7.94745,10.2265-16.01791,7.92872,5.2368,16.3624-25.62865ZM71.974,6.07811,6.76414,19.93889a1.27175,1.27175,0,0,0-.83343.58815,1.31145,1.31145,0,0,0-.18922,1.01364L16.44028,71.87453a1.31145,1.31145,0,0,0,.58515.849,1.27176,1.27176,0,0,0,1.0006.19831L83.23586,59.06111a1.27177,1.27177,0,0,0,.83343-.58815,1.31146,1.31146,0,0,0,.18922-1.01364L73.55972,7.12547a1.31146,1.31146,0,0,0-.58514-.849A1.27177,1.27177,0,0,0,71.974,6.07811Zm6.80253-.0615L89.4753,56.35046A6.5712,6.5712,0,0,1,88.554,61.435a6.37055,6.37055,0,0,1-4.19192,2.92439L19.15221,78.22019a6.37056,6.37056,0,0,1-5.019-.96655,6.57121,6.57121,0,0,1-2.90975-4.27024L.5247,22.64955A6.57121,6.57121,0,0,1,1.446,17.565a6.37056,6.37056,0,0,1,4.19192-2.92439L70.84779.77981a6.37055,6.37055,0,0,1,5.019.96655A6.5712,6.5712,0,0,1,78.77651,6.01661Z" transform="translate(-0.14193 -0.62489)" fill="#333740"/><rect x="26.56627" y="4.48824" width="62.29167" height="77.33333" rx="4" ry="4" transform="translate(0.94874 87.10632) rotate(-75)" fill="#fafafb"/><rect x="27.06627" y="4.98824" width="61.29167" height="76.33333" rx="4" ry="4" transform="translate(0.94874 87.10632) rotate(-75)" fill="none" stroke="#979797"/><path d="M49.62583,26.96884A7.89786,7.89786,0,0,1,45.88245,31.924a7.96,7.96,0,0,1-10.94716-2.93328,7.89786,7.89786,0,0,1-.76427-6.163,7.89787,7.89787,0,0,1,3.74338-4.95519,7.96,7.96,0,0,1,10.94716,2.93328A7.89787,7.89787,0,0,1,49.62583,26.96884Zm37.007,26.73924L81.72608,72.02042,25.05843,56.83637l2.1029-7.84815L43.54519,39.3589l4.68708,8.26558L74.44644,32.21756ZM98.20721,25.96681,33.81216,8.71221a1.27175,1.27175,0,0,0-1.00961.14568,1.31145,1.31145,0,0,0-.62878.81726L18.85537,59.38007a1.31145,1.31145,0,0,0,.13591,1.02215,1.27176,1.27176,0,0,0,.80151.631l64.39506,17.2546a1.27177,1.27177,0,0,0,1.0096-.14567,1.31146,1.31146,0,0,0,.62877-.81726l13.3184-49.70493a1.31146,1.31146,0,0,0-.13591-1.02215A1.27177,1.27177,0,0,0,98.20721,25.96681Zm6.089,3.03348L90.97784,78.70523a6.5712,6.5712,0,0,1-3.12925,4.1121,6.37055,6.37055,0,0,1-5.06267.70256L18.39086,66.26529a6.37056,6.37056,0,0,1-4.03313-3.13977,6.57121,6.57121,0,0,1-.654-5.12581L27.02217,8.29477a6.57121,6.57121,0,0,1,3.12925-4.11211,6.37056,6.37056,0,0,1,5.06267-.70255l64.39506,17.2546a6.37055,6.37055,0,0,1,4.03312,3.13977A6.5712,6.5712,0,0,1,104.29623,29.0003Z" transform="translate(-0.14193 -0.62489)" fill="#333740"/></g></svg>
        <p className={styles.textWrapper}>
          {!showLoader && <FormattedMessage id="upload.PluginInputFile.text" values={{ link }} /> }
          {showLoader && <FormattedMessage id="upload.PluginInputFile.loading" />}
        </p>
        <div
          onDragLeave={this.handleDragLeave}
          className={cn(isDraging && styles.isDraging)}
        />
        <input
          multiple
          name={name}
          onChange={this.handleChange}
          type="file"
        />
      </label>
    );
  }
}

PluginInputFile.defaultProps = {};

PluginInputFile.propTypes = {
  name: PropTypes.string.isRequired,
  onDrop: PropTypes.func.isRequired,
  showLoader: PropTypes.bool.isRequired,
};

export default PluginInputFile;
