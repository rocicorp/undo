export type MaybePromise<T> = T | Promise<T>;

/**
 * @description
 * the object stored in the undoRedo stack
 */
export type Entry = {
  redo: () => void | MaybePromise<void>;
  undo: () => void | MaybePromise<void>;
};

/**
 * @description
 * A type of object that can be added to the undoRedo stack.
 * If this type of object is added, the execute function will be called after added to the stack.
 */
export type ExecuteUndo = {
  execute: () => void | MaybePromise<void>;
  undo: () => void | MaybePromise<void>;
};

/**
 * @description
 * a type of object that can be added to the undoRedo stack.
 */
export type UndoRedo = Entry;

/**
 * @description
 * Types of object that can be added to the undoRedo stack. (UndoRedo | ExecuteUndo)
 */
export type AddOptions = UndoRedo | ExecuteUndo;

/**
 * @description
 * State object that holds the canUndo and canRedo properties passed to the onChange event listener.
 */
export type UndoRedoStackState = {
  canUndo: boolean;
  canRedo: boolean;
};

interface UndoManagerOption {
  maxSize?: number;
  onChange?: (undoRedoStackState: UndoRedoStackState) => void;
}

export class UndoManager {
  /**
   * The list of entries stored in history.
   * @type {Array.<Entry>}
   */
  private _undoRedoStack: Array<Entry> = [];
  private readonly _maxSize: number;

  /**
   * @description
   * pointer that keeps track of our current position in the undoRedo stack.
   */
  private _index: number = -1;
  private _canUndo: boolean = false;
  private _canRedo: boolean = false;
  private _onChange: (undoRedoStackState: UndoRedoStackState) => void =
    () => {};

  /**
   * Constructor for UndoManager
   * @param {number} maxSize The maximum number of entries in the stack. Default is 10000.
   * @param {function} onChange A callback function to be called when the stack canUndo or canRedo values change.
   * @constructor
   * @memberof UndoManager
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
   * @description
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
   * @description
   * Determines if a user can perform the undo operation on the undoRedo stack.
   * @returns {boolean}
   */
  get canUndo(): boolean {
    return this._canUndo;
  }

  /**
   * @description
   * Determines if a user can perform the redo operation on the undoRedo stack.
   * @returns {boolean}
   */
  get canRedo(): boolean {
    return this._canRedo;
  }

  /**
   * @description
   * Adds an entry to the undoRedo stack.
   * @param {AddOptions} options The entry to add to the stack. Can be a UndoRedo or ExecuteUndo object.
   * @returns {void}
   */
  async add(options: AddOptions) {
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
      await execute();
    }
  }

  /**
   * @description
   * execute the undo function of the current index in the undoRedo stack.
   * @returns {void}
   */
  async undo() {
    if (!this._canUndo) {
      return;
    }
    const entry = this._undoRedoStack[this._index];
    this._updateIndex(this._index - 1);
    return await entry.undo();
  }

  /**
   * @description
   * execute the redo function of the current entry in the undoRedo stack.
   * @returns {void}
   */
  async redo() {
    if (!this._canRedo) {
      return;
    }
    const entry = this._undoRedoStack[this._index + 1];
    this._updateIndex(this._index + 1);
    return await entry.redo();
  }
}
