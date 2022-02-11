var Delta = require('../../dist/CustomDelta').default;

describe('transformPosition()', () => {
  it('insert before position', () => {
    const delta = new Delta().insert('A');
    expect(delta.transform(2)).toEqual(3);
  });
});
