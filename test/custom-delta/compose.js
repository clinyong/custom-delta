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

  it('delete + delete', () => {
    const a = new Delta().delete(1);
    const b = new Delta().delete(1);
    const expected = new Delta().delete(2);
    expect(a.compose(b)).toEqual(expected);
  });

  it('retain + insert', () => {
    const a = new Delta().retain(1, { color: 'blue' });
    const b = new Delta().insert('B');
    const expected = new Delta().insert('B').retain(1, { color: 'blue' });
    expect(a.compose(b)).toEqual(expected);
  });

  it('retain + retain', () => {
    const a = new Delta().retain(1, { color: 'blue' });
    const b = new Delta().retain(1, { bold: true, color: 'red', font: null });
    const expected = new Delta().retain(1, {
      bold: true,
      color: 'red',
      font: null,
    });
    expect(a.compose(b)).toEqual(expected);
  });

  it('retain + delete', () => {
    const a = new Delta().retain(1, { color: 'blue' });
    const b = new Delta().delete(1);
    const expected = new Delta().delete(1);
    expect(a.compose(b)).toEqual(expected);
  });

  it('insert in middle of text', () => {
    const a = new Delta().insert('Hello');
    const b = new Delta().retain(3).insert('X');
    const expected = new Delta().insert('HelXlo');
    expect(a.compose(b)).toEqual(expected);
  });

  it('insert and delete ordering', () => {
    const a = new Delta().insert('Hello');
    const b = new Delta().insert('Hello');
    const insertFirst = new Delta().retain(3).insert('X').delete(1);
    const deleteFirst = new Delta().retain(3).delete(1).insert('X');
    const expected = new Delta().insert('HelXo');
    expect(a.compose(insertFirst)).toEqual(expected);
    expect(b.compose(deleteFirst)).toEqual(expected);
  });

  it('insert embed', () => {
    const a = new Delta().insert(1, { src: 'http://quilljs.com/image.png' });
    const b = new Delta().retain(1, { alt: 'logo' });
    const expected = new Delta().insert(1, {
      src: 'http://quilljs.com/image.png',
      alt: 'logo',
    });
    expect(a.compose(b)).toEqual(expected);
  });

  it('delete entire text', () => {
    const a = new Delta().retain(4).insert('Hello');
    const b = new Delta().delete(9);
    const expected = new Delta().delete(4);
    expect(a.compose(b)).toEqual(expected);
  });

  it('retain more than length of text', () => {
    const a = new Delta().insert('Hello');
    const b = new Delta().retain(10);
    const expected = new Delta().insert('Hello');
    expect(a.compose(b)).toEqual(expected);
  });

  it('retain empty embed', () => {
    const a = new Delta().insert(1);
    const b = new Delta().retain(1);
    const expected = new Delta().insert(1);
    expect(a.compose(b)).toEqual(expected);
  });
});
