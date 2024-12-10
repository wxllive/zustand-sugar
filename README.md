# Install

```
npm i zustand-sugar
```

# Basic usage

Create your store without having to write predefined types for the methods in it.

```typescript
import { create } from 'zustand';

interface BearState {
  bears: number;
}

const state: BearState = {
  bears: 0,
};

const useBearStore = create<BearState>()({
  state,
  reducers: {
    increasePopulation: (state) => {
      return { ...state, bears: state.bears + 1 };
    },
    removeAllBears: (state) => {
      return { ...state, bears: 0 };
    },
  },
});
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

interface BearState {
  bears: number;
}

const state: BearState = {
  bears: 0,
};

const useBearStore = create<BearState>()({
  state,
  reducers: {
    removeAllBears: (state) => {
      return { ...state, bears: 0 },
    },
  },
  effects: (set, get) => ({
    increasePopulation: async () => {
      // Wait one second
      await new Promise(resolve => setTimeout(resolve, 1000));
      set({ bears: get().bears + 1 });
    },
  }),
});

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
