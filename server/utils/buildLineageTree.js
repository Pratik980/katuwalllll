const getId = (reference) => {
  const id = reference?._id ?? reference;
  return id === undefined || id === null ? null : String(id);
};

const compareRoots = (left, right, memberMap) => {
  const leftNode = memberMap[left];
  const rightNode = memberMap[right];
  const childDifference = rightNode.children.length - leftNode.children.length;
  if (childDifference !== 0) return childDifference;

  const roleRank = (member) => {
    if (member.lineageRole === 'lineage_head') return 0;
    if (member.lineageRole === 'spouse') return 2;
    return 1;
  };
  const roleDifference = roleRank(leftNode) - roleRank(rightNode);
  if (roleDifference !== 0) return roleDifference;

  const generationDifference = (leftNode.generation || Infinity) - (rightNode.generation || Infinity);
  if (Number.isFinite(generationDifference) && generationDifference !== 0) {
    return generationDifference;
  }

  return left.localeCompare(right);
};

export const buildLineageTree = (members) => {
  if (!members?.length) return [];

  const memberMap = {};
  members.forEach((member) => {
    const memberId = getId(member._id);
    if (memberId) {
      memberMap[memberId] = {
        ...member,
        children: [],
        spouses: [],
        parents: [],
        level: 0,
        isLineageSource: true,
      };
    }
  });

  members.forEach((member) => {
    const memberId = getId(member._id);
    const node = memberMap[memberId];
    if (!node) return;

    ['spouse', 'husband', 'wife'].forEach((field) => {
      const spouseId = getId(member[field]);
      if (!spouseId || !memberMap[spouseId] || spouseId === memberId) return;

      if (!node.spouses.includes(spouseId)) node.spouses.push(spouseId);
      if (!memberMap[spouseId].spouses.includes(memberId)) {
        memberMap[spouseId].spouses.push(memberId);
      }
    });

    const parentIds = ['father', 'mother']
      .map((field) => getId(member[field]))
      .filter((id) => id && memberMap[id]);

    parentIds.forEach((parentId) => {
      if (!node.parents.includes(parentId)) node.parents.push(parentId);
    });

    let lineageParentId = parentIds[0];
    if (!lineageParentId) {
      lineageParentId = ['grandfather', 'grandmother']
        .map((field) => getId(member[field]))
        .find((id) => id && memberMap[id]);
      if (lineageParentId && !node.parents.includes(lineageParentId)) {
        node.parents.push(lineageParentId);
      }
    }

    if (lineageParentId && !memberMap[lineageParentId].children.includes(memberId)) {
      memberMap[lineageParentId].children.push(memberId);
    }
  });

  members.forEach((member) => {
    const memberId = getId(member._id);
    const node = memberMap[memberId];
    if (!node || node.spouses.length || member.maritalStatus !== 'married') return;

    const spouseName = member.gender === 'female' ? member.husbandName : member.wifeName;
    if (!spouseName?.trim()) return;

    const spouseId = `details-${memberId}`;
    memberMap[spouseId] = {
      _id: spouseId,
      name: spouseName.trim(),
      gender: member.gender === 'female' ? 'male' : 'female',
      dob: member.gender === 'female' ? member.husbandDob : member.wifeDob,
      relationship: member.gender === 'female' ? 'husband' : 'wife',
      isAlive: true,
      photo: null,
      isSyntheticSpouse: true,
      children: [],
      spouses: [],
      parents: [],
      level: 0,
      isLineageSource: false,
    };
    node.spouses.push(spouseId);
  });

  const rootCandidates = Object.values(memberMap)
    .filter((member) => member.parents.length === 0 && !member.isSyntheticSpouse);
  const rootIds = new Set(rootCandidates.map((member) => String(member._id)));
  const roots = rootCandidates.filter((member) => {
    const memberId = String(member._id);
    const rootSpouses = member.spouses.filter((spouseId) => rootIds.has(spouseId));
    return !rootSpouses.some((spouseId) =>
      compareRoots(spouseId, memberId, memberMap) < 0
    );
  });

  const enrichNode = (node, level, visited) => {
    const nodeId = String(node._id);
    if (visited.has(nodeId)) {
      return { ...node, level, children: [], spouses: [] };
    }

    const nextVisited = new Set(visited).add(nodeId);
    const spouseNodes = node.spouses
      .map((spouseId) => memberMap[spouseId])
      .filter(Boolean);
    const childIds = new Set(node.children);
    spouseNodes.forEach((spouse) => spouse.children.forEach((childId) => childIds.add(childId)));

    return {
      ...node,
      level,
      children: [...childIds]
        .map((childId) => memberMap[childId])
        .filter(Boolean)
        .map((child) => enrichNode(child, level + 1, nextVisited)),
      spouses: spouseNodes.map((spouse) => ({
        ...spouse,
        level,
        children: [],
        spouses: [],
        isLineageSource: false,
      })),
    };
  };

  return roots.map((root) => enrichNode(root, 0, new Set()));
};
