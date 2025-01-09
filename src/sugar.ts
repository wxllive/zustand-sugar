import { StateCreator, StoreApi, StoreMutatorIdentifier } from 'zustand/vanilla';

export type ActionKeyToPayload = { [A: string]: any[] };

export type EffectKeyToFn = { [E: string]: (...args: any[]) => void };

export type Effects<S, KTF> = (set: StoreApi<S>['setState'], get: StoreApi<S>['getState']) => {
  [E in keyof KTF]: KTF[E];
};

type ObjectMapping<A> = string extends keyof A ? {} : A;
;
export type Actions<KTP extends ActionKeyToPayload, KTF extends EffectKeyToFn> = {
  [A in keyof KTP]: (...args: KTP[A]) => KTP[A];
} & (string extends keyof KTF ? {} : KTF);

export type ReduxOptions<S extends unknown, KTP extends ActionKeyToPayload, KTF extends EffectKeyToFn = {}> = {
  /**
   * initial state
   */
  state: S;
  actions?: Effects<S, KTF>;
};

type StoreSugar<S, KTP extends ActionKeyToPayload = {}, KTF extends EffectKeyToFn = {}> = {
  actions: Actions<ObjectMapping<KTP> & { reset: [] }, KTF>;
  wait: (condition: (state: S) => boolean) => Promise<CustomStoreApi<S, KTP, KTF>>;
  onAction: <K extends (keyof KTP | 'reset')>(action: K, listener: (...args: KTP[K]) => void) => () => void;
};

type WithSugar<S, A extends ActionKeyToPayload, KTF extends EffectKeyToFn> = S extends { getState: () => infer T }
  ? Write<S, StoreSugar<T, A, KTF>>
  : never

export type CustomStoreApi<S extends unknown, KTP extends ActionKeyToPayload, KTF extends EffectKeyToFn> = StoreApi<S> & StoreSugar<S, KTP, KTF>;

const sugarImpl = <
  S extends {},
  KTP extends ActionKeyToPayload,
  KTF extends EffectKeyToFn = {},
>(options: ReduxOptions<S, KTP, KTF>) =>
(
  set: StoreApi<S>['setState'],
  get: StoreApi<S>['getState'],
  api: CustomStoreApi<S, KTP, KTF>,
): S => {
  const listeners: { action: keyof KTP; listener: (...args: any) => void }[] = [];
  const actions = { reset: () => set({ ...options.state }, true), ...options.actions?.(set, get) } as CustomStoreApi<S, KTP, KTF>['actions'];

  Object.keys(actions).forEach(action => {
    const rawAction = (actions as any)[action];
    (actions as any)[action] = (...args: any[]) => {
      listeners.forEach(item => {
        if (action === item.action) {
          item.listener(...args);
        }
      });
      return rawAction(...args);
    };
  });

  api.actions = actions;
  api.wait = async (condition) => {
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

  return { ...options.state };
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
