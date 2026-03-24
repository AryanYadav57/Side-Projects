const express = require('express');
const router = express.Router();
const Skill = require('../models/Skill');

// @desc    Get all skills
// @route   GET /api/skills
router.get('/', async (req, res) => {
  try {
    const skills = await Skill.find().populate('user', 'name email');
    res.json(skills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Create a skill
// @route   POST /api/skills
router.post('/', async (req, res) => {
  const { title, description, category, user, price, type, rating, profileImage, name, tags } = req.body;

  try {
    const newSkill = new Skill({
      title,
      description,
      category,
      user,
      price,
      type,
      rating,
      profileImage,
      name,
      tags
    });

    const savedSkill = await newSkill.save();
    res.status(201).json(savedSkill);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
