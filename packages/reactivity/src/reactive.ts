import { isObject } from '@my-vue/shared';
import { Dependency, link, Link, propagate } from './system';
import { activeSub } from './effect';

export function reactive(target: Object) {
  return createReactiveObject(target);
}

function createReactiveObject<T extends Object>(target: T) {
  if (!isObject(target)) {
    throw new Error('you should set a object to reactive');
  }

  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      // 收集依赖
      track(target, key);
      return Reflect.get(target, key);
    },
    set(target, key, newValue, receiver) {
      // 触发更新
      //   先更新赋值
      const res = Reflect.set(target, key, newValue);
      //   触发更新函数
      trigger(target, key);
      return res;
    },
  });

  return proxy;
}

const targetMap = new WeakMap<Object, Map<keyof Object, Dep>>();

function track(target, key) {
  if (!activeSub) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }
  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Dep();
    depsMap.set(key, dep);
  }
  link(dep, activeSub);
}

function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const deps = depsMap.get(key);
  if (!deps) return;
  propagate(deps.subs);
}

class Dep implements Dependency {
  subs: Link;
  subsTail: Link;
}
