export type Entry = {
  redo: () => void | Promise<void>;
  undo: () => void | Promise<void>;
};

export type ExecuteUndo = {
  execute: () => void | Promise<void>;
  undo: () => void | Promise<void>;
};

export type UndoRedo = Entry;

export type AddOptions = UndoRedo | ExecuteUndo;

interface UndoManagerOption {
  maxSize?: number;
  onChange?: () => void;
}

export class UndoManager {
  private _undoRedoStack: Array<Entry> = [];
  private readonly _maxSize: number;
  private _index: number = -1;
  private _canUndo: boolean = false;
  private _canRedo: boolean = false;
  private _onChange: () => void = () => {};

  constructor(options: UndoManagerOption = {}) {
    const {maxSize = 10_000, onChange} = options;
    this._maxSize = maxSize;
    if (onChange) {
      this._onChange = onChange;
    }
  }

  private _updateIndex(idx: number) {
    this._index = idx;
    const cu = this._index >= 0;
    if (cu !== this._canUndo) {
      this._canUndo = cu;
      this._onChange?.();
    }
    const cr = this._index < this._undoRedoStack.length - 1;
    if (cr !== this._canRedo) {
      this._canRedo = cr;
      this._onChange?.();
    }
  }

  get canUndo() {
    return this._canUndo;
  }

  get canRedo() {
    return this._canRedo;
  }

  add(options: AddOptions) {
    this._undoRedoStack.splice(this._index + 1);
    const {undo} = options;
    const {execute} = options as Partial<ExecuteUndo>;
    const {redo = execute} = options as Partial<UndoRedo>;

    if (redo) {
      this._undoRedoStack.push({
        undo,
        redo,
      });
    }
    this._updateIndex(this._index + 1);
    if (this._index >= this._maxSize) {
      this._undoRedoStack.shift();
      this._updateIndex(this._index - 1);
    }
    if (execute) {
      execute();
    }
  }

  undo() {
    if (!this._canUndo) {
      return;
    }
    const entry = this._undoRedoStack[this._index];
    this._updateIndex(this._index - 1);
    return entry.undo();
  }

  redo() {
    if (!this._canRedo) {
      return;
    }
    const entry = this._undoRedoStack[this._index + 1];
    this._updateIndex(this._index + 1);
    return entry.redo();
  }
}
