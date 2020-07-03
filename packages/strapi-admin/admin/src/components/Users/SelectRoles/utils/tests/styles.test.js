import styles from '../styles';

describe('ADMIN | COMPONENTS | USER | SelectRoles | utils | styles', () => {
  describe('control', () => {
    describe('menuIsOpen is equal to true', () => {
      it('should return the correct border-radius', () => {
        const base = {
          ok: true,
        };
        const state = {
          isFocused: false,
          selectProps: {
            menuIsOpen: true,
            error: null,
            value: [],
          },
        };

        const expected = {
          ok: true,
          fontSize: 13,
          minHeight: 34,
          outline: 0,
          boxShadow: 0,
          border: '1px solid #e3e9f3 !important',
          borderRadius: '2px !important',
          borderBottomLeftRadius: '0 !important',
          borderBottomRightRadius: '0 !important',
        };

        expect(styles.control(base, state)).toEqual(expected);
      });

      it('should return the correct border when the component is focused', () => {
        const base = {
          ok: true,
        };
        const state = {
          isFocused: true,
          selectProps: {
            menuIsOpen: true,
            error: null,
            value: [],
          },
        };

        const expected = {
          ok: true,
          fontSize: 13,
          minHeight: 34,
          outline: 0,
          boxShadow: 0,
          border: '1px solid #78caff !important',
          borderRadius: '2px !important',
          borderBottomLeftRadius: '0 !important',
          borderBottomRightRadius: '0 !important',
        };

        expect(styles.control(base, state)).toEqual(expected);
      });

      it('should return the correct border when the component is focused and has a value', () => {
        const base = {
          ok: true,
        };
        const state = {
          isFocused: true,
          selectProps: {
            menuIsOpen: true,
            error: null,
            value: ['test'],
          },
        };

        const expected = {
          ok: true,
          fontSize: 13,
          minHeight: 34,
          outline: 0,
          boxShadow: 0,
          border: '1px solid #78caff !important',
          borderRadius: '2px !important',
          borderBottomLeftRadius: '0 !important',
          borderBottomRightRadius: '0 !important',
        };

        expect(styles.control(base, state)).toEqual(expected);
      });

      it('should return the correct border when the component is focused, has a value and has an error', () => {
        const base = {
          ok: true,
        };
        const state = {
          isFocused: true,
          selectProps: {
            menuIsOpen: true,
            error: true,
            value: ['test'],
          },
        };

        const expected = {
          ok: true,
          fontSize: 13,
          minHeight: 34,
          outline: 0,
          boxShadow: 0,
          border: '1px solid #78caff !important',
          borderRadius: '2px !important',
          borderBottomLeftRadius: '0 !important',
          borderBottomRightRadius: '0 !important',
        };

        expect(styles.control(base, state)).toEqual(expected);
      });

      it('should return the correct border when the component is not focused, does not have a value and has an error', () => {
        const base = {
          ok: true,
        };
        const state = {
          isFocused: false,
          selectProps: {
            menuIsOpen: true,
            error: true,
            value: [],
          },
        };

        const expected = {
          ok: true,
          fontSize: 13,
          minHeight: 34,
          outline: 0,
          boxShadow: 0,
          border: '1px solid #f64d0a !important',
          borderRadius: '2px !important',
          borderBottomLeftRadius: '0 !important',
          borderBottomRightRadius: '0 !important',
        };

        expect(styles.control(base, state)).toEqual(expected);
      });
    });

    describe('menuIsOpen is false', () => {
      it('should return the correct border-radius', () => {
        const base = {
          ok: true,
        };
        const state = {
          isFocused: false,
          selectProps: {
            menuIsOpen: false,
            error: null,
            value: [],
          },
        };

        const expected = {
          ok: true,
          fontSize: 13,
          minHeight: 34,
          outline: 0,
          boxShadow: 0,
          border: '1px solid #e3e9f3 !important',
          borderRadius: '2px !important',
        };

        expect(styles.control(base, state)).toEqual(expected);
      });
    });
  });

  describe('menu', () => {
    it('should return the correct object', () => {
      const base = {
        ok: true,
      };
      const expected = {
        ok: true,
        width: 'calc(100% - 0px)',
        margin: '0',
        paddingTop: 0,
        borderRadius: '2px !important',
        borderTopLeftRadius: '0 !important',
        borderTopRightRadius: '0 !important',
        border: '1px solid #78caff !important',
        boxShadow: 0,
        borderTop: '0 !important',
        fontSize: '13px',
      };

      expect(styles.menu(base)).toEqual(expected);
    });
  });

  describe('menuList', () => {
    it('should return the correct object', () => {
      const base = {
        ok: true,
      };
      const expected = {
        ok: true,
        maxHeight: '112px',
        paddingTop: 2,
      };

      expect(styles.menuList(base)).toEqual(expected);
    });
  });

  describe('option', () => {
    it('should return the correct object when it is selected', () => {
      const base = {
        ok: true,
        backgroundColor: 'black',
      };
      const state = {
        isSelected: true,
      };
      const expected = {
        ok: true,
        height: 36,
        backgroundColor: '#fff',
        color: '#007eff',
        fontWeight: '600',
      };

      expect(styles.option(base, state)).toEqual(expected);
    });

    it('should return the correct object when it is not selected', () => {
      const base = {
        ok: true,
        backgroundColor: 'black',
      };
      const state = {
        isSelected: false,
      };
      const expected = {
        ok: true,
        height: 36,
        backgroundColor: 'black',
        color: '#333740',
        fontWeight: '400',
      };

      expect(styles.option(base, state)).toEqual(expected);
    });
  });

  describe('placeholder', () => {
    it('should return the correct object', () => {
      const base = {
        ok: true,
      };
      const expected = {
        ok: true,
        marginTop: 0,
        marginLeft: 8,
        color: '#aaa',
      };

      expect(styles.placeholder(base)).toEqual(expected);
    });
  });

  describe('valueContainer', () => {
    it('should return the correct object', () => {
      const base = {
        ok: true,
      };
      const expected = {
        ok: true,
        padding: '2px 4px 4px 4px',
        lineHeight: '18px',
      };

      expect(styles.valueContainer(base)).toEqual(expected);
    });
  });
});
