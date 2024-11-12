import { StateCreator, StoreApi, StoreMutatorIdentifier } from 'zustand/vanilla';

export type ActionKeyToPayload = { [A: string]: any[] };

export type EffectKeyToFn = { [E: string]: (...args: any[]) => void };

export type Reducers<S, KTP extends ActionKeyToPayload> = {
  [A in keyof KTP]: (state: S, ...args: KTP[A]) => S;
};

export type Effects<S, KTF> = (set: StoreApi<S>['setState'], get: StoreApi<S>['getState']) => {
  [E in keyof KTF]: KTF[E];
};

export type Actions<KTP extends ActionKeyToPayload, KTF extends EffectKeyToFn> = {
  [A in keyof KTP]: (...args: KTP[A]) => KTP[A];
} & KTF;

export type AsyncActions<KTP extends ActionKeyToPayload, KTF extends EffectKeyToFn> = {
  [A in keyof KTP]: (...args: KTP[A]) => Promise<KTP[A]> | KTP[A];
} & KTF;

export type ActionRewrite<P extends any[] = any[]> = (data: { name: string; action: string; payload: P }, origin: (...args: P) => P) => Promise<P> | P;

export type ReduxOptions<S extends unknown, KTP extends ActionKeyToPayload, KTF extends EffectKeyToFn> = {
  /**
   * just name
   */
  name: string;
  /**
   * initial state
   */
  state: S;
  reducers: Reducers<S, KTP>;
  effects?: Effects<S, KTF>;
  initialize?: (api: CustomStoreApi<S, KTP, KTF>, resolve: (value: any) => void) => void;
  actionRewrite?: ActionRewrite;
};

type StoreSugar<S, KTP extends ActionKeyToPayload, KTF extends EffectKeyToFn> = {
  actions: AsyncActions<KTP & { reset: [] }, KTF>;
  originActions: Actions<KTP & { reset: [] }, KTF>;
  effects?: KTF;
  ready: () => Promise<CustomStoreApi<S, KTP, KTF>>;
  wait: (condition: (state: S) => boolean) => Promise<CustomStoreApi<S, KTP, KTF>>;
  onAction: <K extends (keyof KTP | 'reset')>(action: K, listener: (...args: KTP[K]) => void) => () => void;
};

type WithSugar<S, A extends ActionKeyToPayload, KTF extends EffectKeyToFn> = S extends { getState: () => infer T }
  ? Write<S, StoreSugar<T, A, KTF>>
  : never

export type CustomStoreApi<S extends unknown, KTP extends ActionKeyToPayload, KTF extends EffectKeyToFn> = StoreApi<S> & StoreSugar<S, KTP, KTF>;

const registeredNameMap = new Set<string>();
const sugarImpl = <S extends {}, KTP extends ActionKeyToPayload, KTF extends EffectKeyToFn>(options: ReduxOptions<S, KTP, KTF>) =>
(
  set: StoreApi<S>['setState'],
  get: StoreApi<S>['getState'],
  api: CustomStoreApi<S, KTP, KTF>,
): S => {
  if (registeredNameMap.has(options.name)) {
    throw new Error(`名为 ${options.name} 的store创建多次，请检查是否命名错误`);
  }
  registeredNameMap.add(options.name);

  const { name, actionRewrite, initialize, reducers, state } = options;
  const listeners: { action: keyof KTP; listener: (...args: any) => void }[] = [];
  const originActions = { reset: () => set({ ...state }, true) } as CustomStoreApi<S, KTP, KTF>['originActions'];
  const actions = { ...originActions } as CustomStoreApi<S, KTP, KTF>['actions'];
  let readyResolve = (value: CustomStoreApi<S, KTP, KTF>) => {};
  const readyPromise = new Promise<CustomStoreApi<S, KTP, KTF>>(resolve => {
    readyResolve = resolve;
  });
  const effects = options.effects ? options.effects?.(set, get) : {};

  Object.keys(reducers).forEach(action => {
    (originActions as any)[action] = (...args: KTP[keyof KTP]) => {
      set((state: S) => reducers[action](state, ...args as any), true);

      listeners.forEach(item => {
        if (action === item.action) {
          item.listener(...args);
        }
      });

      return args;
    };
  });

  Object.keys(effects).forEach(action => {
    (originActions as any)[action] = (...args: any[]) => {
      listeners.forEach(item => {
        if (action === item.action) {
          item.listener(...args);
        }
      });
      return (effects as any)[action](...args);
    };
  });

  Object.keys(reducers).forEach(action => {
    (originActions as any)[action] = (...args: KTP[keyof KTP]) => {
      set((state: S) => reducers[action](state, ...args as any), true);

      listeners.forEach(item => {
        if (action === item.action) {
          item.listener(...args);
        }
      });

      return args;
    };
  });

  Object.keys(originActions).forEach(action => {
    (actions as any)[action] = actionRewrite
      ? (...payload: []) => actionRewrite({ name, action, payload }, originActions[action])
      : originActions[action];
  });

  api.actions = actions as AsyncActions<KTP & { reset: [] }, KTF>;
  api.originActions = originActions as Actions<KTP & { reset: [] }, KTF>;
  api.ready = () => readyPromise;
  api.wait = async (condition) => {
    await readyPromise;
    return new Promise(resolve => {
      if (condition(api.getState())) {
        resolve(api);
        return;
      }

      const unsubscribe = api.subscribe((state) => {
        if (condition(state)) {
          unsubscribe();
          resolve(api);
        }
      });
    });
  };
  api.onAction = (action, listener) => {
    const data = { action, listener };

    listeners.push(data);

    return () => {
      const index = listeners.findIndex(item => item === data);
      listeners.splice(index, 1);
    };
  };

  if (initialize) {
    initialize(api, readyResolve);
  } else {
    readyResolve(api);
  }

  return { ...state };
};

type Write<T, U> = Omit<T, keyof U> & U;

declare module 'zustand/vanilla' {
  interface StoreMutators<S, A extends [ActionKeyToPayload, EffectKeyToFn]> {
    'zustand/sugar': WithSugar<S, A[0], A[1]>;
  }
}

type Sugar = <
  T,
  KTP extends ActionKeyToPayload,
  KTF extends EffectKeyToFn,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  options: ReduxOptions<T, KTP, KTF>,
) => StateCreator<T, Mps, [['zustand/sugar', [KTP, KTF]], ...Mcs]>

export const sugar = sugarImpl as unknown as Sugar;
