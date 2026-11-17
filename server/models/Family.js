// import mongoose from 'mongoose';
// import { v4 as uuidv4 } from 'uuid';

// const familySchema = new mongoose.Schema(
//   {
//     uuid: {
//       type: String,
//       default: uuidv4,
//       unique: true,
//       index: true,
//     },
//     familyName: {
//       type: String,
//       required: true,
//       trim: true,
//       index: true,
//     },
//     familyNumber: {
//       type: String,
//       required: true,
//       trim: true,
//       index: true,
//     },
//     house: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'House',
//       required: true,
//       index: true,
//     },
//     vanshaGenerationNumber: {
//       type: String,
//       trim: true,
//       index: true,
//     },
//     familyHead: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Member',
//       index: true,
//     },
//     clan: {
//       type: String,
//       trim: true,
//     },
//     origin: {
//       type: String,
//       trim: true,
//     },
//     currentAddress: {
//       type: String,
//       trim: true,
//     },
//     headOfFamily: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Member',
//     },
//     totalMembers: {
//       type: Number,
//       default: 0,
//     },
//     totalGenerations: {
//       type: Number,
//       default: 0,
//     },
//     familyPhoto: {
//       type: String,
//       default: null,
//     },
//     description: {
//       type: String,
//       trim: true,
//     },
//     status: {
//       type: String,
//       enum: ['open', 'closed'],
//       default: 'open',
//     },
//     closedAt: {
//       type: Date,
//       default: null,
//     },
//     closedReason: {
//       type: String,
//       trim: true,
//     },
//     reopenedAt: {
//       type: Date,
//       default: null,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // Compound index for house + familyNumber uniqueness
// familySchema.index({ house: 1, familyNumber: 1 }, { unique: true });

// // Indexes for performance
// familySchema.index({ familyName: 'text' });
// familySchema.index({ status: 1 });
// familySchema.index({ clan: 1 });

// // Virtual populate: Family -> Members
// familySchema.virtual('members', {
//   ref: 'Member',
//   localField: '_id',
//   foreignField: 'family',
// });

// familySchema.set('toJSON', { virtuals: true });
// familySchema.set('toObject', { virtuals: true });

// // Pre-save hook for auto-generating familyNumber within house
// familySchema.pre('save', async function () {
//   if (this.isNew && !this.familyNumber) {
//     const lastFamily = await this.constructor
//       .findOne({ house: this.house })
//       .sort({ familyNumber: -1 });

//     const lastNumber = lastFamily ? parseInt(lastFamily.familyNumber, 10) : 0;
//     this.familyNumber = String(lastNumber + 1);
//   }
// });

// export default mongoose.model('Family', familySchema);
// models/Family.js - FIXED (familyNumber not required)

// import mongoose from 'mongoose';
// import { v4 as uuidv4 } from 'uuid';

// const familySchema = new mongoose.Schema(
//   {
//     uuid: {
//       type: String,
//       default: uuidv4,
//       unique: true,
//       index: true,
//     },
//     familyName: {
//       type: String,
//       required: true,
//       trim: true,
//       index: true,
//     },
//     familyNumber: {
//       type: String,
//       // ⭐ REMOVED: required: true - auto-generated in pre-save
//       trim: true,
//       index: true,
//     },
//     house: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'House',
//       required: true,
//       index: true,
//     },
//     vanshaGenerationNumber: {
//       type: String,
//       trim: true,
//       index: true,
//     },
//     familyHead: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Member',
//       index: true,
//     },
//     clan: {
//       type: String,
//       trim: true,
//     },
//     origin: {
//       type: String,
//       trim: true,
//     },
//     currentAddress: {
//       type: String,
//       trim: true,
//     },
//     headOfFamily: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Member',
//     },
//     totalMembers: {
//       type: Number,
//       default: 0,
//     },
//     totalGenerations: {
//       type: Number,
//       default: 0,
//     },
//     familyPhoto: {
//       type: String,
//       default: null,
//     },
//     description: {
//       type: String,
//       trim: true,
//     },
//     status: {
//       type: String,
//       enum: ['open', 'closed'],
//       default: 'open',
//     },
//     closedAt: {
//       type: Date,
//       default: null,
//     },
//     closedReason: {
//       type: String,
//       trim: true,
//     },
//     reopenedAt: {
//       type: Date,
//       default: null,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // Compound index for house + familyNumber uniqueness
// familySchema.index({ house: 1, familyNumber: 1 }, { unique: true });

// // Indexes for performance
// familySchema.index({ familyName: 'text' });
// familySchema.index({ status: 1 });
// familySchema.index({ clan: 1 });

// // Virtual populate: Family -> Members
// familySchema.virtual('members', {
//   ref: 'Member',
//   localField: '_id',
//   foreignField: 'family',
// });

// familySchema.set('toJSON', { virtuals: true });
// familySchema.set('toObject', { virtuals: true });

// // ⭐ FIXED: Pre-save hook for auto-generating familyNumber within house
// familySchema.pre('save', async function() {
//   if (this.isNew && !this.familyNumber) {
//     const lastFamily = await this.constructor
//       .findOne({ house: this.house })
//       .sort({ familyNumber: -1 });

//     const lastNumber = lastFamily ? parseInt(lastFamily.familyNumber, 10) : 0;
//     this.familyNumber = String(lastNumber + 1);
//     console.log(`📝 Auto-generated familyNumber: ${this.familyNumber} for house: ${this.house}`);
//   }
// });

// export default mongoose.model('Family', familySchema);




// models/Family.js - UPDATED VERSION

import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const familySchema = new mongoose.Schema(
  {
    uuid: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
    },
    familyName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    familyNumber: {
      type: String,
      trim: true,
      index: true,
    },
    // ⭐ NEW: House Identifier - S1, S2, S3, etc.
    houseIdentifier: {
      type: String,
      trim: true,
      index: true,
    },
    house: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'House',
      required: true,
      index: true,
    },
    vanshaGenerationNumber: {
      type: String,
      trim: true,
      index: true,
    },
    familyHead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      index: true,
    },
    clan: {
      type: String,
      trim: true,
    },
    origin: {
      type: String,
      trim: true,
    },
    currentAddress: {
      type: String,
      trim: true,
    },
    headOfFamily: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
    },
    totalMembers: {
      type: Number,
      default: 0,
    },
    totalGenerations: {
      type: Number,
      default: 0,
    },
    familyPhoto: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
    closedAt: {
      type: Date,
      default: null,
    },
    closedReason: {
      type: String,
      trim: true,
    },
    reopenedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for house + familyNumber uniqueness
familySchema.index({ house: 1, familyNumber: 1 }, { unique: true });

// Indexes for performance
familySchema.index({ familyName: 'text' });
familySchema.index({ status: 1 });
familySchema.index({ clan: 1 });
familySchema.index({ houseIdentifier: 1 });

// Virtual populate: Family -> Members
familySchema.virtual('members', {
  ref: 'Member',
  localField: '_id',
  foreignField: 'family',
});

familySchema.set('toJSON', { virtuals: true });
familySchema.set('toObject', { virtuals: true });

// ⭐ UPDATED: Pre-save hook for auto-generating familyNumber and houseIdentifier
familySchema.pre('save', async function() {
  if (this.isNew) {
    // Auto-generate familyNumber
    if (!this.familyNumber) {
      const families = await this.constructor
        .find({ house: this.house })
        .select('familyNumber')
        .lean();
      const maxFamilyNumber = families.reduce(
        (max, family) => Math.max(max, Number.parseInt(family.familyNumber, 10) || 0),
        0
      );
      this.familyNumber = String(maxFamilyNumber + 1);
      console.log(`📝 Auto-generated familyNumber: ${this.familyNumber} for house: ${this.house}`);
    }

    // ⭐ NEW: Auto-generate houseIdentifier (S1, S2, S3, etc.)
    if (!this.houseIdentifier) {
      const families = await this.constructor.find().select('houseIdentifier').lean();
      const maxHouseIdentifier = families.reduce((max, family) => {
        const match = /^S(\d+)$/.exec(family.houseIdentifier || '');
        return Math.max(max, match ? Number(match[1]) : 0);
      }, 0);
      this.houseIdentifier = `S${maxHouseIdentifier + 1}`;
      console.log(`📝 Auto-generated houseIdentifier: ${this.houseIdentifier}`);
    }
  }
});

export default mongoose.model('Family', familySchema);