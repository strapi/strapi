import { reducer } from '../reducer';

describe('ADMIN | COMPONENTS | USERS | List | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      const initialState = {
        test: true,
      };

      expect(reducer(initialState, {})).toEqual(initialState);
    });
  });

  describe('ON_CHANGE', () => {
    it('should change the data correctly', () => {
      const initialState = {
        rows: [
          {
            id: 1,
            firstname: 'Soup',
            lastname: 'Soup',
            username: 'test',
            email: 't@t.com',
            isActive: true,
            roles: ['super admin'],
            _isChecked: false,
          },
          {
            id: 2,
            firstname: 'Soup',
            lastname: 'Soup',
            username: 'test',
            email: 't@t.com',
            isActive: false,
            _isChecked: false,
            roles: ['super admin', 'Author', 'editor'],
          },
          {
            id: 3,
            firstname: 'Pierre',
            lastname: 'Gagnaire',
            username: 'test',
            email: 't@t.com',
            isActive: true,
            roles: ['super admin'],
            _isChecked: false,
          },
          {
            id: 4,
            firstname: 'Pierre',
            lastname: 'Gagnaire',
            username: 'test',
            email: 't@t.com',
            isActive: true,
            roles: ['super admin'],
            _isChecked: false,
          },
          {
            id: 5,
            firstname: 'Pierre',
            lastname: 'Gagnaire',
            username: 'test',
            email: 't@t.com',
            isActive: true,
            roles: ['super admin'],
            _isChecked: false,
          },
        ],
      };
      const action = {
        type: 'ON_CHANGE',
        index: 2,
      };
      const expected = {
        rows: [
          {
            id: 1,
            firstname: 'Soup',
            lastname: 'Soup',
            username: 'test',
            email: 't@t.com',
            isActive: true,
            roles: ['super admin'],
            _isChecked: false,
          },
          {
            id: 2,
            firstname: 'Soup',
            lastname: 'Soup',
            username: 'test',
            email: 't@t.com',
            isActive: false,
            _isChecked: false,
            roles: ['super admin', 'Author', 'editor'],
          },
          {
            id: 3,
            firstname: 'Pierre',
            lastname: 'Gagnaire',
            username: 'test',
            email: 't@t.com',
            isActive: true,
            roles: ['super admin'],
            _isChecked: true,
          },
          {
            id: 4,
            firstname: 'Pierre',
            lastname: 'Gagnaire',
            username: 'test',
            email: 't@t.com',
            isActive: true,
            roles: ['super admin'],
            _isChecked: false,
          },
          {
            id: 5,
            firstname: 'Pierre',
            lastname: 'Gagnaire',
            username: 'test',
            email: 't@t.com',
            isActive: true,
            roles: ['super admin'],
            _isChecked: false,
          },
        ],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE_ALL', () => {
    it('should change the data correctly', () => {
      const initialState = {
        rows: [
          {
            id: 1,
            firstname: 'Soup',
            lastname: 'Soup',
            username: 'test',
            email: 't@t.com',
            isActive: true,
            roles: ['super admin'],
            _isChecked: false,
          },
          {
            id: 2,
            firstname: 'Soup',
            lastname: 'Soup',
            username: 'test',
            email: 't@t.com',
            isActive: false,
            _isChecked: true,
            roles: ['super admin', 'Author', 'editor'],
          },
          {
            id: 3,
            firstname: 'Pierre',
            lastname: 'Gagnaire',
            username: 'test',
            email: 't@t.com',
            isActive: true,
            roles: ['super admin'],
            _isChecked: false,
          },
          {
            id: 4,
            firstname: 'Pierre',
            lastname: 'Gagnaire',
            username: 'test',
            email: 't@t.com',
            isActive: true,
            roles: ['super admin'],
            _isChecked: false,
          },
          {
            id: 5,
            firstname: 'Pierre',
            lastname: 'Gagnaire',
            username: 'test',
            email: 't@t.com',
            isActive: true,
            roles: ['super admin'],
            _isChecked: false,
          },
        ],
      };
      const action = {
        type: 'ON_CHANGE_ALL',
      };
      const expected = {
        rows: [
          {
            id: 1,
            firstname: 'Soup',
            lastname: 'Soup',
            username: 'test',
            email: 't@t.com',
            isActive: true,
            roles: ['super admin'],
            _isChecked: true,
          },
          {
            id: 2,
            firstname: 'Soup',
            lastname: 'Soup',
            username: 'test',
            email: 't@t.com',
            isActive: false,
            _isChecked: true,
            roles: ['super admin', 'Author', 'editor'],
          },
          {
            id: 3,
            firstname: 'Pierre',
            lastname: 'Gagnaire',
            username: 'test',
            email: 't@t.com',
            isActive: true,
            roles: ['super admin'],
            _isChecked: true,
          },
          {
            id: 4,
            firstname: 'Pierre',
            lastname: 'Gagnaire',
            username: 'test',
            email: 't@t.com',
            isActive: true,
            roles: ['super admin'],
            _isChecked: true,
          },
          {
            id: 5,
            firstname: 'Pierre',
            lastname: 'Gagnaire',
            username: 'test',
            email: 't@t.com',
            isActive: true,
            roles: ['super admin'],
            _isChecked: true,
          },
        ],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('SET_DATA', () => {
    it('should add the _isChecked key to all elements', () => {
      const initialState = {
        rows: [],
      };
      const action = {
        type: 'SET_DATA',
        data: [
          {
            id: 3,
            firstname: 'Pierre',
            lastname: 'Gagnaire',
            username: 'test',
            email: 't@t.com',
            isActive: true,
            roles: ['super admin'],
          },
          {
            id: 4,
            firstname: 'Pierre',
            lastname: 'Gagnaire',
            username: 'test',
            email: 't@t.com',
            isActive: true,
            roles: ['super admin'],
          },
        ],
      };
      const expected = {
        rows: [
          {
            id: 3,
            firstname: 'Pierre',
            lastname: 'Gagnaire',
            username: 'test',
            email: 't@t.com',
            isActive: true,
            roles: ['super admin'],
            _isChecked: false,
          },
          {
            id: 4,
            firstname: 'Pierre',
            lastname: 'Gagnaire',
            username: 'test',
            email: 't@t.com',
            isActive: true,
            roles: ['super admin'],
            _isChecked: false,
          },
        ],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
