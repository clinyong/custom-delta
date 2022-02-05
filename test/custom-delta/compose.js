var Delta = require('../../dist/CustomDelta').default;

describe('compose()', () => {
  it('insert + insert', () => {
    const a = new Delta().insert('A');
    const b = new Delta().insert('B');
    const expected = new Delta().insert('B').insert('A');
    expect(a.compose(b)).toEqual(expected);
  });

  it('insert + retain', () => {
    const a = new Delta().insert('A');
    const b = new Delta().retain(1, { bold: true, color: 'red', font: null });
    const expected = new Delta().insert('A', { bold: true, color: 'red' });
    expect(a.compose(b)).toEqual(expected);
  });

  it('insert + delete', () => {
    const a = new Delta().insert('A');
    const b = new Delta().delete(1);
    const expected = new Delta();
    expect(a.compose(b)).toEqual(expected);
  });

  it('delete + insert', () => {
    const a = new Delta().delete(1);
    const b = new Delta().insert('B');
    const expected = new Delta().insert('B').delete(1);
    expect(a.compose(b)).toEqual(expected);
  });

  it('delete + retain', () => {
    const a = new Delta().delete(1);
    const b = new Delta().retain(1, { bold: true, color: 'red' });
    const expected = new Delta()
      .delete(1)
      .retain(1, { bold: true, color: 'red' });
    expect(a.compose(b)).toEqual(expected);
  });
});
