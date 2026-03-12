const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Lore = require('../models/Lore');
const Marker = require('../models/Marker');
const authMiddleware = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, 'lore-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/', authMiddleware, async (req, res) => {
  const lores = await Lore.findAll({ where: { UserId: req.userId } });
  res.json(lores);
});

router.post('/', authMiddleware, upload.single('loreImage'), async (req, res) => {
  const lore = await Lore.create({
    title: req.body.title,
    content: req.body.content,
    imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
    UserId: req.userId
  });
  res.json(lore);
});

router.put('/:id', authMiddleware, upload.single('loreImage'), async (req, res) => {
  const updateData = { title: req.body.title, content: req.body.content };
  if (req.file) updateData.imageUrl = `/uploads/${req.file.filename}`;
  await Lore.update(updateData, { where: { id: req.params.id, UserId: req.userId } });
  res.json({ message: "Uppdaterad" });
});

router.delete('/:id', authMiddleware, async (req, res) => {
  await Marker.update({ LoreId: null }, { where: { LoreId: req.params.id } });
  await Lore.destroy({ where: { id: req.params.id, UserId: req.userId } });
  res.json({ message: "Raderad" });
});

module.exports = router;