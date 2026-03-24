const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    skill: {
      type: String,
      required: [true, 'Please add a skill title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
    },
    category: {
      type: String,
      required: [true, 'Please add a category'],
    },
    price: {
      type: String,
      required: [true, 'Please add a price'],
    },
    type: {
      type: String,
      enum: ['offering', 'seeking'],
      required: true,
    },
    rating: {
      type: Number,
      default: 0,
    },
    profileImage: {
      type: String,
    },
    tags: [String],
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for 'id' to match frontend expectation
skillSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

module.exports = mongoose.model('Skill', skillSchema);
