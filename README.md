# zustand-sugar

I didn’t want to write the function type and then the function implementation when creating a store, and I didn’t want to modify the function implementation when modifying the function type, so I created this library.

# Installation

```
npm i zustand-sugar zustand
```

# Basic usage

Create your store without having to write predefined types for the methods in it.

```typescript
import { create } from 'zustand';
import { sugar } from 'zustand-sugar';

interface BearState {
  bears: number;
}

const state: BearState = {
  bears: 0,
};

const useBearStore = create<BearState>()(
  sugar({
    state,
    actions: (set, get) => ({
      increasePopulation: () => {
        set({ bears: get().bears + 1 });
      },
      removeAllBears: () => {
        set({ bears: 0 });
      },
    }),
  })
);
```

Then you can use the defined methods in the component through actions.

```tsx
function BearCounter() {
  const bears = useBearStore((state) => state.bears)
  return <h1>{bears} around here ...</h1>;
}

function Controls() {
  return <button onClick={useBearStore.actions.increasePopulation}>one up</button>;
}
```

# Side effects

You can add side effects with the effects option.

```typescript
import { create } from 'zustand';
import { sugar } from 'zustand-sugar';

interface BearState {
  bears: number;
}

const state: BearState = {
  bears: 0,
};

const useBearStore = create<BearState>()(
  sugar({
    state,
    actions: (set, get) => ({
      removeAllBears: (state) => {
        set({ bears: 0 });
      },

      increasePopulation: async () => {
        // Wait one second
        await new Promise(resolve => setTimeout(resolve, 1000));
        set({ bears: get().bears + 1 });
      },
    }),
  })
);

// Then you can also use actions to trigger side effects
useBearStore.actions.increasePopulation();
```

# Wait

Waiting for a state to be ready.

For example, in your system, wait for user data to be ready.

```typescript
async function getTodoListForUser () {
  await useUserInfoStore.wait(state => !!state.userInfo);
  // fetch todo list
}
```

# onAction

You can also listen for an action trigger.

```typescript
useEffect(() => {
  // return unsubscribe
  return useBearStore.onAction('increasePopulation', () => {
    console.log('increasePopulation');
  });
}, []);
```
