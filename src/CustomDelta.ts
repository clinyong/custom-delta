import AttributeMap from './AttributeMap';
import Op from './Op';
import OpIterator from './OpIterator';

export default class Delta {
  ops: Op[];

  constructor(ops?: Op[] | { ops: Op[] }) {
    if (Array.isArray(ops)) {
      this.ops = ops;
    } else if (ops != null && Array.isArray(ops.ops)) {
      this.ops = ops.ops;
    } else {
      this.ops = [];
    }
  }

  private _push(op: Op): this {
    this.ops.push(op);
    return this;
  }

  insert(arg: string): this {
    if (typeof arg === 'string' && arg.length === 0) return this;
    const op: Op = {
      insert: arg,
    };
    return this._push(op);
  }

  retain(length: number, attribs?: AttributeMap): this {
    if (length <= 0) return this;
    const op: Op = {
      retain: length,
    };
    if (attribs) {
      op.attributes = attribs;
    }

    return this._push(op);
  }

  transform(other: Delta, priority?: boolean): Delta {
    const thisIter = new OpIterator(this.ops);
    const otherIter = new OpIterator(other.ops);

    const delta = new Delta();

    while (thisIter.hasNext() || otherIter.hasNext()) {
      if (
        thisIter.peekType() === 'insert' &&
        otherIter.peekType() === 'insert'
      ) {
        if (priority) {
          // 假设 A 插入一个字符 a，B 插入一个字符 b
          // A.transform(B, true)，第二个参数传 true 就是说当 A 和 B 冲突的时候，以谁为主，而 true 就是说以 A 为主
          // 最后文档内容为 ab，就是 A 插入的这个字符会在 B 前面
          // 表现出来的 delta 就是先 retain 一个字符（移动过字符 a），再 insert 一个 b
          delta.retain(Op.length(thisIter.next()))._push(otherIter.next());
        } else {
          // 假设 A 插入一个字符 a，B 插入一个字符 b
          // A.transform(B, false)，第二个参数传 false 就是说当 A 和 B 冲突的时候，以谁为主，而 false 就是说以 B 为主
          // 这时候文档的内容为 ba，就是 B 插入的这个字符会在 A 前面
          // 所以表现出来最终的 delta 就是只插入一个 b 的字符
          thisIter.next();
          delta._push(otherIter.next());
        }
      }
    }

    return delta;
  }
}
