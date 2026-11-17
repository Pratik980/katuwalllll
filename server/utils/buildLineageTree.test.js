import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLineageTree } from './buildLineageTree.js';

const collectIds = (roots) => {
  const ids = [];
  const visit = (node) => {
    ids.push(String(node._id));
    node.spouses.forEach((spouse) => ids.push(String(spouse._id)));
    node.children.forEach(visit);
  };
  roots.forEach(visit);
  return ids;
};

test('links either spouse entry order and renders the pair once', () => {
  const members = [
    { _id: 'father', name: 'Father', gender: 'male' },
    { _id: 'mother', name: 'Mother', gender: 'female', spouse: 'father' },
    {
      _id: 'child',
      name: 'Child',
      gender: 'female',
      father: 'father',
      mother: 'mother',
    },
  ];

  const roots = buildLineageTree(members);

  assert.equal(roots.length, 1);
  assert.equal(String(roots[0]._id), 'father');
  assert.deepEqual(roots[0].spouses.map((spouse) => String(spouse._id)), ['mother']);
  assert.deepEqual(roots[0].children.map((child) => String(child._id)), ['child']);
  assert.equal(collectIds(roots).filter((id) => id === 'mother').length, 1);
});

test('keeps linked spouse records outside the selected family in the tree', () => {
  const roots = buildLineageTree([
    { _id: 'wife', name: 'Wife', gender: 'female', family: 'selected', husband: 'husband' },
    { _id: 'husband', name: 'Husband', gender: 'male', family: 'other' },
  ]);

  assert.equal(roots.length, 1);
  assert.notEqual(roots[0].name, roots[0].spouses[0].name);
  assert.deepEqual(
    new Set([roots[0].name, roots[0].spouses[0].name]),
    new Set(['Wife', 'Husband'])
  );
  assert.equal(collectIds(roots).filter((id) => id === 'husband').length, 1);
});

test('creates a display-only spouse card when only spouse details exist', () => {
  const roots = buildLineageTree([
    {
      _id: 'member',
      name: 'Member',
      gender: 'male',
      maritalStatus: 'married',
      wifeName: 'Spouse Name',
      wifeDob: '1990-02-03',
    },
  ]);

  assert.equal(roots.length, 1);
  assert.equal(roots[0].spouses.length, 1);
  assert.equal(roots[0].spouses[0].name, 'Spouse Name');
  assert.equal(roots[0].spouses[0].isSyntheticSpouse, true);
});

test('lays out a large sibling group once without duplicating two-parent children', () => {
  const children = Array.from({ length: 40 }, (_, index) => ({
    _id: `child-${index}`,
    father: 'father',
    mother: 'mother',
  }));
  const roots = buildLineageTree([
    { _id: 'father', gender: 'male', spouse: 'mother' },
    { _id: 'mother', gender: 'female', spouse: 'father' },
    ...children,
  ]);
  const ids = collectIds(roots);

  assert.equal(roots.length, 1);
  assert.equal(roots[0].children.length, 40);
  assert.equal(new Set(ids).size, ids.length);
});
