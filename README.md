# Undo

A simple undo / redo manager. This was designed to work well with [Replicache](replicache.dev), but can be used entirely independently. From this library's perspective, undo/redo actions are just functions and this library doesn't care what those functions do. Please use [Replidraw](http://github.com/rocicorp/replidraw) as a reference on how to use the library.

# Installation

```
npm install @rocicorp/undo
```

# Replicache Usage Example

```tsx
import { Replicache } from "replicache";
import { useSubscribe } from "replicache-react";
...
import {UndoManager} from '@rocicorp/undo';

// Replicache and UndoManager are initialized outside of the initial component render.
// undoManager = new UndoManager()
const App = ({ rep }: { rep: Replicache<M>, undoManager: UndoManager }) => {
  const todos = useSubscribe(rep, listTodos, [], [rep]);

 // new item with undo
  const handleNewItem = (text: string) => {
    const id = nanoid();
    //function that will redo and execute
    const putTodo = () => {
      rep.mutate.putTodo({
        id,
        text: text,
        sort: todos.length > 0 ? todos[todos.length - 1].sort + 1 : 0,
        completed: false,
      });
    };

    //undo function
    const removeTodo = () => rep.mutate.deleteTodos([id]);

    undoManager.add({
      execute: putTodo,
      undo: removeTodo,
    });
  };

  return (
    <div>
      <Header onNewItem={handleNewItem} />
      <MainSection
        todos={todos}
      />
    </div>
  );
}
```

# Basic Usage Example

```ts
import {UndoManager} from '@rocicorp/undo';

const undoManager = new UndoManager();
const modifiedValue = 0;
undoManager.add({
  undo: () => {
    modifiedValue--;
  },
  execute: () => {
    modifiedValue++;
  },
});
```

# API

## <b>constructor</b>

Constructor for UndoManager

| Param   | Type                             | Description                                 |
| ------- | -------------------------------- | ------------------------------------------- |
| options | <code>UnderManagerOptions</code> | Options passed for undo manager constructor |

UnderManagerOptions

| Param           | Type                                                   | Description                                                                                        |
| --------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| maxSize         | <code>number</code>                                    | The maximum number of entries in the stack. Default is 10000.                                      |
| onChange        | <code>(undoManager: UndoRedoStackState) => void</code> | A callback function to be called when the stack canUndo or canRedo values change.                  |
| enableShortcuts | <code>boolean</code>                                   | Whether keyboard shortcut handling is active when `addListeners` is called. Default is `false`.    |
| shortcuts       | <code>ShortcutOptions</code>                           | Per-platform overrides for the default shortcut keys. Only used when `enableShortcuts` is `true`.  |

**Example**

```ts
   const undoManager = new UndoManager({ 10, (e: UndoRedoStackState) => {
    console.log('undo manager canUndo or canRedo values changed -- ', e.canUndo, e.canRedo);
   }});
```

---

## <b>canUndo</b>

Determines if a user can perform the `undo` operation on the undoRedo stack.

---

## <b>canRedo</b>

Determines if a user can perform the `redo` operation on the undoRedo stack.

---

## <b>add</b>

Adds an entry to the undoRedo stack.

| Param   | Type                    | Description                                                                                                                                                              |
| ------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| options | <code>AddOptions</code> | A `UndoRedo` or `ExecuteUndo` object that can is added to the stack. If it is an `ExecuteUndo` it will run the `execute` function immediately after adding to the stack. |

### AddOptions

```ts
type AddOptions = UndoRedo | ExecuteUndo;

type UndoRedo = {
  redo: () => MaybePromise<void>;
  undo: () => MaybePromise<void>;
};

type ExecuteUndo = {
  execute: () => MaybePromise<void>;
  undo: () => MaybePromise<void>;
};
```

---

## <b>undo</b>

Executes the undo function of the current entry in the undoRedo stack. If the current entry has groupID it will check the upcoming undo entry. If the upcoming undo entry also has the same `groupID` the function will recursively call undo until it runs into a entry that has has a different `groupID` or is `undefined`.

---

## <b>redo</b>

Executes the redo function of the current entry in the undoRedo stack. If the current entry has groupID it will check the upcoming redo entry. If the upcoming redo entry also has the same `groupID` the function will recursively call redo until it runs into a entry that has has a different `groupID` or is `undefined`.

---

## <b>addListeners</b>

Attaches keydown event listeners to the given `EventTarget` for undo/redo keyboard shortcuts. Requires `enableShortcuts: true` in the constructor.

Default shortcuts (using `ctrlKey` on Windows/Linux, `metaKey` on Mac):

| Action | Keys |
| ------ | ---- |
| Undo   | Ctrl+Z / Cmd+Z |
| Redo   | Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z |

| Param  | Type                     | Description                                        |
| ------ | ------------------------ | -------------------------------------------------- |
| target | <code>EventTarget</code> | The target to attach listeners to (e.g. `window`). |

**Basic example**

```ts
const undoManager = new UndoManager({ enableShortcuts: true });
undoManager.addListeners(window);
```

**Custom key bindings**

Key bindings are configured per-platform via `shortcuts.mac` and `shortcuts.other`. Each action accepts a `KeyBinding` (a subset of `KeyboardEventInit`: `key`, `shiftKey`, `altKey`, `ctrlKey`, `metaKey`) or an array of them.

```ts
const undoManager = new UndoManager({
  enableShortcuts: true,
  shortcuts: {
    // Ctrl modifier (Windows / Linux)
    other: {
      undo: { key: 'z' },
      redo: [{ key: 'y' }, { key: 'z', shiftKey: true }],
    },
    // Cmd modifier (Mac)
    mac: {
      undo: { key: 'z' },
      redo: [{ key: 'z', shiftKey: true }], // only Cmd+Shift+Z, no Cmd+Y
    },
  },
});

undoManager.addListeners(window);
```

---

## <b>removeListeners</b>

Removes keydown event listeners previously added via `addListeners`.

| Param  | Type                     | Description                                            |
| ------ | ------------------------ | ------------------------------------------------------ |
| target | <code>EventTarget</code> | The target to remove listeners from (e.g. `window`). |

**Example**

```ts
undoManager.removeListeners(window);
```

---

## <b>startGroup</b>

Sets the undo manager to add `groupID` to all subsequent entries. Sets the `isGrouping` internal state of the stack to `true`

---

## <b>endGroup</b>

Sets the undo manager to mark all subsequent added entries `groupID` to `undefined`. Sets the `isGrouping` internal state of the stack to `false`

---
