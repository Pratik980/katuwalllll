import Member from '../models/Member.js';
import Family from '../models/Family.js';
import Donation from '../models/Donation.js';
import Document from '../models/Document.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { authorizedFamilyIds } from '../middlewares/authentication.js';

const isObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(String(value ?? ''));

const scopedIds = async (req) => {
  const ids = req.authorizedFamilyIds !== undefined
    ? req.authorizedFamilyIds
    : await authorizedFamilyIds(req.user);
  if (ids === null) return null;
  return (Array.isArray(ids) ? ids : []).map(String).filter(isObjectId);
};

const scopeFor = async (req) => {
  const ids = await scopedIds(req);
  if (req.user?.role === 'user') {
    return {
      memberMatch: { createdBy: req.user._id },
      familyMatch: ids === null ? {} : { _id: { $in: ids } },
    };
  }
  return {
    memberMatch: ids === null ? {} : { family: { $in: ids } },
    familyMatch: ids === null ? {} : { _id: { $in: ids } },
  };
};

const memberIdsForFamilies = async (familyIds) => {
  if (familyIds === null) return null;
  const validIds = (Array.isArray(familyIds) ? familyIds : []).map(String).filter(isObjectId);
  if (!validIds.length) return [];
  const members = await Member.find({ family: { $in: validIds } }).select('_id').lean();
  return members.map((member) => member._id);
};

const scopedDonationMatch = async (req, familyIds) => {
  if (req.user?.role !== 'admin') return { _id: null };
  if (familyIds === null) return {};
  const memberIds = await memberIdsForFamilies(familyIds);
  if (!memberIds?.length) return { _id: null };
  return { donorId: { $in: memberIds } };
};

const scopedDocumentMatch = async (req, familyIds) => {
  if (!['admin', 'user'].includes(req.user?.role)) return { _id: null };
  if (familyIds === null) return {};
  const memberIds = await memberIdsForFamilies(familyIds);
  if (!memberIds?.length) return { _id: null };
  return { member: { $in: memberIds } };
};

const monthlyRegistrationStats = async (match) => {
  const rows = await Member.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((row) => ({ month: row._id, count: row.count }));
};

const personalFamilyFor = async (user) => {
  let familyId = null;

  if (user.linkedMember) {
    const linked = await Member.findById(user.linkedMember).select('family').lean();
    familyId = linked?.family;
  }

  if (!familyId && user._id) {
    const own = await Member.findOne({ createdBy: user._id }).select('family').lean();
    familyId = own?.family;
  }

  if (!isObjectId(familyId)) return null;

  const family = await Family.findById(familyId)
    .select('familyName familyNumber houseIdentifier house')
    .populate('house', 'houseNumber houseName')
    .lean();

  if (!family) return null;

  return {
    name: family.familyName,
    number: family.familyNumber,
    houseIdentifier: family.houseIdentifier || null,
    houseNumber: family.house?.houseNumber || null,
    houseName: family.house?.houseName || null,
  };
};

export const getDashboardStats = async (req, res) => {
  try {
    const role = req.user?.role;
    const isAdmin = role === 'admin';
    const isStaff = role === 'staff';
    const isUser = role === 'user';

    const { memberMatch, familyMatch } = await scopeFor(req);
    const familyIds = await scopedIds(req);
    const statsMemberMatch = isUser ? memberMatch : {};
    const visibleFamilyMatch = isUser ? familyMatch : {};
    const registrationMatch = isUser ? { createdBy: req.user._id } : {};
    const documentMatch = await scopedDocumentMatch(req, familyIds);

    const [
      summaryFamilyCount,
      totalDocuments,
      genderStats,
      lifeStatusStats,
      recentMembers,
      recentNotifications,
      generations,
      registrationStats,
      familyStatusStats,
    ] = await Promise.all([
      Family.countDocuments(visibleFamilyMatch),
      Document.countDocuments(documentMatch),
      Member.aggregate([
        { $match: statsMemberMatch },
        { $group: { _id: '$gender', count: { $sum: 1 } } },
      ]),
      Member.aggregate([
        { $match: statsMemberMatch },
        { $group: { _id: '$isAlive', count: { $sum: 1 } } },
      ]),
      Member.find(memberMatch)
        .select('name photo gender isAlive createdAt createdBy')
        .sort({ createdAt: -1 })
        .limit(5),
      Notification.find(Notification.visibleTo(req.user))
        .sort({ createdAt: -1 })
        .limit(5),
      Member.aggregate([
        { $match: statsMemberMatch },
        { $group: { _id: '$generation', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      monthlyRegistrationStats(registrationMatch),
      Family.aggregate([
        { $match: visibleFamilyMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    let systemMemberCount = 0;
    let systemFamilyCount = 0;
    let totalUsers = 0;
    let totalStaff = 0;
    let membersAddedAcrossSystem = 0;
    let activity = null;
    let systemOverview = null;

    if (isAdmin || isStaff) {
      const [roleCounts, allMembers, allFamilies] = await Promise.all([
        User.aggregate([
          { $group: { _id: '$role', count: { $sum: 1 } } },
        ]).then((rows) => rows.reduce((acc, row) => {
          acc[row._id] = row.count;
          return acc;
        }, {})),
        Member.countDocuments({}),
        Family.countDocuments({}),
      ]);

      totalUsers = roleCounts.user || 0;
      totalStaff = roleCounts.staff || 0;
      systemMemberCount = allMembers;
      systemFamilyCount = allFamilies;
      membersAddedAcrossSystem = allMembers;

      if (isAdmin) {
        const actors = await User.find({ role: { $in: ['staff', 'user'] } })
          .select('_id role')
          .lean();
        const staffIds = actors.filter((actor) => actor.role === 'staff').map((actor) => actor._id);
        const userIds = actors.filter((actor) => actor.role === 'user').map((actor) => actor._id);
        const [
          staffMembers,
          staffDonations,
          userMembers,
          userDonations,
        ] = await Promise.all([
          Member.countDocuments({ createdBy: { $in: staffIds } }),
          Donation.countDocuments({ createdBy: { $in: staffIds } }),
          Member.countDocuments({ createdBy: { $in: userIds } }),
          Donation.countDocuments({ createdBy: { $in: userIds } }),
        ]);

        activity = {
          staff: staffMembers + staffDonations,
          user: userMembers + userDonations,
        };
        systemOverview = {
          totalMembers: systemMemberCount,
          totalFamilies: systemFamilyCount,
          totalStaff,
          totalUsers,
        };
      }
    }

    let myTotalMembers = 0;
    let personalFamily = null;

    if (isUser) {
      [myTotalMembers, personalFamily] = await Promise.all([
        Member.countDocuments({ createdBy: req.user._id }),
        personalFamilyFor(req.user),
      ]);
    }

    let totalDonations = 0;
    let totalDonationAmount = 0;
    let recentDonations = [];
    let monthlyDonations = [];

    if (isAdmin) {
      const donationMatch = await scopedDonationMatch(req, familyIds);
      const [donationCount, donationTotal, recent, monthly] = await Promise.all([
        Donation.countDocuments(donationMatch),
        Donation.aggregate([
          { $match: donationMatch },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Donation.find(donationMatch)
          .select('donorName amount paymentMethod donationDate')
          .sort({ donationDate: -1 })
          .limit(5),
        Donation.aggregate([
          { $match: donationMatch },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$donationDate' } },
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

      totalDonations = donationCount;
      totalDonationAmount = donationTotal[0]?.total || 0;
      recentDonations = recent;
      monthlyDonations = monthly.map((row) => ({
        month: row._id,
        total: row.total,
        count: row.count,
      }));

      if (systemOverview) {
        systemOverview.totalDonations = totalDonations;
        systemOverview.totalEarnings = totalDonationAmount;
      }
    }

    const summary = {
      totalMembers: isUser ? myTotalMembers : membersAddedAcrossSystem,
      totalFamilies: summaryFamilyCount,
      totalDocuments,
      ...(isAdmin || isStaff ? { totalUsers, membersAddedAcrossSystem } : {}),
      ...(isAdmin ? {
        totalStaff,
        totalDonations,
        totalDonationAmount,
        totalEarnings: totalDonationAmount,
      } : {}),
    };

    res.json({
      summary,
      demographics: {
        gender: genderStats,
        lifeStatus: lifeStatusStats,
        generations: generations.map((row) => ({
          generation: row._id,
          count: row.count,
        })),
      },
      recent: {
        members: recentMembers,
        notifications: recentNotifications,
        ...(isAdmin ? { donations: recentDonations } : {}),
      },
      registrationStats,
      familyStats: {
        total: summaryFamilyCount,
        open: familyStatusStats.find((row) => row._id === 'open')?.count || 0,
        closed: familyStatusStats.find((row) => row._id === 'closed')?.count || 0,
      },
      ...(isAdmin ? { monthlyDonations, activity, systemOverview } : {}),
      ...(isUser ? {
        personal: {
          totalMembersAdded: myTotalMembers,
          family: personalFamily,
        },
      } : {}),
    });
  } catch (error) {
    console.error('getDashboardStats Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getQuickStats = async (req, res) => {
  try {
    const { memberMatch, familyMatch } = await scopeFor(req);

    const [
      totalMembers,
      totalFamilies,
      totalGenerations,
      maleCount,
      femaleCount,
      livingCount,
      deceasedCount,
    ] = await Promise.all([
      Member.countDocuments(memberMatch),
      Family.countDocuments(familyMatch),
      Member.distinct('generation', memberMatch).then(gens => gens.filter(g => g !== undefined).length),
      Member.countDocuments({ ...memberMatch, gender: 'male' }),
      Member.countDocuments({ ...memberMatch, gender: 'female' }),
      Member.countDocuments({ ...memberMatch, isAlive: true }),
      Member.countDocuments({ ...memberMatch, isAlive: false }),
    ]);

    res.json({
      totalMembers,
      totalFamilies,
      totalGenerations,
      maleCount,
      femaleCount,
      livingCount,
      deceasedCount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
