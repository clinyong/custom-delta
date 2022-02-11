var Delta = require('../../dist/CustomDelta').default;

describe('transformPosition()', () => {
  it('insert before position', () => {
    const delta = new Delta().insert('A');
    expect(delta.transform(2)).toEqual(3);
  });

  it('insert after position', () => {
    const delta = new Delta().retain(2).insert('A');
    expect(delta.transform(1)).toEqual(1);
  });

  it('insert at position', () => {
    const delta = new Delta().retain(2).insert('A');
    expect(delta.transform(2, true)).toEqual(2);
    expect(delta.transform(2, false)).toEqual(3);
  });
});
