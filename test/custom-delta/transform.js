var Delta = require('../../dist/CustomDelta').default;

describe('transform()', () => {
  it('insert + insert', () => {
    const a1 = new Delta().insert('A');
    const b1 = new Delta().insert('B');
    const a2 = new Delta(a1);
    const b2 = new Delta(b1);
    const expected1 = new Delta().retain(1).insert('B');
    const expected2 = new Delta().insert('B');
    expect(a1.transform(b1, true)).toEqual(expected1);
	expect(a2.transform(b2, false)).toEqual(expected2);
  });
});
