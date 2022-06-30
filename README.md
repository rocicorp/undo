# Undo

A simple undo / redo manager.

# Installation

```
npm install @rocicorp/undo
```

# Usage

`UndoManager`

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

### Constructor for UndoManager

| Param   | Type                             | Description                                 |
| ------- | -------------------------------- | ------------------------------------------- |
| options | <code>UnderManagerOptions</code> | options passed for undo manager constructor |

### UnderManagerOptions

| Param    | Type                                                   | Description                                                                       |
| -------- | ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| maxSize  | <code>Object</code>                                    | The maximum number of entries in the stack. Default is 10000.                     |
| onChange | <code>(undoManager: UndoRedoStackState) => void</code> | A callback function to be called when the stack canUndo or canRedo values change. |

**Example**

```ts
   const undoManager = new UndoManager({ 10, (e: UndoRedoStackState) => {
    console.log('undo manager canUndo or canRedo values changed -- ', e.canUndo, e.canRedo);
   }});
```

---

## <b>canUndo</b>

### Determines if a user can perform the undo operation on the undoRedo stack.

---

## <b>canRedo</b>

### Determines if a user can perform the redo operation on the undoRedo stack.

---

## <b>add</b>

### Adds an entry to the undoRedo stack.

| Param   | Type                    | Description                                                                                                                                                   |
| ------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| options | <code>AddOptions</code> | The entry to add to the stack. Can be a UndoRedo or ExecuteUndo. object. `ExecuteUndo` will run the `execute` function immediately after adding to the stack. |

### AddOptions

```ts
type AddOptions = UndoRedo | ExecuteUndo;

type UndoRedo = {
  redo: () => void | MaybePromise<void>;
  undo: () => void | MaybePromise<void>;
};

type ExecuteUndo = {
  execute: () => void | MaybePromise<void>;
  undo: () => void | MaybePromise<void>;
};
```

---

## <b>undo</b>

### execute the undo function of the current entry in the undoRedo stack.

---

## <b>redo</b>

### execute the redo function of the current entry in the undoRedo stack.

---
