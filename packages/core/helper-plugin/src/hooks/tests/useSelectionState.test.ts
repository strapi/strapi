import { act, renderHook } from '@tests/utils';

import { useSelectionState } from '../useSelectionState';

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

function setup(
  keys: Array<keyof (typeof FIXTURE)[number]>,
  initialValue: Array<(typeof FIXTURE)[number]>
) {
  return renderHook(() => useSelectionState(keys, initialValue));
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

  test('selectOne deselect', async () => {
    const { result } = setup(['id'], FIXTURE);

    act(() => {
      result.current[1].selectOne(FIXTURE[0]);
    });

    expect(result.current[0]).toStrictEqual([FIXTURE[1]]);

    act(() => {
      result.current[1].selectOne(FIXTURE[1]);
    });

    expect(result.current[0]).toStrictEqual([]);
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
      result.current[1].selectOnly(FIXTURE[0]);
    });

    expect(result.current[0]).toStrictEqual([FIXTURE[0]]);
  });

  test('selectOnly - multiple keys', () => {
    const { result } = setup(['id', 'name'], []);

    act(() => {
      result.current[1].selectOnly(FIXTURE[0]);
    });

    expect(result.current[0]).toStrictEqual([FIXTURE[0]]);
  });

  test('selectMultiple - no previously selected + multiple keys', () => {
    const { result } = setup(['id', 'name'], []);

    act(() => {
      result.current[1].selectMultiple(FIXTURE);
    });

    expect(result.current[0]).toStrictEqual(FIXTURE);
  });

  test('selectMultiple - already selected item + multiple keys', () => {
    const alreadySelectedItem = { id: 0, name: 'already selected' };
    const { result } = setup(['id', 'name'], [alreadySelectedItem]);

    act(() => {
      result.current[1].selectMultiple(FIXTURE);
    });

    expect(result.current[0]).toStrictEqual([alreadySelectedItem, ...FIXTURE]);
  });

  test('selectMultiple - no duplicates + multiple keys', () => {
    const { result } = setup(['id', 'name'], FIXTURE);

    act(() => {
      result.current[1].selectMultiple(FIXTURE);
    });

    expect(result.current[0]).toStrictEqual(FIXTURE);
  });

  test('deselectMultiple - multiple keys', () => {
    const { result } = setup(['id', 'name'], FIXTURE);

    act(() => {
      result.current[1].deselectMultiple(FIXTURE);
    });

    expect(result.current[0]).toStrictEqual([]);
  });

  test('deselectMultiple - some items to deselect + multiple keys', () => {
    const { result } = setup(['id', 'name'], FIXTURE);

    act(() => {
      result.current[1].deselectMultiple([FIXTURE[0]]);
    });

    expect(result.current[0]).toStrictEqual([FIXTURE[1]]);
  });
});
