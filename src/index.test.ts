/* eslint-disable @typescript-eslint/naming-convention */
import {expect} from 'chai';
import sinon from 'sinon';
import {UndoManager} from './index.js';

let modifiedValue = 0;
const onChangeSpy = sinon.spy();

const undoManager = new UndoManager({
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
  void undoManager.add(OneRemoveOneAdd);
  void undoManager.add(OneRemoveOneExecute);
  expect(modifiedValue).to.be.equal(1);
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.false;
  expect(onChangeSpy.callCount).to.be.equal(1);
});

test('undo two entries', () => {
  void undoManager.undo();
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.true;
  expect(modifiedValue).to.be.equal(0);
  void undoManager.undo();
  expect(modifiedValue).to.be.equal(-1);
  expect(undoManager.canUndo).to.be.false;
  expect(undoManager.canRedo).to.be.true;
  expect(onChangeSpy.callCount).to.be.equal(3);
});

test('add one more entry', () => {
  void undoManager.add(OneRemoveOneAdd);
  expect(modifiedValue).to.be.equal(-1);
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.false;
  expect(onChangeSpy.callCount).to.be.equal(5);
});

test('add one more entry should have no changes', () => {
  void undoManager.add(OneRemoveOneAdd);
  expect(modifiedValue).to.be.equal(-1);
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.false;
  expect(onChangeSpy.callCount).to.be.equal(5);
});

test('redo two items in stack that can not be redone', () => {
  void undoManager.redo();
  void undoManager.redo();
  expect(modifiedValue).to.be.equal(-1);
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.false;
  expect(onChangeSpy.callCount).to.be.equal(5);
});

test('add / redo / undo', () => {
  void undoManager.add(OneRemoveOneAdd);
  void undoManager.undo();
  void undoManager.undo();
  void undoManager.undo();
  void undoManager.redo();
  void undoManager.redo();

  expect(modifiedValue).to.be.equal(-2);
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.true;
  expect(onChangeSpy.callCount).to.be.equal(8);
});

test('grouping undo /redo', () => {
  // reset stack to start
  void undoManager.undo();
  void undoManager.undo();
  expect(undoManager.canUndo).to.be.false;
  expect(undoManager.canRedo).to.be.true;
  //reset modified Value
  modifiedValue = 0;
  void undoManager.add(OneRemoveOneExecute);
  expect(modifiedValue).to.be.equal(1);
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.false;

  undoManager.startGroup();
  void undoManager.add(OneRemoveOneExecute);
  void undoManager.add(OneRemoveOneExecute);
  void undoManager.add(OneRemoveOneExecute);
  void undoManager.add(OneRemoveOneExecute);
  undoManager.endGroup();
  expect(modifiedValue).to.be.equal(5);
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.false;
  void undoManager.undo();
  expect(modifiedValue).to.be.equal(1);
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.true;
  void undoManager.undo();
  expect(modifiedValue).to.be.equal(0);
  expect(undoManager.canUndo).to.be.false;
  expect(undoManager.canRedo).to.be.true;
  void undoManager.redo();
  expect(modifiedValue).to.be.equal(1);
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.true;
  void undoManager.redo();
  expect(modifiedValue).to.be.equal(5);
  expect(undoManager.canUndo).to.be.true;
  expect(undoManager.canRedo).to.be.false;
  void undoManager.undo();
  void undoManager.undo();
});

test('past zero group tests, subsequent groups', () => {
  expect(modifiedValue).to.be.equal(0);
  undoManager.startGroup();
  void undoManager.add(OneRemoveOneExecute);
  void undoManager.add(OneRemoveOneExecute);
  void undoManager.add(OneRemoveOneExecute);
  void undoManager.add(OneRemoveOneExecute);
  undoManager.endGroup();
  expect(modifiedValue).to.be.equal(4);
  undoManager.startGroup();
  void undoManager.add(OneRemoveOneExecute);
  void undoManager.add(OneRemoveOneExecute);
  void undoManager.add(OneRemoveOneExecute);
  void undoManager.add(OneRemoveOneExecute);
  undoManager.endGroup();
  expect(modifiedValue).to.be.equal(8);
  void undoManager.undo();
  expect(modifiedValue).to.be.equal(4);
  void undoManager.undo();
  expect(modifiedValue).to.be.equal(0);
  void undoManager.redo();
  expect(modifiedValue).to.be.equal(4);
  void undoManager.redo();
  expect(modifiedValue).to.be.equal(8);
});
