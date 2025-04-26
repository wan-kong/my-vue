export type Dependency = {
  // 订阅者链表的头节点
  subs: Link | undefined;
  //   订阅者链表的尾节点
  subsTail: Link | undefined;
};

/**
 * 订阅者
 * 目前是只有 effect
 */
export type Sub = {
  /**
   * 当前是否正在收集依赖?
   * 防止
   * effect(()=>{
   *  console.log(count.value++)
   * })
   * 这种死循环
   */
  tracking: boolean;
  // 订阅者链表的头节点
  deps: Link | undefined;
  //   订阅者链表的尾节点
  depsTail: Link | undefined;
};

export type Link = {
  //   订阅者
  sub: Sub;
  preSub: Link | undefined;
  nextSub: Link | undefined;
  //   依赖项
  dep: Dependency;
  nextDep: Link | undefined;
};

/**
 * 保存已经被清理的节点
 */
let linkPool: Link;

/**
 * 链接链表关系
 * @param dep
 * @param sub
 */
export function link(dep: Dependency, sub: Sub) {
  const currentDep = sub.depsTail;
  //   尝试复用依赖
  //   如果头节点有，尾节点没有，尝试复用头节点
  //   如果尾节点还有nextDep,尝试复用nextDep
  const nextDep = currentDep === undefined ? sub.deps : sub.depsTail.nextDep;
  if (nextDep && nextDep.dep === dep) {
    sub.depsTail = nextDep;
    return;
  }
  let newLink: Link;
  /**
   * 如果linkPool 有，则复用一下。
   * 没有则创建新的。
   */
  if (linkPool) {
    newLink = linkPool;
    linkPool = linkPool.nextDep;
    newLink.nextDep = nextDep;
    newLink.dep = dep;
    newLink.sub = sub;
  } else {
    newLink = {
      sub,
      preSub: undefined,
      nextSub: undefined,
      dep,
      nextDep,
    };
  }
  /**
   * 尾节点有，这向尾节点追加，否则就是头节点
   * 订阅者的双向链表插入
   */
  if (dep.subsTail) {
    dep.subsTail.nextSub = newLink;
    newLink.preSub = dep.subsTail;
    dep.subsTail = newLink;
  } else {
    dep.subs = newLink;
    dep.subsTail = newLink;
  }

  /**
   * 依赖项的链表 (单链表)
   */
  if (sub.depsTail) {
    sub.depsTail.nextDep = newLink;
    sub.depsTail = newLink;
  } else {
    sub.deps = newLink;
    sub.depsTail = newLink;
  }
}

/**
 * 触发依赖更新
 * @param subs
 *
 */
export function propagate(subs: Link) {
  let link = subs;
  const queuedEffect = [];
  while (link) {
    const sub = link.sub;
    if (!sub.tracking) {
      queuedEffect.push(sub);
    }
    link = link.nextSub;
  }
  queuedEffect.forEach(effect => effect.notify());
}

/**
 * 开始追踪依赖
 * 将尾节点断开设置为 undefined
 * @param sub
 */
export function startTracker(sub: Sub) {
  sub.tracking = true;
  sub.depsTail = undefined;
}

export function endTracker(sub: Sub) {
  sub.tracking = false;
  const depsTail = sub.depsTail;
  if (depsTail) {
    if (depsTail.nextDep) {
      clearTracking(depsTail.nextDep);
      depsTail.nextDep = undefined;
    }
  } else if (sub.deps) {
    clearTracking(sub.deps);
    sub.deps = undefined;
  }
}

export function clearTracking(link: Link) {
  while (link) {
    const { preSub, nextDep, nextSub, dep } = link;

    /**
     * 如果preSub有，那就拿preSub的nextSub设置为 link.nextSub;
     * 如果没有，那就是头节点，将dep.subs 指向link.nextSub
     */
    if (preSub) {
      preSub.nextSub = nextSub;
      link.nextSub = undefined;
    } else {
      dep.subs = nextSub;
    }

    /**
     * 如果nextSub有，将nextSub的preSub 指向 link.preSub;
     * 如果没有，那就是尾节点，直接移动dep的尾指针到preSub
     */
    if (nextSub) {
      nextSub.preSub = preSub;
      link.preSub = undefined;
    } else {
      dep.subsTail = preSub;
    }
    /**
     * 断开关联关系
     */
    link.dep = link.sub = undefined;
    link.nextDep = linkPool;
    /**
     * 将不用的节点留给linkPool去复用
     * 相当于链表上还是有这个的。但具体指向什么，要看创建的时候的重新赋值
     */
    linkPool = link;
    link = nextDep;
  }
}
