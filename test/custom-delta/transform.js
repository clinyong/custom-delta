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

  it('insert + retain', () => {
    const a = new Delta().insert('A');
    const b = new Delta().retain(1, { bold: true, color: 'red' });
    const expected = new Delta()
      .retain(1)
      .retain(1, { bold: true, color: 'red' });
    expect(a.transform(b, true)).toEqual(expected);
  });

  it('insert + delete', () => {
    const a = new Delta().insert('A');
    const b = new Delta().delete(1);
    const expected = new Delta().retain(1).delete(1);
    expect(a.transform(b, true)).toEqual(expected);
  });

  it('delete + insert', () => {
    const a = new Delta().delete(1);
    const b = new Delta().insert('B');
    const expected = new Delta().insert('B');
    expect(a.transform(b, true)).toEqual(expected);
  });
});
