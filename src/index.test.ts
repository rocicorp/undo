/* eslint-disable @typescript-eslint/naming-convention */
import {expect} from 'chai';
import sinon from 'sinon';
import {UndoManager} from './index.js';

let undoManager: UndoManager;
let modifiedValue = 0;
let onChangeSpy = sinon.spy();

undoManager = new UndoManager({
  onChange: onChangeSpy,
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
test('added redo added execute', () => {
  undoManager.add(OneRemoveOneAdd);
  undoManager.add(OneRemoveOneExecute);
  expect(modifiedValue).to.be.equal(1);
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.false;
  expect(onChangeSpy.callCount).to.be.equal(1);
});

test('undo two entries', () => {
  undoManager.undo();
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.true;
  expect(modifiedValue).to.be.equal(0);
  undoManager.undo();
  expect(modifiedValue).to.be.equal(-1);
  expect(undoManager.canUndo).to.be.false;
  expect(undoManager.canRedo).to.be.true;
  expect(onChangeSpy.callCount).to.be.equal(3);
});

test('add one more entry', () => {
  undoManager.add(OneRemoveOneAdd);
  expect(modifiedValue).to.be.equal(-1);
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.false;
  expect(onChangeSpy.callCount).to.be.equal(5);
});

test('add one more entry should have no changes', () => {
  undoManager.add(OneRemoveOneAdd);
  expect(modifiedValue).to.be.equal(-1);
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.false;
  expect(onChangeSpy.callCount).to.be.equal(5);
});

test('redo two items in stack that can not be redone', () => {
  undoManager.redo();
  undoManager.redo();
  expect(modifiedValue).to.be.equal(-1);
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.false;
  expect(onChangeSpy.callCount).to.be.equal(5);
});

test('add / redo / undo', () => {
  undoManager.add(OneRemoveOneAdd);
  undoManager.undo();
  undoManager.undo();
  undoManager.undo();
  undoManager.redo();
  undoManager.redo();

  expect(modifiedValue).to.be.equal(-2);
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.true;
  expect(onChangeSpy.callCount).to.be.equal(8);
});

test('grouping undo /redo', () => {
  // reset stack to start
  undoManager.undo();
  undoManager.undo();
  expect(undoManager.canUndo).to.be.false;
  expect(undoManager.canRedo).to.be.true;
  //reset modified Value
  modifiedValue = 0;
  undoManager.add(OneRemoveOneExecute);
  expect(modifiedValue).to.be.equal(1);
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.false;

  undoManager.startGroup();
  undoManager.add(OneRemoveOneExecute);
  undoManager.add(OneRemoveOneExecute);
  undoManager.add(OneRemoveOneExecute);
  undoManager.add(OneRemoveOneExecute);
  undoManager.endGroup();
  expect(modifiedValue).to.be.equal(5);
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.false;
  undoManager.undo();
  expect(modifiedValue).to.be.equal(1);
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.true;
  undoManager.undo();
  expect(modifiedValue).to.be.equal(0);
  expect(undoManager.canUndo).to.be.false;
  expect(undoManager.canRedo).to.be.true;
  undoManager.redo();
  expect(modifiedValue).to.be.equal(1);
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.true;
  undoManager.redo();
  expect(modifiedValue).to.be.equal(5);
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.false;
});
