// packages/reactivity/src/system.ts
var linkPool;
function link(dep, sub) {
  const currentDep = sub.depsTail;
  const nextDep = currentDep === void 0 ? sub.deps : sub.depsTail.nextDep;
  if (nextDep && nextDep.dep === dep) {
    sub.depsTail = nextDep;
    return;
  }
  let newLink;
  if (linkPool) {
    newLink = linkPool;
    linkPool = linkPool.nextDep;
    newLink.nextDep = nextDep;
    newLink.dep = dep;
    newLink.sub = sub;
  } else {
    newLink = {
      sub,
      preSub: void 0,
      nextSub: void 0,
      dep,
      nextDep
    };
  }
  if (dep.subsTail) {
    dep.subsTail.nextSub = newLink;
    newLink.preSub = dep.subsTail;
    dep.subsTail = newLink;
  } else {
    dep.subs = newLink;
    dep.subsTail = newLink;
  }
  if (sub.depsTail) {
    sub.depsTail.nextDep = newLink;
    sub.depsTail = newLink;
  } else {
    sub.deps = newLink;
    sub.depsTail = newLink;
  }
}
function propagate(subs) {
  let link2 = subs;
  const queuedEffect = [];
  while (link2) {
    const sub = link2.sub;
    if (!sub.tracking) {
      queuedEffect.push(sub);
    }
    link2 = link2.nextSub;
  }
  queuedEffect.forEach((effect2) => effect2.notify());
}
function startTracker(sub) {
  sub.tracking = true;
  sub.depsTail = void 0;
}
function endTracker(sub) {
  sub.tracking = false;
  const depsTail = sub.depsTail;
  if (depsTail) {
    if (depsTail.nextDep) {
      clearTracking(depsTail.nextDep);
      depsTail.nextDep = void 0;
    }
  } else if (sub.deps) {
    clearTracking(sub.deps);
    sub.deps = void 0;
  }
}
function clearTracking(link2) {
  while (link2) {
    const { preSub, nextDep, nextSub, dep } = link2;
    if (preSub) {
      preSub.nextSub = nextSub;
      link2.nextSub = void 0;
    } else {
      dep.subs = nextSub;
    }
    if (nextSub) {
      nextSub.preSub = preSub;
      link2.preSub = void 0;
    } else {
      dep.subsTail = preSub;
    }
    link2.dep = link2.sub = void 0;
    link2.nextDep = linkPool;
    linkPool = link2;
    link2 = nextDep;
  }
}

// packages/reactivity/src/effect.ts
var activeSub;
var ReactiveEffect = class {
  constructor(fn) {
    this.fn = fn;
  }
  /**
   * 依赖项链表
   */
  deps;
  depsTail;
  /**
   * 当前是否正在收集依赖?
   * 防止
   * effect(()=>{
   *  console.log(count.value++)
   * })
   * 这种死循环
   */
  tracking;
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
};
function effect(fn, options) {
  const e = new ReactiveEffect(fn);
  Object.assign(e, options);
  e.run();
  const runner = () => e.run();
  runner.effect = e;
  return runner;
}

// packages/reactivity/src/ref.ts
var RefImpl = class {
  _value;
  ["__v_isRef" /* IS_REF */];
  /**
   * 订阅者链表的头节点
   */
  subs;
  /**
   * 订阅者链表的尾节点
   */
  subsTail;
  constructor(value) {
    this._value = value;
  }
  get value() {
    trackRef(this, activeSub);
    return this._value;
  }
  set value(newValue) {
    this._value = newValue;
    triggerRef(this);
  }
};
function trackRef(dep, sub) {
  if (sub) {
    link(dep, sub);
  }
}
function triggerRef(dep) {
  if (dep.subs) {
    propagate(dep.subs);
  }
}
function ref(value) {
  return new RefImpl(value);
}

// packages/shared/src/index.ts
var isObject = (obj) => {
  return typeof obj === "object" && obj !== null;
};

// packages/reactivity/src/reactive.ts
function reactive(target) {
  return createReactiveObject(target);
}
function createReactiveObject(target) {
  if (!isObject(target)) {
    throw new Error("you should set a object to reactive");
  }
  const proxy = new Proxy(target, {
    get(target2, key, receiver) {
      track(target2, key);
      return Reflect.get(target2, key);
    },
    set(target2, key, newValue, receiver) {
      const res = Reflect.set(target2, key, newValue);
      trigger(target2, key);
      return res;
    }
  });
  return proxy;
}
var targetMap = /* @__PURE__ */ new WeakMap();
function track(target, key) {
  if (!activeSub) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = /* @__PURE__ */ new Map();
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
var Dep = class {
  subs;
  subsTail;
};
export {
  ReactiveEffect,
  activeSub,
  effect,
  reactive,
  ref,
  trackRef,
  triggerRef
};
//# sourceMappingURL=reactivity.esm.js.map
