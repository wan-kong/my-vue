// 保存当前正在执行的effct

import { endTracker, Link, startTracker, Sub } from './system';

export let activeSub: Sub;

export class ReactiveEffect implements Sub {
  /**
   * 依赖项链表
   */
  deps: Link | undefined;
  depsTail: Link | undefined;
  /**
   * 当前是否正在收集依赖?
   * 防止
   * effect(()=>{
   *  console.log(count.value++)
   * })
   * 这种死循环
   */
  tracking: boolean;

  constructor(public fn) {}

  run() {
    const preSub = activeSub;
    activeSub = this;
    startTracker(this);
    try {
      return this.fn();
    } finally {
      endTracker(this);
      activeSub = preSub;
    }
  }
  /**
   * 通知更新
   */
  notify() {
    this.schedular();
  }

  /**
   * 默认调用run，如果传入了schedular，则会被覆盖为传入的schedular
   */
  schedular() {
    this.run();
  }
}

/**
 *
 * @param {Function} fn
 * @param {Object} options
 * @param {Function} options.schedular
 * @returns
 */
export function effect(
  fn: Function,
  options: {
    schedular?: Function;
  },
) {
  const e = new ReactiveEffect(fn);
  Object.assign(e, options);
  e.run();
  const runner = () => e.run();
  runner.effect = e;
  return runner;
}
