var Delta = require('../../dist/CustomDelta').default;

describe('constructor', () => {
  const ops = [
    { insert: 'abc' },
    { retain: 1, attributes: { color: 'red' } },
    { delete: 4 },
    { insert: 'def', attributes: { bold: true } },
    { retain: 6 },
  ];

  it('empty', function () {
    const delta = new Delta();
    expect(delta).toBeDefined();
    expect(delta.ops).toBeDefined();
    expect(delta.ops.length).toEqual(0);
  });

  it('empty ops', function () {
    const delta = new Delta().insert('').delete(0).retain(0);
    expect(delta).toBeDefined();
    expect(delta.ops).toBeDefined();
    expect(delta.ops.length).toEqual(0);
  });

  it('array of ops', function () {
    const delta = new Delta(ops);
    expect(delta.ops).toEqual(ops);
  });

  it('delta in object form', function () {
    const delta = new Delta({ ops: ops });
    expect(delta.ops).toEqual(ops);
  });

  it('delta', function () {
    const original = new Delta(ops);
    const delta = new Delta(original);
    expect(delta.ops).toEqual(original.ops);
    expect(delta.ops).toEqual(ops);
  });
});

describe('insert()', function () {
  it('insert(text)', function () {
    const delta = new Delta().insert('test');
    expect(delta.ops.length).toEqual(1);
    expect(delta.ops[0]).toEqual({ insert: 'test' });
  });

  it('insert(text, null)', function () {
    const delta = new Delta().insert('test', null);
    expect(delta.ops.length).toEqual(1);
    expect(delta.ops[0]).toEqual({ insert: 'test' });
  });

  it('insert(embed)', function () {
    const delta = new Delta().insert(1);
    expect(delta.ops.length).toEqual(1);
    expect(delta.ops[0]).toEqual({ insert: 1 });
  });

  it('insert(embed, attributes)', function () {
    const obj = { url: 'http://quilljs.com', alt: 'Quill' };
    const delta = new Delta().insert(1, obj);
    expect(delta.ops.length).toEqual(1);
    expect(delta.ops[0]).toEqual({ insert: 1, attributes: obj });
  });

  it('insert(embed) non-integer', function () {
    const embed = { url: 'http://quilljs.com' };
    const attr = { alt: 'Quill' };
    const delta = new Delta().insert(embed, attr);
    expect(delta.ops.length).toEqual(1);
    expect(delta.ops[0]).toEqual({ insert: embed, attributes: attr });
  });

  it('insert(text, attributes)', function () {
    const delta = new Delta().insert('test', { bold: true });
    expect(delta.ops.length).toEqual(1);
    expect(delta.ops[0]).toEqual({
      insert: 'test',
      attributes: { bold: true },
    });
  });

  it('insert(text) after delete', function () {
    const delta = new Delta().delete(1).insert('a');
    const expected = new Delta().insert('a').delete(1);
    expect(delta).toEqual(expected);
  });

  it('insert(text) after delete with merge', function () {
    const delta = new Delta().insert('a').delete(1).insert('b');
    const expected = new Delta().insert('ab').delete(1);
    expect(delta).toEqual(expected);
  });

  it('insert(text) after delete no merge', function () {
    const delta = new Delta().insert(1).delete(1).insert('a');
    const expected = new Delta().insert(1).insert('a').delete(1);
    expect(delta).toEqual(expected);
  });

  it('insert(text) after delete no merge', function () {
    const delta = new Delta().insert(1).delete(1).insert('a');
    const expected = new Delta().insert(1).insert('a').delete(1);
    expect(delta).toEqual(expected);
  });

  it('insert(text, {})', function () {
    const delta = new Delta().insert('a', {});
    const expected = new Delta().insert('a');
    expect(delta).toEqual(expected);
  });
});

describe('delete()', function () {
  it('delete(0)', function () {
    const delta = new Delta().delete(0);
    expect(delta.ops.length).toEqual(0);
  });

  it('delete(positive)', function () {
    const delta = new Delta().delete(1);
    expect(delta.ops.length).toEqual(1);
    expect(delta.ops[0]).toEqual({ delete: 1 });
  });
});
