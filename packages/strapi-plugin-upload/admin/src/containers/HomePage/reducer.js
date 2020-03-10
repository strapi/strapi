import { fromJS } from 'immutable';

const initialState = fromJS({
  areAllCheckboxesSelected: false,
  data: [
    {
      id: '1',
      name: 'Chat paysage',
      size: 17329,
      type: 'image/png',
      url:
        'https://images.pexels.com/photos/20787/pexels-photo.jpg?auto=compress&cs=tinysrgb&h=350',
    },
    {
      id: '2',
      name: 'Chat portrait',
      size: 17329,
      type: 'image/png',
      url: 'https://emiliedammedumoulin.com/wp-content/uploads/2018/07/contact-chat-accueil.jpg',
    },
    {
      id: '3',
      name: 'Gif',
      size: 17329,
      type: 'image/png',
      url:
        'https://user-images.githubusercontent.com/879561/51321923-54024f00-1a64-11e9-8c37-3308350a59c4.gif',
    },
    {
      id: '4',
      name: 'Paysage',
      size: 17329,
      type: 'image/png',
      url:
        'https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcSyHCXO8D0QQrPDuGstvH9dEwhhB7Qv-3mDMWGpLExyY1CF84cL',
    },
  ],
  dataToDelete: [],
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'GET_DATA_SUCCEEDED':
      return state.update('data', () => action.data);
    case 'ON_CHANGE_DATA_TO_DELETE': {
      const { value, id } = action;

      if (value) {
        return state.update('dataToDelete', dataToDelete => {
          return dataToDelete.push(id);
        });
      }
      const index = state.get('dataToDelete').findIndex(item => item === id);

      return state.removeIn(['dataToDelete', index]);
    }
    case 'TOGGLE_SELECT_ALL': {
      const { value } = action;

      if (!value) {
        return state.update('dataToDelete', () => []);
      }

      return state.update('dataToDelete', () => state.get('data').map(item => item.get('id')));
    }
    default:
      return state;
  }
};

export default reducer;
export { initialState };
