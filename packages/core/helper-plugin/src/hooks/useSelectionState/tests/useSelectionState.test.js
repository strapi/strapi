import { renderHook, act } from '@testing-library/react-hooks';

import { useSelectionState } from '../index';

const FIXTURE = [
  {
    id: 1,
    name: 'name 1',
  },

  {
    id: 2,
    name: 'name 2',
  },
];

function setup(...args) {
  return renderHook(() => useSelectionState(...args));
}

describe('useSelectionState', () => {
  test('initial state', () => {
    const {
      result: { current },
    } = setup(['id'], FIXTURE);
    const [selection] = current;

    expect(selection).toStrictEqual(FIXTURE);
  });

  test('selectOne', async () => {
    const { result } = setup(['id'], []);

    act(() => {
      result.current[1].selectOne(FIXTURE[0]);
    });

    expect(result.current[0]).toStrictEqual([FIXTURE[0]]);

    act(() => {
      result.current[1].selectOne(FIXTURE[1]);
    });

    expect(result.current[0]).toStrictEqual(FIXTURE);
  });

  test('selectOne - multiple keys', async () => {
    const { result } = setup(['id', 'name'], []);

    act(() => {
      result.current[1].selectOne(FIXTURE[0]);
    });

    expect(result.current[0]).toStrictEqual([FIXTURE[0]]);

    act(() => {
      result.current[1].selectOne(FIXTURE[1]);
    });

    expect(result.current[0]).toStrictEqual(FIXTURE);
  });

  test('selectOne - reset', async () => {
    const { result } = setup(['id'], []);

    act(() => {
      result.current[1].selectOne(null);
    });

    expect(result.current[0]).toStrictEqual([null]);
  });

  test('selectAll', () => {
    const { result } = setup(['id'], []);

    act(() => {
      result.current[1].selectAll(FIXTURE);
    });

    expect(result.current[0]).toStrictEqual(FIXTURE);
  });

  test('selectAll - multiple keys', () => {
    const { result } = setup(['id', 'name'], []);

    act(() => {
      result.current[1].selectAll(FIXTURE);
    });

    expect(result.current[0]).toStrictEqual(FIXTURE);
  });

  test('selectAll - reset', () => {
    const { result } = setup(['id'], []);

    act(() => {
      result.current[1].selectAll([]);
    });

    expect(result.current[0]).toStrictEqual([]);
  });

  test('selectOnly', () => {
    const { result } = setup(['id'], []);

    act(() => {
      result.current[1].selectOne(null);
    });

    act(() => {
      result.current[1].selectOnly(FIXTURE[0]);
    });

    expect(result.current[0]).toStrictEqual([FIXTURE[0]]);
  });

  test('selectOnly - multiple keys', () => {
    const { result } = setup(['id', 'name'], []);

    act(() => {
      result.current[1].selectOne(null);
    });

    act(() => {
      result.current[1].selectOnly(FIXTURE[0]);
    });

    expect(result.current[0]).toStrictEqual([FIXTURE[0]]);
  });
});
