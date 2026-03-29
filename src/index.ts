export type MaybePromise<T> = T | Promise<T>;

/**
 * The object stored in the undoRedo stack.
 */
type Entry = {
  groupID: number | undefined;
  undo: () => MaybePromise<void>;
  redo: () => MaybePromise<void>;
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
  undo: () => MaybePromise<void>;
  redo: () => MaybePromise<void>;
};

/**
 * Types of object that can be added to the undoRedo stack. (UndoRedo | ExecuteUndo)
 */
export type AddOptions = UndoRedo | ExecuteUndo;

/**
 * Type of function that will be called on an UndoRedoStatckState change.
 */
export type OnChangeHandlerType =
  | ((undoRedoStackState: UndoRedoStackState) => void)
  | undefined;
/**
 * State object that holds the canUndo and canRedo properties passed to the onChange event listener.
 */
export type UndoRedoStackState = {
  canUndo: boolean;
  canRedo: boolean;
};

/**
 * A single keyboard shortcut binding, using the same modifier key names as
 * the browser's `KeyboardEvent` (`shiftKey`, `altKey`, `ctrlKey`, `metaKey`).
 * Only the modifiers you specify are checked; unspecified ones default to `false`.
 */
export type KeyBinding = Pick<
  KeyboardEventInit,
  'key' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'
> & {key: string};

/**
 * Keyboard shortcut key mapping for a platform.
 * Each action accepts a single binding or an array of bindings.
 */
export type ShortcutMap = {
  /** Binding(s) for undo. Default: `{key: 'z'}`. */
  undo?: KeyBinding | KeyBinding[];
  /**
   * Binding(s) for redo.
   * Default: `[{key: 'y'}, {key: 'z', shiftKey: true}]`.
   */
  redo?: KeyBinding | KeyBinding[];
};

/**
 * Per-platform shortcut key overrides passed to UndoManagerOption.
 */
export type ShortcutOptions = {
  /** Shortcut keys on macOS (uses the Meta/Cmd modifier). */
  mac?: ShortcutMap;
  /** Shortcut keys on all other platforms (uses the Ctrl modifier). */
  other?: ShortcutMap;
};

/**
 * The arguments interface for the constructor of UndoManager.
 * @param maxSize The maximum number of entries in the stack. Default is 10000.
 * @param onChange A callback function to be called when the UndoRedoStackState values change.
 * @param enableShortcuts Whether keyboard shortcut handling is active when addListeners is called. Default is true.
 * @param shortcuts Per-platform overrides for the default shortcut keys.
 */
interface UndoManagerOption {
  maxSize?: number;
  onChange?: (undoRedoStackState: UndoRedoStackState) => void;
  /**
   * Whether keyboard shortcut handling is active when `addListeners` is called.
   * Default is `true`.
   */
  enableShortcuts?: boolean;
  /** Override the default keyboard shortcut keys per platform. */
  shortcuts?: ShortcutOptions;
}

function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

function matchesBinding(ke: KeyboardEvent, bindings: KeyBinding[]): boolean {
  return bindings.some(
    b =>
      ke.key === b.key &&
      (b.shiftKey ?? false) === ke.shiftKey &&
      (b.altKey ?? false) === ke.altKey &&
      (b.ctrlKey === undefined || b.ctrlKey === ke.ctrlKey) &&
      (b.metaKey === undefined || b.metaKey === ke.metaKey),
  );
}

export class UndoManager {
  /**
   * The list of entries stored in history.
   */
  private _undoRedoStack: Array<Entry> = [];
  private readonly _maxSize: number;
  // State that tells you if the UndoManager is currently grouping entries.
  private _isGrouping = false;
  private _lastGroupID = 0;

  // Pointer that keeps track of our current position in the undoRedo stack.
  private _index = -1;

  // keep track of previous stack state
  private _prevUndoRedoStackState: UndoRedoStackState = {
    canUndo: this.canUndo,
    canRedo: this.canRedo,
  };

  private _onChange: OnChangeHandlerType = undefined;
  private _enableShortcuts: boolean;
  private _shortcuts: ShortcutOptions | undefined;

  /**
   * Constructor for UndoManager
   * @param options The options for UndoManager can take a maxSize and onChange callback.
   * @example
   * const undoManager = new UndoManager({ 10, () => {
   *  console.log('undo manager changed');
   * }});
   */
  constructor(options: UndoManagerOption = {}) {
    const {maxSize = 10_000, onChange, enableShortcuts = false, shortcuts} = options;
    this._maxSize = maxSize;
    this._enableShortcuts = enableShortcuts;
    this._shortcuts = shortcuts;
    if (onChange) {
      this._onChange = onChange;
    }
  }

  /**
   * Updates the current pointer (idx) to the undoRedo stack.
   * @param idx The index to update to
   */
  private _updateIndex(idx: number): void {
    this._index = idx;

    const currUndoRedoStackState: UndoRedoStackState = {
      canUndo: this.canUndo,
      canRedo: this.canRedo,
    };

    // If the stack state has changed, call the onChange callback and update the previous state.
    if (
      this._prevUndoRedoStackState.canRedo !== currUndoRedoStackState.canRedo ||
      this._prevUndoRedoStackState.canUndo !== currUndoRedoStackState.canUndo
    ) {
      this._onChange?.(currUndoRedoStackState);
      this._prevUndoRedoStackState = currUndoRedoStackState;
    }
  }

  /**
   * Determines if a user can perform the undo operation on the undoRedo stack.
   */
  get canUndo(): boolean {
    return this._index >= 0;
  }

  /**
   * Determines if a user can perform the redo operation on the undoRedo stack.
   */
  get canRedo(): boolean {
    return this._index < this._undoRedoStack.length - 1;
  }

  /**
   * Adds an entry to the undoRedo stack.
   * @param options The object can be an UndoRedo or ExecuteUndo object.
   */
  async add(options: AddOptions) {
    this._undoRedoStack.splice(this._index + 1);
    const {undo} = options;
    const {execute} = options as Partial<ExecuteUndo>;
    const {redo = execute} = options as Partial<UndoRedo>;

    // Conditional is here because complier can't determine that redo is always available.
    if (redo) {
      this._undoRedoStack.push({
        groupID: this._isGrouping ? this._lastGroupID : undefined,
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
   * Executes the undo function of the current entry in the undoRedo stack.
   * If the current entry has groupID it will check the upcoming undo entry.
   * If the upcoming undo entry also has the same `groupID` the function will recursively call undo
   * until it runs into a entry that has has a different `groupID` or is `undefined`.
   */
  async undo() {
    if (!this.canUndo) {
      return;
    }
    const entry = this._undoRedoStack[this._index];
    this._updateIndex(this._index - 1);
    const nextEntry = this._undoRedoStack[this._index];
    await entry.undo();
    //if current entry is isGroup and next entry isGroup then undo the next entry
    if (
      entry.groupID !== undefined &&
      nextEntry &&
      nextEntry.groupID === entry.groupID
    ) {
      await this.undo();
    }
  }

  /**
   * Executes the redo function of the current entry in the undoRedo stack.
   * If the current entry has a groupID it will check the upcoming redo entry.
   * If the upcoming redo entry also has the same `groupID` the function will recursively call redo
   * until it runs into a entry that has has a different `groupID` or is `undefined`.
   */
  async redo() {
    if (!this.canRedo) {
      return;
    }
    const entry = this._undoRedoStack[this._index + 1];
    this._updateIndex(this._index + 1);
    const nextEntry = this._undoRedoStack[this._index + 1];
    await entry.redo();
    //if current entry is isGroup and next entry isGroup then undo the next entry
    if (
      entry.groupID !== undefined &&
      nextEntry &&
      nextEntry.groupID === entry.groupID
    ) {
      await this.redo();
    }
  }

  /**
   * Handles keydown events to trigger undo/redo via keyboard shortcuts.
   */
  private _handleKeydown = (e: Event): void => {
    if (!this._enableShortcuts) return;
    const ke = e as KeyboardEvent;

    // Check both independently so each uses its own shortcut config.
    if (ke.metaKey) {
      if (this._tryShortcut(e, ke, this._shortcuts?.mac)) return;
    }
    if (ke.ctrlKey) {
      this._tryShortcut(e, ke, this._shortcuts?.other);
    }
  };

  private _tryShortcut(
    e: Event,
    ke: KeyboardEvent,
    map: ShortcutMap | undefined,
  ): boolean {
    const undoBindings = toArray(map?.undo ?? {key: 'z'});
    const redoBindings = toArray(
      map?.redo ?? [{key: 'y'}, {key: 'z', shiftKey: true}],
    );

    if (matchesBinding(ke, undoBindings)) {
      e.preventDefault();
      void this.undo();
      return true;
    }
    if (matchesBinding(ke, redoBindings)) {
      e.preventDefault();
      void this.redo();
      return true;
    }
    return false;
  }

  /**
   * Adds keydown event listeners to the given EventTarget for undo/redo keyboard shortcuts.
   * @param target The EventTarget (e.g. window) to attach listeners to.
   */
  addListeners(target: EventTarget): void {
    target.addEventListener('keydown', this._handleKeydown);
  }

  /**
   * Removes keydown event listeners previously added via `addListeners`.
   * @param target The EventTarget (e.g. window) to remove listeners from.
   */
  removeListeners(target: EventTarget): void {
    target.removeEventListener('keydown', this._handleKeydown);
  }

  /**
   * Sets the undo manager to mark all subsequent added entries `groupID` to internal `lastGroupID`
   */
  startGroup() {
    if (this._isGrouping) {
      throw new Error('UndoManager is already grouping.');
    }
    this._isGrouping = true;
    this._lastGroupID = this._lastGroupID + 1;
  }

  /**
   * Sets the undo manager to mark all subsequent added entries `groupID` to `undefined`
   */
  endGroup() {
    this._isGrouping = false;
  }
}
