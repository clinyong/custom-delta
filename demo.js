const Delta = require('./dist/Delta').default;

const delta = new Delta().insert('a').delete(1).insert('b');
console.log(delta)
