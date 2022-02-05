import isEqual from 'lodash.isequal';
import AttributeMap from './AttributeMap';
import Op from './Op';
import OpIterator from './OpIterator';

// 当两个操作都是 retain 并且都有 attributes 时，需要对 attributes 做下 transform
// 假设 A 为 retain(1, { color: 'blue' })
// B 为 retain(1, { bold: true, color: 'red' })
// A.transform(B, true)， B 中的属性值只有当没有在 A 当中才会被添加
// A.transform(B, false)，B 的所有属性都会被返回
// B.transform(A, true)，没有任何属性返回，A 的 retain 最终会被舍弃
// B.transform(A, false)，A 的所有属性都会被返回
function transformAttributes(
  thisAttributes: AttributeMap | undefined,
  otherAttributes: AttributeMap | undefined,
  priority: boolean | undefined,
): AttributeMap | undefined {
  if (thisAttributes && otherAttributes) {
    if (priority) {
      const finalAttributes: AttributeMap = {};
      for (const key in otherAttributes) {
        if (!thisAttributes[key]) {
          finalAttributes[key] = otherAttributes[key];
        }
      }

      return Object.keys(finalAttributes).length > 0
        ? finalAttributes
        : undefined;
    } else {
      return otherAttributes;
    }
  } else if (otherAttributes) {
    return otherAttributes;
  }

  return undefined;
}

function filterNullAttributes(
  attributes?: AttributeMap,
): AttributeMap | undefined {
  if (attributes) {
    const newAttribMap = Object.keys(attributes).reduce((obj, k) => {
      const val = attributes[k];
      if (val != null) {
        obj[k] = val;
      }
      return obj;
    }, {} as AttributeMap);
    if (Object.keys(newAttribMap).length > 0) {
      return newAttribMap;
    }
  }

  return undefined;
}

function dropBoth(thisIter: OpIterator, otherIter: OpIterator) {
  const length = Math.min(thisIter.peekLength(), otherIter.peekLength());
  thisIter.next(length);
  otherIter.next(length);
}

function getNextOp(thisIter: OpIterator, otherIter: OpIterator) {
  const length = Math.min(thisIter.peekLength(), otherIter.peekLength());
  const thisOp = thisIter.next(length);
  const otherOp = otherIter.next(length);

  return {
    thisOp,
    otherOp,
  };
}

function keepOtherDropThis(thisIter: OpIterator, otherIter: OpIterator) {
  const length = Math.min(thisIter.peekLength(), otherIter.peekLength());
  thisIter.next(length);
  return otherIter.next(length);
}

function insertOtherFirst(thisIter: OpIterator, otherIter: OpIterator) {
  const { thisOp, otherOp } = getNextOp(thisIter, otherIter);
  return [];
}

function consumeLeft(thisIter: OpIterator, onNext?: (op: Op) => void) {
  while (thisIter.hasNext()) {
    if (onNext) {
      onNext(thisIter.next());
    } else {
      thisIter.next();
    }
  }
}

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

  push(newOp: Op): this {
    let pushIndex = this.ops.length;
    let beforeOp = this.ops[pushIndex - 1];

    if (!!beforeOp) {
      // 合并连续的删除
      if (
        typeof beforeOp.delete === 'number' &&
        typeof newOp.delete === 'number'
      ) {
        this.ops[pushIndex - 1] = {
          delete: beforeOp.delete + newOp.delete,
        };
        return this;
      }

      // 对于先删除一个字符再插入，和先插入一个字符再删除，这两种情况最终的文档内容都是一样的。
      // 对于这两种情况我们都保证先 insert 再 delete
      // 也就是对于 new Delta().delete(1).insert('a') 和 new Delta().insert('a').delete(1)
      // 结果都是 new Delta().insert('a').delete(1)
      if (
        typeof beforeOp.delete === 'number' &&
        typeof newOp.insert === 'string'
      ) {
        pushIndex = pushIndex - 1;
        beforeOp = this.ops[pushIndex - 1];
      }

      // 合并两个连续的 insert 或者 retain
      if (beforeOp && isEqual(beforeOp.attributes, newOp.attributes)) {
        if (
          typeof beforeOp.insert === 'string' &&
          typeof newOp.insert === 'string'
        ) {
          const mergeOp: Op = {
            insert: beforeOp.insert + newOp.insert,
          };
          if (newOp.attributes) {
            mergeOp.attributes = newOp.attributes;
          }
          this.ops[pushIndex - 1] = mergeOp;
          return this;
        } else if (
          typeof beforeOp.retain === 'number' &&
          typeof newOp.retain === 'number'
        ) {
          const mergeOp: Op = {
            retain: beforeOp.retain + newOp.retain,
          };
          if (newOp.attributes) {
            mergeOp.attributes = newOp.attributes;
          }
          this.ops[pushIndex - 1] = mergeOp;
          return this;
        }
      }
    }

    if (pushIndex === this.ops.length) {
      this.ops.push(newOp);
    } else {
      this.ops.splice(pushIndex, 0, newOp);
    }
    return this;
  }

  insert(arg: string, attribs?: AttributeMap): this {
    if (typeof arg === 'string' && arg.length === 0) return this;
    const op: Op = {
      insert: arg,
    };
    if (attribs && Object.keys(attribs).length > 0) {
      op.attributes = attribs;
    }
    return this.push(op);
  }

  retain(length: number, attribs?: AttributeMap): this {
    if (length <= 0) return this;
    const op: Op = {
      retain: length,
    };
    if (attribs && Object.keys(attribs).length > 0) {
      op.attributes = attribs;
    }

    return this.push(op);
  }

  delete(length: number): this {
    if (length <= 0) return this;
    return this.push({ delete: length });
  }

  chop(): this {
    const lastOp = this.ops[this.ops.length - 1];
    if (lastOp && lastOp.retain && !lastOp.attributes) {
      this.ops.pop();
    }
    return this;
  }

  compose(other: Delta): Delta {
    const thisIter = new OpIterator(this.ops);
    const otherIter = new OpIterator(other.ops);
    const delta = new Delta();

    while (thisIter.hasNext() || otherIter.hasNext()) {
      const composeCase = `${thisIter.peekType()} + ${otherIter.peekType()}`;
      switch (composeCase) {
        case 'insert + insert':
          delta.push(otherIter.next());
          delta.push(thisIter.next());
          break;
        case 'insert + retain':
          (() => {
            const { thisOp, otherOp } = getNextOp(thisIter, otherIter);
            const newOp: Op = {
              insert: thisOp.insert,
              attributes: filterNullAttributes(otherOp.attributes),
            };
            delta.push(newOp);
          })();
          break;
        case 'insert + delete':
          (() => {
            dropBoth(thisIter, otherIter);
          })();
        case 'delete + insert':
          (() => {
            const { thisOp, otherOp } = getNextOp(thisIter, otherIter);
            delta.push(otherOp);
            delta.push(thisOp);
          })();
          break;
        default:
          break;
      }
    }

    return delta.chop();
  }

  transform(other: Delta, priority?: boolean): Delta {
    const thisIter = new OpIterator(this.ops);
    const otherIter = new OpIterator(other.ops);

    const delta = new Delta();

    while (thisIter.hasNext() || otherIter.hasNext()) {
      const transformCase = `${thisIter.peekType()} + ${otherIter.peekType()}`;
      switch (transformCase) {
        case 'insert + insert':
          if (priority) {
            // 假设 A 插入一个字符 a，B 插入一个字符 b
            // A.transform(B, true)，第二个参数传 true 就是说当 A 和 B 冲突的时候，以谁为主，而 true 就是说以 A 为主
            // 最后文档内容为 ab，就是 A 插入的这个字符会在 B 前面
            // 表现出来的 delta 就是先 retain 一个字符（移动过字符 a），再 insert 一个 b
            delta.retain(Op.length(thisIter.next()));
          } else {
            // 假设 A 插入一个字符 a，B 插入一个字符 b
            // A.transform(B, false)，第二个参数传 false 就是说当 A 和 B 冲突的时候，以谁为主，而 false 就是说以 B 为主
            // 这时候文档的内容为 ba，就是 B 插入的这个字符会在 A 前面
            // 所以表现出来最终的 delta 就是只插入一个 b 的字符
            delta.push(otherIter.next());
          }
          break;
        case 'insert + retain':
          // 假设 A 插入一个字符 a，B retain 一个字符
          // 这时候 priority 不管传什么都是先 retain 一个字符，再 retain B
          // 下面解释下为什么是这样一个结果
          // 假设现在的文档内容是 b
          // A 插入一个字符 a，说明这个字符是插在 b 前面的，也就是变成了 ab。（如果是插在 b 后面，会先 retain 一个字符）
          // B 是 retain 一个字符，也就是 retain 原先的字符 b
          // 所以当 A.transform(B)，就是代表着 B 这个 delta 来到了 A 这边之后要怎么应用上去
          // 而此时 A 的文档内容为 ab，如果 B 要应用上面的话，就应该变成先 retain 一个字符，再 retain B 原先的操作
          delta.retain(Op.length(thisIter.next()));
          break;
        case 'insert + delete':
          // 这个场景等同于 insert + retain
          delta.retain(Op.length(thisIter.next()));
          break;
        case 'delete + insert':
          // 这个场景其实也类似 insert + retain
          // 假设 A delete 一个字符，B insert 一个字符 b
          // 这时候 priority 不管传什么都是 insert 一个 b
          // 下面解释下为什么是这样一个结果
          // 假设现在的文档内容是 a
          // A delete 一个字符就是删除了 a
          // B insert 一个字符 b，也就是在 a 前面插入一个 b，变成 ba
          // 所以当 A.transform(B)，就是代表着 B 这个 delta 来到了 A 这边之后要怎么应用上去
          // 而此时 A 的文档内容为空，要应用上 B，直接 insert b 就可以
          delta.push(otherIter.next());
          break;
        case 'delete + retain':
          // 类似于 delete + insert
          // 因为 B retain 的这个字符已经被 A 删掉了，所以整个 Delta 就是为空
          dropBoth(thisIter, otherIter);
          break;
        case 'delete + delete':
          // 类似于 delete + retain
          // 这种情况下 A 和 B 是删除同一个字符，为了避免删除两次，应该要舍弃掉 B 这一次的删除。所以最终的 Delta 为空。
          dropBoth(thisIter, otherIter);
          break;
        case 'retain + insert':
          // 类似于 delete + insert 的场景
          // 假设 A retain 一个字符，B insert 一个字符 b
          // 这时候 priority 不管传什么都是 insert 一个 b
          // 下面解释下为什么是这样一个结果
          // 假设现在的文档内容是 a
          // A retain 一个字符就是 retain a
          // B insert 一个字符 b，也就是在 a 前面插入一个 b，变成 ba
          // 所以当 A.transform(B)，就是代表着 B 这个 delta 来到了 A 这边之后要怎么应用上去
          // 而此时 A 的文档内容为 a，要应用上 B，直接 insert b 就可以
          delta.push(otherIter.next());
          break;
        case 'retain + retain':
          const { thisOp, otherOp } = getNextOp(thisIter, otherIter);
          const thisAttributes = thisOp.attributes;
          const otherAttributes = otherOp.attributes;

          const finalAttributes: AttributeMap | undefined = transformAttributes(
            thisAttributes,
            otherAttributes,
            priority,
          );
          // Delta 的实现，只有当 transform 之后还有 attributes 的时候才 retain
          delta.retain(Op.length(otherOp), finalAttributes);
          break;
        case 'retain + delete':
          // 类似于 retain + insert 的场景
          delta.push(keepOtherDropThis(thisIter, otherIter));
          break;
        default:
          // 这个条件永远不会进来
          // 因为按照原先的逻辑，如果某一个 iterator 的 ops 已经用完了，当 next 之后，如果没有值，会默认返回 retain
          if (thisIter.hasNext()) {
            consumeLeft(thisIter);
          } else if (otherIter.hasNext()) {
            consumeLeft(otherIter, (op) => delta.push(op));
          } else {
            throw new Error(
              `Unable to handle ${thisIter.peekType()} + ${otherIter.peekType()}`,
            );
          }
          break;
      }
    }

    return delta.chop();
  }
}
