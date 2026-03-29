/* eslint-disable @typescript-eslint/naming-convention */
import {expect} from 'chai';
import sinon from 'sinon';
import {UndoManager} from './index.js';

let modifiedValue = 0;
let undoManager: UndoManager;
const onChangeSpy = sinon.spy();

describe('UndoManager', () => {
  beforeEach(() => {
    modifiedValue = 0;
    undoManager = new UndoManager({
      onChange: onChangeSpy,
    });
  });

  afterEach(() => {
    onChangeSpy.resetHistory();
  });

  const OneRemoveOneAdd = {
    redo: () => {
      modifiedValue++;
    },
    undo: () => {
      modifiedValue--;
    },
  };
  const OneRemoveOneExecute = {
    execute: () => {
      modifiedValue++;
    },
    undo: () => {
      modifiedValue--;
    },
  };

  const ThrowError = {
    execute: () => {
      throw new Error('Error in execute.');
    },
    undo: () => {
      throw new Error('Error in undo.');
    },
  };

  const ThrowErrorAsync = {
    execute: () => {
      return new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Async error in execute'));
        }, 1);
      });
    },
    undo: () => {
      return new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Async error in undo'));
        }, 1);
      });
    },
  };

  const ThrowErrorAsyncRedo = {
    redo: () => {
      return new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Async error in redo'));
        }, 1);
      });
    },
    undo: () => {
      return new Promise<void>((resolve, _) => {
        setTimeout(() => {
          modifiedValue--;
          resolve(undefined);
        }, 1);
      });
    },
  };

  const ThrowErrorUndoAsync = {
    execute: () => {
      return new Promise<void>((resolve, _) => {
        setTimeout(() => {
          modifiedValue++;
          resolve(undefined);
        }, 1);
      });
    },
    undo: () => {
      return new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Async error in undo'));
        }, 1);
      });
    },
  };

  const OneRemoveOneExecuteAsync = {
    execute: () => {
      return new Promise<void>((resolve, _) => {
        setTimeout(() => {
          modifiedValue++;
          resolve(undefined);
        }, 1);
      });
    },
    undo: () => {
      return new Promise<void>((resolve, _) => {
        setTimeout(() => {
          modifiedValue--;
          resolve(undefined);
        }, 1);
      });
    },
  };

  it('added redo added execute', async () => {
    await undoManager.add(OneRemoveOneAdd);
    await undoManager.add(OneRemoveOneExecute);
    expect(modifiedValue).to.be.equal(1);
    expect(undoManager.canUndo).to.be.true;
    expect(undoManager.canRedo).to.be.false;
    expect(onChangeSpy.callCount).to.be.equal(1);
  });

  it('undo two entries', async () => {
    await undoManager.add(OneRemoveOneAdd);
    await undoManager.add(OneRemoveOneExecute);
    expect(modifiedValue).to.be.equal(1);
    expect(undoManager.canUndo).to.be.true;
    expect(undoManager.canRedo).to.be.false;
    expect(onChangeSpy.callCount).to.be.equal(1);
    await undoManager.undo();
    expect(undoManager.canUndo).to.be.true;
    expect(undoManager.canRedo).to.be.true;
    expect(modifiedValue).to.be.equal(0);
    await undoManager.undo();
    expect(modifiedValue).to.be.equal(-1);
    expect(undoManager.canUndo).to.be.false;
    expect(undoManager.canRedo).to.be.true;
    expect(onChangeSpy.callCount).to.be.equal(3);
  });

  it('add one more entry check for add of equal', async () => {
    await undoManager.add(OneRemoveOneAdd);
    await undoManager.add(OneRemoveOneExecute);
    await undoManager.undo();
    await undoManager.undo();
    await undoManager.add(OneRemoveOneAdd);
    expect(modifiedValue).to.be.equal(-1);
    expect(undoManager.canUndo).to.be.true;
    expect(undoManager.canRedo).to.be.false;
    expect(onChangeSpy.callCount).to.be.equal(4);
    await undoManager.add(OneRemoveOneAdd);
    expect(modifiedValue).to.be.equal(-1);
    expect(undoManager.canUndo).to.be.true;
    expect(undoManager.canRedo).to.be.false;
    expect(onChangeSpy.callCount).to.be.equal(4);
  });

  it('redo two items in stack that can not be redone', async () => {
    await undoManager.add(OneRemoveOneAdd);
    await undoManager.add(OneRemoveOneExecute);
    await undoManager.undo();
    await undoManager.undo();
    await undoManager.add(OneRemoveOneAdd);
    await undoManager.add(OneRemoveOneAdd);
    await undoManager.redo();
    await undoManager.redo();
    expect(modifiedValue).to.be.equal(-1);
    expect(undoManager.canUndo).to.be.true;
    expect(undoManager.canRedo).to.be.false;
    expect(onChangeSpy.callCount).to.be.equal(4);
  });

  it('add / undo / redo async', async () => {
    await undoManager.add(OneRemoveOneExecuteAsync);
    await undoManager.add(OneRemoveOneExecuteAsync);
    expect(modifiedValue).to.be.equal(2);
    await undoManager.undo();
    await undoManager.undo();
    expect(modifiedValue).to.be.equal(0);
    expect(undoManager.canUndo).to.be.false;
    expect(undoManager.canRedo).to.be.true;
    expect(onChangeSpy.callCount).to.be.equal(3);
    await undoManager.redo();
    await undoManager.redo();
    expect(modifiedValue).to.be.equal(2);
    expect(undoManager.canUndo).to.be.true;
    expect(undoManager.canRedo).to.be.false;
    expect(onChangeSpy.callCount).to.be.equal(5);
  });

  it('grouping undo /redo', async () => {
    await undoManager.add(OneRemoveOneExecute);
    expect(modifiedValue).to.be.equal(1);
    expect(undoManager.canUndo).to.be.true;
    expect(undoManager.canRedo).to.be.false;
    undoManager.startGroup();
    await undoManager.add(OneRemoveOneExecute);
    await undoManager.add(OneRemoveOneExecute);
    await undoManager.add(OneRemoveOneExecute);
    await undoManager.add(OneRemoveOneExecute);
    undoManager.endGroup();
    expect(modifiedValue).to.be.equal(5);
    expect(undoManager.canUndo).to.be.true;
    expect(undoManager.canRedo).to.be.false;
    await undoManager.undo();
    expect(modifiedValue).to.be.equal(1);
    expect(undoManager.canUndo).to.be.true;
    expect(undoManager.canRedo).to.be.true;
    await undoManager.undo();
    expect(modifiedValue).to.be.equal(0);
    expect(undoManager.canUndo).to.be.false;
    expect(undoManager.canRedo).to.be.true;
    await undoManager.redo();
    expect(modifiedValue).to.be.equal(1);
    expect(undoManager.canUndo).to.be.true;
    expect(undoManager.canRedo).to.be.true;
    await undoManager.redo();
    expect(modifiedValue).to.be.equal(5);
    expect(undoManager.canUndo).to.be.true;
    expect(undoManager.canRedo).to.be.false;
    await undoManager.undo();
    await undoManager.undo();
  });

  it('past zero group tests, subsequent groups', async () => {
    expect(modifiedValue).to.be.equal(0);
    undoManager.startGroup();
    await undoManager.add(OneRemoveOneExecute);
    await undoManager.add(OneRemoveOneExecute);
    await undoManager.add(OneRemoveOneExecute);
    await undoManager.add(OneRemoveOneExecute);
    undoManager.endGroup();
    expect(modifiedValue).to.be.equal(4);
    undoManager.startGroup();
    await undoManager.add(OneRemoveOneExecute);
    await undoManager.add(OneRemoveOneExecute);
    await undoManager.add(OneRemoveOneExecute);
    await undoManager.add(OneRemoveOneExecute);
    undoManager.endGroup();
    expect(modifiedValue).to.be.equal(8);
    await undoManager.undo();
    expect(modifiedValue).to.be.equal(4);
    await undoManager.undo();
    expect(modifiedValue).to.be.equal(0);
    await undoManager.redo();
    expect(modifiedValue).to.be.equal(4);
    await undoManager.redo();
    expect(modifiedValue).to.be.equal(8);
  });

  it('start group twice should throw error', () => {
    undoManager.startGroup();
    expect(() => undoManager.startGroup()).to.throw(
      'UndoManager is already grouping.',
    );
  });

  it('await should catch error on execute', async () => {
    let expectedError: Error | undefined = undefined;
    try {
      await undoManager.add(ThrowError);
    } catch (e) {
      expectedError = e as Error;
    }
    expect(expectedError).to.be.not.undefined;
    if (!expectedError) {
      throw new Error('expected error to be thrown');
    }
    expect(expectedError.message).to.be.equal('Error in execute.');
  });

  it('await should catch error execute async', async () => {
    let expectedError: Error | undefined = undefined;
    try {
      await undoManager.add(ThrowErrorAsync);
    } catch (e) {
      expectedError = e as Error;
    }
    expect(expectedError).to.be.not.undefined;
    if (!expectedError) {
      throw new Error('expected error to be thrown');
    }
    expect(expectedError.message).to.be.equal('Async error in execute');
  });

  it('await should catch error undo async', async () => {
    let expectedError: Error | undefined = undefined;
    await undoManager.add(ThrowErrorUndoAsync);
    try {
      await undoManager.undo();
    } catch (e) {
      expectedError = e as Error;
    }
    expect(expectedError).to.be.not.undefined;

    if (!expectedError) {
      throw new Error('expected error to be thrown');
    }
    expect(expectedError.message).to.be.equal('Async error in undo');
  });

  it('await should catch error redo async', async () => {
    let expectedError: Error | undefined = undefined;
    await undoManager.add(ThrowErrorAsyncRedo);
    await undoManager.undo();
    expect(modifiedValue).to.be.equal(-1);
    try {
      await undoManager.redo();
    } catch (e) {
      expectedError = e as Error;
    }
    expect(expectedError).to.be.not.undefined;

    if (!expectedError) {
      throw new Error('expected error to be thrown');
    }
    expect(expectedError.message).to.be.equal('Async error in redo');
  });

  describe('addListeners / removeListeners', () => {
    let target: EventTarget;
    const fireKey = (
      key: string,
      opts: {ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean} = {},
    ) => {
      const event = Object.assign(new Event('keydown'), {
        key,
        ctrlKey: opts.ctrlKey ?? false,
        metaKey: opts.metaKey ?? false,
        shiftKey: opts.shiftKey ?? false,
        altKey: opts.altKey ?? false,
        preventDefault: () => undefined,
      });
      target.dispatchEvent(event);
    };

    beforeEach(() => {
      target = new EventTarget();
      modifiedValue = 0;
      // enableShortcuts must be true for these tests
      undoManager = new UndoManager({onChange: onChangeSpy, enableShortcuts: true});
    });

    it('Ctrl+Z triggers undo', async () => {
      await undoManager.add(OneRemoveOneAdd);
      undoManager.addListeners(target);
      fireKey('z', {ctrlKey: true});
      await new Promise(r => setTimeout(r, 10));
      expect(modifiedValue).to.equal(-1);
      undoManager.removeListeners(target);
    });

    it('Ctrl+Shift+Z triggers redo', async () => {
      await undoManager.add(OneRemoveOneAdd);
      await undoManager.undo();
      undoManager.addListeners(target);
      fireKey('z', {ctrlKey: true, shiftKey: true});
      await new Promise(r => setTimeout(r, 10));
      expect(modifiedValue).to.equal(0);
      undoManager.removeListeners(target);
    });

    it('Ctrl+Y triggers redo', async () => {
      await undoManager.add(OneRemoveOneAdd);
      await undoManager.undo();
      undoManager.addListeners(target);
      fireKey('y', {ctrlKey: true});
      await new Promise(r => setTimeout(r, 10));
      expect(modifiedValue).to.equal(0);
      undoManager.removeListeners(target);
    });

    it('Cmd+Z (metaKey) triggers undo', async () => {
      await undoManager.add(OneRemoveOneAdd);
      undoManager.addListeners(target);
      fireKey('z', {metaKey: true});
      await new Promise(r => setTimeout(r, 10));
      expect(modifiedValue).to.equal(-1);
      undoManager.removeListeners(target);
    });

    it('Cmd+Shift+Z (metaKey) triggers redo', async () => {
      await undoManager.add(OneRemoveOneAdd);
      await undoManager.undo();
      undoManager.addListeners(target);
      fireKey('z', {metaKey: true, shiftKey: true});
      await new Promise(r => setTimeout(r, 10));
      expect(modifiedValue).to.equal(0);
      undoManager.removeListeners(target);
    });

    it('removeListeners stops handling events', async () => {
      await undoManager.add(OneRemoveOneAdd);
      undoManager.addListeners(target);
      undoManager.removeListeners(target);
      fireKey('z', {ctrlKey: true});
      await new Promise(r => setTimeout(r, 10));
      expect(modifiedValue).to.equal(0);
    });

    it('does not trigger without modifier key', async () => {
      await undoManager.add(OneRemoveOneAdd);
      undoManager.addListeners(target);
      fireKey('z');
      await new Promise(r => setTimeout(r, 10));
      expect(modifiedValue).to.equal(0);
      undoManager.removeListeners(target);
    });

    it('enableShortcuts: false disables shortcut handling', async () => {
      undoManager = new UndoManager({enableShortcuts: false});
      await undoManager.add(OneRemoveOneAdd);
      undoManager.addListeners(target);
      fireKey('z', {ctrlKey: true});
      await new Promise(r => setTimeout(r, 10));
      expect(modifiedValue).to.equal(0);
      undoManager.removeListeners(target);
    });

    it('custom undo/redo keys (other platform)', async () => {
      undoManager = new UndoManager({
        enableShortcuts: true,
        shortcuts: {
          other: {
            undo: {key: 'u'},
            redo: {key: 'r'},
          },
        },
      });
      await undoManager.add(OneRemoveOneAdd);
      undoManager.addListeners(target);
      fireKey('u', {ctrlKey: true});
      await new Promise(r => setTimeout(r, 10));
      expect(modifiedValue).to.equal(-1);
      fireKey('r', {ctrlKey: true});
      await new Promise(r => setTimeout(r, 10));
      expect(modifiedValue).to.equal(0);
      undoManager.removeListeners(target);
    });

    it('custom undo/redo keys (mac)', async () => {
      undoManager = new UndoManager({
        enableShortcuts: true,
        shortcuts: {
          mac: {
            undo: {key: 'u'},
            redo: {key: 'r'},
          },
        },
      });
      await undoManager.add(OneRemoveOneAdd);
      undoManager.addListeners(target);
      fireKey('u', {metaKey: true});
      await new Promise(r => setTimeout(r, 10));
      expect(modifiedValue).to.equal(-1);
      fireKey('r', {metaKey: true});
      await new Promise(r => setTimeout(r, 10));
      expect(modifiedValue).to.equal(0);
      undoManager.removeListeners(target);
    });

    it('custom redo with shift binding', async () => {
      undoManager = new UndoManager({
        enableShortcuts: true,
        shortcuts: {
          other: {
            redo: {key: 'z', shiftKey: true},
          },
        },
      });
      await undoManager.add(OneRemoveOneAdd);
      await undoManager.undo();
      undoManager.addListeners(target);
      // Ctrl+Y should NOT trigger redo (not in custom config)
      fireKey('y', {ctrlKey: true});
      await new Promise(r => setTimeout(r, 10));
      expect(modifiedValue).to.equal(-1);
      // Ctrl+Shift+Z should trigger redo
      fireKey('z', {ctrlKey: true, shiftKey: true});
      await new Promise(r => setTimeout(r, 10));
      expect(modifiedValue).to.equal(0);
      undoManager.removeListeners(target);
    });
  });
});
