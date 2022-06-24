# Undo

A simple undo / redo manager.

# Installation

```
npm install @rocicorp/undo
```

# Usage

`UNdoManager`

```ts
import {UndoManager} from '@rocicorp/undo';

const undoManager = new UndoManager();
const modifiedValue = 0;
undoManager.add({
  redo: () => {
    modifiedValue++;
  },
  undo: () => {
    modifiedValue--;
  },
});
```
