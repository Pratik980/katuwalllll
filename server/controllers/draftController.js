
import Draft from '../models/Draft.js';

const DRAFT_WRITABLE_FIELDS = ['module', 'data'];

const pickFields = (source, fields) => {
  const picked = {};
  fields.forEach((field) => {
    if (source && Object.prototype.hasOwnProperty.call(source, field)) {
      picked[field] = source[field];
    }
  });
  return picked;
};

const ownedQuery = (req, extra = {}) => {
  if (req.user?.role === 'admin') return extra;
  return { ...extra, createdBy: req.user?._id || { $in: [] } };
};

export const getDrafts = async (req, res) => {
  try {
    const { module, status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = ownedQuery(req);
    if (module) query.module = module;
    if (status) query.status = status;

    const [drafts, total] = await Promise.all([
      Draft.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Draft.countDocuments(query),
    ]);

    res.json({
      data: drafts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getDraftById = async (req, res) => {
  try {
    const draft = await Draft.findOne(ownedQuery(req, { _id: req.params.id }));
    if (!draft) {
      return res.status(404).json({ message: 'Draft not found' });
    }
    res.json(draft);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createDraft = async (req, res) => {
  try {
    const draft = new Draft({
      ...pickFields(req.body, DRAFT_WRITABLE_FIELDS),
      status: 'draft',
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null,
    });

    await draft.save();

    res.status(201).json(draft);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateDraft = async (req, res) => {
  try {
    const updatedDraft = await Draft.findOneAndUpdate(
      ownedQuery(req, { _id: req.params.id }),
      {
        ...pickFields(req.body, DRAFT_WRITABLE_FIELDS),
        updatedBy: req.user?._id || null,
      },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedDraft) {
      return res.status(404).json({ message: 'Draft not found' });
    }

    res.json(updatedDraft);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteDraft = async (req, res) => {
  try {
    const draft = await Draft.findOneAndDelete(ownedQuery(req, { _id: req.params.id }));
    if (!draft) {
      return res.status(404).json({ message: 'Draft not found' });
    }

    res.json({ message: 'Draft deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const submitDraft = async (req, res) => {
  try {
    const draft = await Draft.findOne(ownedQuery(req, { _id: req.params.id }));
    if (!draft) {
      return res.status(404).json({ message: 'Draft not found' });
    }

    draft.status = 'submitted';
    draft.updatedBy = req.user?._id || null;
    await draft.save();

    res.json({
      message: 'Draft submitted successfully',
      draft,
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
