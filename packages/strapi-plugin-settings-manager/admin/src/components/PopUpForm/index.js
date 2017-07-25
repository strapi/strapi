/**
*
* PopUpForm
*
*/

import React from 'react';
import { isEmpty } from 'lodash';
import { FormattedMessage } from 'react-intl';
import WithFormSection from 'components/WithFormSection';
import styles from './styles.scss';

class PopUpForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    console.log(this.props);
    let formName;

    if (this.props.slug === 'languages') {
      formName = <FormattedMessage {...{id: 'form.i18n.choose'}} />;
    } else {
      formName = isEmpty(this.props.sections.name) ? '' : <FormattedMessage {...{id: this.props.sections.name}} />;
    }

    return (
      <div className={styles.popUpForm}>
        <div className="container-fluid">
          <div className="row">
            <div className="col-sm-12">
              <span>{formName}</span>
            </div>
          </div>
        </div>

      </div>
    );
  }
}

PopUpForm.propTypes = {
  sections: React.PropTypes.object,
  slug: React.PropTypes.string,
};

export default WithFormSection(PopUpForm); // eslint-disable-line new-cap
