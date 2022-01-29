const Delta = require('./dist/Delta').default;

const a1 = new Delta().retain(1, { color: 'blue' });
const b1 = new Delta().retain(1, { bold: true, color: 'red' });
console.log(JSON.stringify(b1.transform(a1, true)));
