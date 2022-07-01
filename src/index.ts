export type MaybePromise<T> = T | Promise<T>;

/**
 * the object stored in the undoRedo stack
 */
type Entry = {
  groupId: number | undefined;
  redo: () => MaybePromise<void>;
  undo: () => MaybePromise<void>;
};

/**
 * A type of object that can be added to the undoRedo stack.
 * If this type of object is added, the execute function will be called after added to the stack.
 * The redo field will be assumed to be the same as execute.
 */
export type ExecuteUndo = {
  execute: () => MaybePromise<void>;
  undo: () => MaybePromise<void>;
};

/**
 * A type of object that can be added to the undoRedo stack.
 */
export type UndoRedo = {
  redo: () => MaybePromise<void>;
  undo: () => MaybePromise<void>;
};

/**
 * Types of object that can be added to the undoRedo stack. (UndoRedo | ExecuteUndo)
 */
export type AddOptions = UndoRedo | ExecuteUndo;

/**
 * State object that holds the canUndo and canRedo properties passed to the onChange event listener.
 */
export type UndoRedoStackState = {
  canUndo: boolean;
  canRedo: boolean;
};

/**
 * The arguments interface for the constructor of UndoManager.
 * @param maxSize The maximum number of entries in the stack. Default is 10000.
 * @param onChange A callback function to be called when the stack canUndo or canRedo values change.
 */
interface UndoManagerOption {
  maxSize?: number;
  onChange?: (undoRedoStackState: UndoRedoStackState) => void;
}

export class UndoManager {
  /**
   * The list of entries stored in history.
   */
  private _undoRedoStack: Array<Entry> = [];
  private readonly _maxSize: number;
  // current groupId to assign to entries
  private _groupingId: number | undefined = undefined;
  // internal tracker of groupId
  private _lastGroupId = 0;
  /**
   * pointer that keeps track of our current position in the undoRedo stack.
   */
  private _index = -1;
  private _canUndo = false;
  private _canRedo = false;

  private _onChange: (undoRedoStackState: UndoRedoStackState) => void =
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    () => {};

  /**
   * Constructor for UndoManager
   * @param options The options for the UndoManager. Currently can take a maxSize and onChange callback.
   * @example
   * const undoManager = new UndoManager({ 10, () => {
   *  console.log('undo manager changed');
   * }});
   */
  constructor(options: UndoManagerOption = {}) {
    const {maxSize = 10_000, onChange} = options;
    this._maxSize = maxSize;
    if (onChange) {
      this._onChange = onChange;
    }
  }

  /**
   * updates the current pointer (idx) to the undoRedo stack.
   * @param idx The index to update to
   */
  private _updateIndex(idx: number): void {
    this._index = idx;
    const cu = this._index >= 0;
    if (cu !== this._canUndo) {
      this._canUndo = cu;
      this._onChange?.({
        canUndo: this._canUndo,
        canRedo: this._canRedo,
      });
    }
    const cr = this._index < this._undoRedoStack.length - 1;
    if (cr !== this._canRedo) {
      this._canRedo = cr;
      this._onChange?.({
        canUndo: this._canUndo,
        canRedo: this._canRedo,
      });
    }
  }

  /**
   * Determines if a user can perform the undo operation on the undoRedo stack.
   */
  get canUndo(): boolean {
    return this._canUndo;
  }

  /**
   * Determines if a user can perform the redo operation on the undoRedo stack.
   */
  get canRedo(): boolean {
    return this._canRedo;
  }

  /**
   * Adds an entry to the undoRedo stack.
   * @param options The entry to add to the stack. This can be a UndoRedo or ExecuteUndo object.
   */
  async add(options: AddOptions) {
    this._undoRedoStack.splice(this._index + 1);
    const {undo} = options;
    const {execute} = options as Partial<ExecuteUndo>;
    const {redo = execute} = options as Partial<UndoRedo>;

    if (redo) {
      this._undoRedoStack.push({
        groupId: this._groupingId,
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
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      execute();
    }
  }

  /**
   * Executes the undo function of the current entry in the undoRedo stack.
   * If the current entry has groupId it will check the upcoming undo entry.
   * If the upcoming undo entry also has the same `groupId` the function will recursively call undo
   * until it runs into a entry that has has a different `groupId` or is `undefined`.
   */
  async undo() {
    if (!this._canUndo) {
      return;
    }
    const entry = this._undoRedoStack[this._index];
    this._updateIndex(this._index - 1);
    const nextEntry = this._undoRedoStack[this._index];
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    entry.undo();
    //if current entry is isGroup and next entry isGroup then undo the next entry
    if (
      entry.groupId !== undefined &&
      nextEntry &&
      nextEntry.groupId === entry.groupId
    ) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.undo();
    }
  }

  /**
   * Executes the redo function of the current entry in the undoRedo stack.
   * If the current entry has a groupId it will check the upcoming redo entry.
   * If the upcoming redo entry also has the same `groupId` the function will recursively call redo
   * until it runs into a entry that has has a different `groupId` or is `undefined`.
   */
  async redo() {
    if (!this._canRedo) {
      return;
    }
    const entry = this._undoRedoStack[this._index + 1];
    this._updateIndex(this._index + 1);
    const nextEntry = this._undoRedoStack[this._index + 1];
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    entry.redo();
    //if current entry is isGroup and next entry isGroup then undo the next entry
    if (
      entry.groupId !== undefined &&
      nextEntry &&
      nextEntry.groupId === entry.groupId
    ) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.redo();
    }
  }

  /**
   * Sets the undo manager to mark all subsequent added entries `groupId` to internal `groupingId`
   */
  startGroup() {
    this._groupingId = this._lastGroupId;
    this._lastGroupId = this._lastGroupId + 1;
  }

  /**
   * Sets the undo manager to mark all subsequent added entries `groupId` to `undefined`
   */
  endGroup() {
    this._groupingId = undefined;
  }
}
