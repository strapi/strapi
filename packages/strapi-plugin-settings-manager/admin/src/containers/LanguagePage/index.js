import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { get } from 'lodash';
import {
  LoadingIndicatorPage,
  PluginHeader,
  List,
  ListHeader,
  ListTitle,
  ListWrapper,
  ButtonModal,
  HeaderModal,
  HeaderModalTitle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalForm,
  InputsIndex,
  PopUpWarning,
  request,
} from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import useFetch from '../../hooks/useFetch';
import ListRow from '../../components/ListRow';
import getFlag, { formatLanguageLocale } from '../../utils/getFlag';
import filterLanguages from './utils/filterLanguages';
import reducer, { initialState } from './reducer';
import Action from './Action';
import Flags from './Flags';

const getTrad = key => `${pluginId}.${key}`;

const LanguagePage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const [languageToDelete, setLanguageToDelete] = useState('');
  const [showWarningDelete, setWarningDelete] = useState(false);
  const [reducerState, dispatch] = useReducer(reducer, initialState);

  const {
    modifiedData,
    allLanguages,
    selectOptions,
    selectedLanguage,
  } = reducerState.toJS();
  const { data, isLoading } = useFetch(
    ['configurations/languages', 'configurations/i18n'],
    [shouldRefetch]
  );
  const findLangTrad = useCallback(
    lang => {
      const trad = get(allLanguages, [
        'sections',
        '0',
        'items',
        '0',
        'items',
      ]).find(obj => obj.value === formatLanguageLocale(lang).join('_'));

      return trad;
    },
    [allLanguages]
  );

  useEffect(() => {
    if (!isLoading) {
      const [{ languages }, result] = data;

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        languages,
        allLanguages: result,
        availableLanguages: filterLanguages(languages, result),
      });
    }

    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const handleToggle = () => setIsOpen(prev => !prev);
  const toggleWarningWarningDelete = (langToDelete = '') => {
    setLanguageToDelete(langToDelete);
    setWarningDelete(prev => !prev);
  };

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  const buttonProps = {
    kind: 'secondaryHotlineAdd',
    label: getTrad('list.languages.button.label'),
    onClick: handleToggle,
  };
  const availableLanguagesLength = modifiedData.length;
  const listTitleSuffix = availableLanguagesLength > 1 ? 'plural' : 'singular';
  const handleSubmit = async e => {
    e.preventDefault();

    try {
      handleToggle();
      await request(
        `/${pluginId}/configurations/languages`,
        { method: 'POST', body: { name: selectedLanguage } },
        true
      );
      setShouldRefetch(prev => !prev);
    } catch (err) {
      console.log(err);
    }
  };
  const handleClick = async lang => {
    try {
      const locale = findLangTrad(lang);

      await request(
        `/${pluginId}/configurations/i18n`,
        { method: 'PUT', body: { 'language.defaultLocale': locale.value } },
        true
      );
      setShouldRefetch(prev => !prev);
    } catch (err) {
      strapi.notification.error('notification.error');
    }
  };
  const handleDeleteLanguage = async () => {
    try {
      toggleWarningWarningDelete();

      await request(
        `/${pluginId}/configurations/languages/${languageToDelete}`,
        { method: 'DELETE' },
        true
      );
      setShouldRefetch(prev => !prev);
    } catch (err) {
      strapi.notification.error('notification.error');
    }
  };

  return (
    <>
      <Flags />
      <PluginHeader
        description={{ id: getTrad('form.language.description') }}
        title={{ id: getTrad('form.language.name') }}
      />

      <ListWrapper>
        <ListHeader
          button={{ ...buttonProps, style: { right: '15px', top: '18px' } }}
          style={{ paddingBottom: '1rem' }}
        >
          <div className="list-header-title">
            <FormattedMessage
              id={getTrad(`list.languages.title.${listTitleSuffix}`)}
            >
              {title => (
                <ListTitle>
                  {availableLanguagesLength}&nbsp;{title}
                </ListTitle>
              )}
            </FormattedMessage>
          </div>
        </ListHeader>
        <List>
          <table>
            <tbody>
              {modifiedData.map(lang => {
                const langArray = formatLanguageLocale(lang.name);
                const flag = getFlag(langArray);

                return (
                  <ListRow
                    key={lang.name}
                    className="clickable"
                    style={{ cursor: 'default' }}
                  >
                    <td>
                      <FormattedMessage
                        id={getTrad(findLangTrad(lang.name).name)}
                      >
                        {msg => (
                          <p style={{ fontWeight: 500 }}>
                            <span
                              className={`flag-icon flag-icon-${flag}`}
                              style={{ marginRight: 39 }}
                            />
                            {msg}
                          </p>
                        )}
                      </FormattedMessage>
                    </td>
                    <td>{lang.name}</td>
                    <td>
                      <Action
                        isActive={lang.active}
                        onClick={() => handleClick(lang.name)}
                      />
                    </td>
                    <td>
                      {!lang.active && (
                        <button
                          type="button"
                          onClick={() => toggleWarningWarningDelete(lang.name)}
                        >
                          <i className="fa fa-trash link-icon" />
                        </button>
                      )}
                    </td>
                  </ListRow>
                );
              })}
            </tbody>
          </table>
        </List>
      </ListWrapper>
      <Modal isOpen={isOpen} onToggle={handleToggle}>
        <HeaderModal>
          <section>
            <HeaderModalTitle>
              <FormattedMessage id={getTrad('list.languages.button.label')} />
            </HeaderModalTitle>
          </section>
        </HeaderModal>
        <form onSubmit={handleSubmit}>
          <ModalForm>
            <ModalBody style={{ paddingTop: '1.6rem' }}>
              <InputsIndex
                type="select"
                label={{ id: getTrad('form.language.choose') }}
                name="selectedLanguage"
                value={selectedLanguage}
                selectOptions={selectOptions}
                onChange={({ target: { value } }) => {
                  dispatch({
                    type: 'ON_CHANGE',
                    value,
                  });
                }}
              />
            </ModalBody>
          </ModalForm>
          <ModalFooter>
            <section>
              <ButtonModal
                message="components.popUpWarning.button.cancel"
                onClick={handleToggle}
                isSecondary
              />
              <ButtonModal message="form.button.done" type="submit" />
            </section>
          </ModalFooter>
        </form>
      </Modal>
      <PopUpWarning
        isOpen={showWarningDelete}
        toggleModal={toggleWarningWarningDelete}
        onConfirm={handleDeleteLanguage}
        content={{
          message: `${pluginId}.popUpWarning.languages.delete.message`,
        }}
        popUpWarningType="danger"
      />
    </>
  );
};

export default LanguagePage;
