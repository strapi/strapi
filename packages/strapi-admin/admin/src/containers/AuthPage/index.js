import React, { useEffect, useReducer } from 'react';
import axios from 'axios';
import { camelCase, get, omit, upperFirst } from 'lodash';
import { Redirect, useRouteMatch, useHistory } from 'react-router-dom';
import { auth, useQuery } from 'strapi-helper-plugin';
import BaselineAlignment from '../../components/BaselineAlignement';
import NavTopRightWrapper from '../../components/NavTopRightWrapper';
import PageTitle from '../../components/PageTitle';
import LocaleToggle from '../LocaleToggle';
import checkFormValidity from '../../utils/checkFormValidity';
import formatAPIErrors from '../../utils/formatAPIErrors';
import { forms } from './utils';
import init from './init';
import { initialState, reducer } from './reducer';

const AuthPage = () => {
  const { push } = useHistory();
  const {
    params: { authType },
  } = useRouteMatch('/auth/:authType');
  const query = useQuery();
  const registrationToken = query.get('registrationToken');
  const { Component, endPoint, fieldsToDisable, fieldsToOmit, schema } = get(forms, authType, {});
  const [{ formErrors, modifiedData, requestError }, dispatch] = useReducer(
    reducer,
    initialState,
    init
  );
  const CancelToken = axios.CancelToken;
  const source = CancelToken.source();

  useEffect(() => {
    // Cancel request on unmount
    return () => {
      source.cancel('Component unmounted');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset the state on navigation change
  useEffect(() => {
    dispatch({
      type: 'RESET_PROPS',
    });
  }, [authType]);

  useEffect(() => {
    if (authType === 'register') {
      const getData = async () => {
        try {
          const {
            data: { data },
          } = await axios.get(
            `${strapi.backendURL}/admin/registration-info?registrationToken=${registrationToken}`
          );

          dispatch({
            type: 'SET_DATA',
            data: { registrationToken, userInfo: data },
          });
        } catch (err) {
          const errorMessage = get(err, ['response', 'data', 'message'], 'An error occured');

          strapi.notification.error(errorMessage);

          // Redirect to the oops page in case of an invalid token
          // @alexandrebodin @JAB I am not sure it is the wanted behavior
          push(`/auth/oops?info=${encodeURIComponent(errorMessage)}`);
        }
      };

      // TODO API call
      getData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authType]);

  // We should redirect to the login page or the oops page
  if (!forms[authType]) {
    return <div>COMING SOON</div>;
  }

  const handleChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name,
      value,
    });
  };

  const handleSubmit = async e => {
    e.preventDefault();

    const errors = await checkFormValidity(modifiedData, schema);

    dispatch({
      type: 'SET_ERRORS',
      errors: errors || {},
    });

    if (!errors) {
      const body = omit(modifiedData, fieldsToOmit);
      const requestURL = `/admin/${endPoint}`;

      if (authType === 'login') {
        await loginRequest(body, requestURL);
      }

      if (authType === 'register') {
        await registerRequest(body, requestURL);
      }
    }
  };

  const loginRequest = async (body, requestURL) => {
    try {
      const {
        data: {
          data: { token, user },
        },
      } = await axios({
        method: 'POST',
        url: `${strapi.backendURL}${requestURL}`,
        data: body,
        cancelToken: source.token,
      });

      auth.setToken(token, modifiedData.rememberMe);
      auth.setUserInfo(user, modifiedData.rememberMe);
    } catch (err) {
      if (err.response) {
        const errorMessage = get(err, ['response', 'data', 'message'], 'Something went wrong');
        const errorStatus = get(err, ['response', 'data', 'statusCode'], 400);

        if (camelCase(errorMessage).toLowerCase() === 'usernotactive') {
          push('/auth/oops');

          dispatch({
            type: 'RESET_PROPS',
          });

          return;
        }

        dispatch({
          type: 'SET_REQUEST_ERROR',
          errorMessage,
          errorStatus,
        });
      }
    }
  };

  const registerRequest = async (body, requestURL) => {
    try {
      const {
        data: {
          data: { token, user },
        },
      } = await axios({
        method: 'POST',
        url: `${strapi.backendURL}${requestURL}`,
        data: body,
        cancelToken: source.token,
      });

      auth.setToken(token, false);
      auth.setUserInfo(user, false);

      if (authType.includes('register') && modifiedData.userInfo.news === true) {
        axios({
          method: 'POST',
          body: omit(modifiedData, ['userInfo.password', 'userInfo.confirmPassword']),
        });
      }
      // Redirect to the homePage
      push('/');
    } catch (err) {
      if (err.response) {
        const { data } = err.response;
        const apiErrors = formatAPIErrors(data);

        dispatch({
          type: 'SET_ERRORS',
          errors: apiErrors,
        });
      }
    }
  };

  // Redirect the user to the homepage if he is logged in

  if (auth.getToken()) {
    return <Redirect to="/" />;
  }

  return (
    <>
      <PageTitle title={upperFirst(authType)} />
      <NavTopRightWrapper>
        <LocaleToggle isLogged className="localeDropdownMenuNotLogged" />
      </NavTopRightWrapper>
      <BaselineAlignment top size="80px">
        <Component
          fieldsToDisable={fieldsToDisable}
          formErrors={formErrors}
          modifiedData={modifiedData}
          onChange={handleChange}
          onSubmit={handleSubmit}
          requestError={requestError}
        />
      </BaselineAlignment>
    </>
  );
};

export default AuthPage;

// TODO Remove comments when auth feature is finished

// import React, { memo, useEffect, useReducer, useRef } from 'react';
// import PropTypes from 'prop-types';
// import { get, isEmpty, omit, set, upperFirst } from 'lodash';
// import { FormattedMessage } from 'react-intl';
// import { Link, Redirect } from 'react-router-dom';
// import { Button } from '@buffetjs/core';
// import { auth, getQueryParameters, getYupInnerErrors, request } from 'strapi-helper-plugin';
// import NavTopRightWrapper from '../../components/NavTopRightWrapper';
// import LogoStrapi from '../../assets/images/logo_strapi.png';
// import PageTitle from '../../components/PageTitle';
// import LocaleToggle from '../LocaleToggle';
// import Wrapper from './Wrapper';
// import Input from './Input';
// import forms from './forms';
// import reducer, { initialState } from './reducer';
// import formatErrorFromRequest from './utils/formatErrorFromRequest';

// const AuthPage = ({
//   hasAdminUser,
//   location: { search },
//   match: {
//     params: { authType },
//   },
// }) => {
//   const [reducerState, dispatch] = useReducer(reducer, initialState);
//   const codeRef = useRef();
//   const abortController = new AbortController();

//   const { signal } = abortController;
//   codeRef.current = getQueryParameters(search, 'code');
//   useEffect(() => {
//     // Set the reset code provided by the url
//     if (authType === 'reset-password') {
//       dispatch({
//         type: 'ON_CHANGE',
//         keys: ['code'],
//         value: codeRef.current,
//       });
//     } else {
//       // Clean reducer upon navigation
//       dispatch({
//         type: 'RESET_PROPS',
//       });
//     }

//     return () => {
//       abortController.abort();
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [authType, codeRef]);
//   const { didCheckErrors, errors, modifiedData, submitSuccess, userEmail } = reducerState.toJS();
//   const handleChange = ({ target: { name, value } }) => {
//     dispatch({
//       type: 'ON_CHANGE',
//       keys: name.split('.'),
//       value,
//     });
//   };

//   const handleSubmit = async e => {
//     e.preventDefault();
//     const schema = forms[authType].schema;
//     let formErrors = {};

//     try {
//       await schema.validate(modifiedData, { abortEarly: false });

//       try {
//         if (modifiedData.news === true) {
//           await request('https://analytics.strapi.io/register', {
//             method: 'POST',
//             body: omit(modifiedData, ['password', 'confirmPassword']),
//             signal,
//           });
//         }
//       } catch (err) {
//         // Do nothing
//       }

//       try {
//         const requestEndPoint = forms[authType].endPoint;
//         const requestURL = `/admin/auth/${requestEndPoint}`;
//         const body = omit(modifiedData, 'news');

//         if (authType === 'forgot-password') {
//           set(body, 'url', `${strapi.remoteURL}/auth/reset-password`);
//         }

//         const { jwt, user, ok } = await request(requestURL, {
//           method: 'POST',
//           body,
//           signal,
//         });

//         if (authType === 'forgot-password' && ok === true) {
//           dispatch({
//             type: 'SUBMIT_SUCCESS',
//             email: modifiedData.email,
//           });
//         } else {
//           auth.setToken(jwt, modifiedData.rememberMe);
//           auth.setUserInfo(user, modifiedData.rememberMe);
//         }
//       } catch (err) {
//         const formattedError = formatErrorFromRequest(err);

//         if (authType === 'login') {
//           formErrors = {
//             global: formattedError,
//             identifier: formattedError,
//             password: formattedError,
//           };
//         } else if (authType === 'forgot-password') {
//           formErrors = { email: formattedError[0] };
//         } else {
//           strapi.notification.error(get(formattedError, '0.id', 'notification.error'));
//         }
//       }
//     } catch (err) {
//       formErrors = getYupInnerErrors(err);
//     }

//     dispatch({
//       type: 'SET_ERRORS',
//       formErrors,
//     });
//   };

//   // Redirect the user to the login page if the endpoint does not exist
//   if (!Object.keys(forms).includes(authType)) {
//     return <Redirect to="/" />;
//   }

//   // Redirect the user to the homepage if he is logged in
//   if (auth.getToken()) {
//     return <Redirect to="/" />;
//   }

//   if (!hasAdminUser && authType !== 'register') {
//     return <Redirect to="/auth/register" />;
//   }

//   // Prevent the user from registering to the admin
//   if (hasAdminUser && authType === 'register') {
//     return <Redirect to="/auth/login" />;
//   }

//   const globalError = get(errors, 'global.0.id', '');
//   const shouldShowFormErrors = !isEmpty(globalError);

//   return (
//     <>
//       <PageTitle title={upperFirst(authType)} />
//       <Wrapper authType={authType} withSuccessBorder={submitSuccess}>
//         <NavTopRightWrapper>
//           <LocaleToggle isLogged className="localeDropdownMenuNotLogged" />
//         </NavTopRightWrapper>
//         <div className="wrapper">
//           <div className="headerContainer">
//             {authType === 'register' ? (
//               <FormattedMessage id="Auth.form.header.register" />
//             ) : (
//               <img src={LogoStrapi} alt="strapi-logo" />
//             )}
//           </div>
//           <div className="headerDescription">
//             {authType === 'register' && <FormattedMessage id="Auth.header.register.description" />}
//           </div>
//           {/* TODO Forgot success style */}
//           <div className="formContainer bordered">
//             <form onSubmit={handleSubmit}>
//               <div className="container-fluid">
//                 {shouldShowFormErrors && (
//                   <div className="errorsContainer">
//                     <FormattedMessage id={globalError} />
//                   </div>
//                 )}
//                 <div className="row" style={{ textAlign: 'start' }}>
//                   {submitSuccess && (
//                     <div className="forgotSuccess">
//                       <FormattedMessage id="Auth.form.forgot-password.email.label.success" />
//                       <br />
//                       <p>{userEmail}</p>
//                     </div>
//                   )}
//                   {!submitSuccess &&
//                     forms[authType].inputs.map((row, index) => {
//                       return row.map(input => {
//                         return (
//                           <Input
//                             {...input}
//                             autoFocus={index === 0}
//                             didCheckErrors={didCheckErrors}
//                             errors={errors}
//                             key={input.name}
//                             noErrorsDescription={shouldShowFormErrors}
//                             onChange={handleChange}
//                             value={modifiedData[input.name]}
//                           />
//                         );
//                       });
//                     })}
//                   <div
//                     className={`${
//                       authType === 'login' ? 'col-6 loginButton' : 'col-12 buttonContainer'
//                     }`}
//                   >
//                     <Button
//                       color="primary"
//                       className={submitSuccess ? 'buttonForgotSuccess' : ''}
//                       type="submit"
//                       style={authType === 'login' ? {} : { width: '100%' }}
//                     >
//                       <FormattedMessage
//                         id={`Auth.form.button.${
//                           submitSuccess ? 'forgot-password.success' : authType
//                         }`}
//                       />
//                     </Button>
//                   </div>
//                 </div>
//               </div>
//             </form>
//           </div>
//           <div className="linkContainer">
//             {authType !== 'register' && authType !== 'reset-password' && (
//               <Link to={`/auth/${authType === 'login' ? 'forgot-password' : 'login'}`}>
//                 <FormattedMessage
//                   id={`Auth.link.${authType === 'login' ? 'forgot-password' : 'ready'}`}
//                 />
//               </Link>
//             )}
//           </div>
//           {authType === 'register' && (
//             <div className="logoContainer">
//               <img src={LogoStrapi} alt="strapi-logo" />
//             </div>
//           )}
//         </div>
//       </Wrapper>
//     </>
//   );
// };

// AuthPage.propTypes = {
//   hasAdminUser: PropTypes.bool.isRequired,
//   location: PropTypes.shape({
//     search: PropTypes.string.isRequired,
//   }).isRequired,
//   match: PropTypes.shape({
//     params: PropTypes.shape({
//       authType: PropTypes.string,
//     }).isRequired,
//   }).isRequired,
// };

// export default memo(AuthPage);
