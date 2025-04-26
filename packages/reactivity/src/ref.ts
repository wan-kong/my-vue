import { activeSub } from './effect';
import { Link, propagate, link, Sub, Dependency } from './system';

enum ReactiveFlags {
  IS_REF = '__v_isRef',
}

class RefImpl<T> implements Dependency {
  _value;

  [ReactiveFlags.IS_REF]: true;

  /**
   * 订阅者链表的头节点
   */
  subs: Link;
  /**
   * 订阅者链表的尾节点
   */
  subsTail: Link;

  constructor(value: T) {
    this._value = value;
  }
  get value() {
    // 收集依赖
    trackRef(this, activeSub);
    return this._value;
  }
  set value(newValue) {
    this._value = newValue;
    triggerRef(this);
  }
}

/**
 * 依赖收集
 * @param dep
 */
export function trackRef(dep: Dependency, sub: Sub) {
  if (sub) {
    link(dep, sub);
  }
}

/**
 * 触发依赖更新
 * @param dep
 */
export function triggerRef(dep: Dependency) {
  if (dep.subs) {
    propagate(dep.subs);
  }
}

export function ref<T>(value: T) {
  return new RefImpl(value);
}
