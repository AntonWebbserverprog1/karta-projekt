const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Map = require('../models/Map');
const Marker = require('../models/Marker');
const authMiddleware = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/', authMiddleware, async (req, res) => {
    const maps = await Map.findAll({ where: { UserId: req.userId } });
    res.json(maps);
});

router.post('/upload', authMiddleware, upload.single('mapImage'), async (req, res) => {
    if(!req.file) return res.status(400).json({error: "Ingen fil uppladdad"});
    const map = await Map.create({ 
        name: req.body.name || "Namnlös", 
        imageUrl: `/uploads/${req.file.filename}`, 
        UserId: req.userId 
    });
    res.json(map);
});

router.delete('/:id', authMiddleware, async (req, res) => {
    await Marker.destroy({ where: { MapId: req.params.id } });
    await Map.destroy({ where: { id: req.params.id, UserId: req.userId } });
    res.json({ message: "Raderad" });
});

router.get('/:id/markers', authMiddleware, async (req, res) => {
    const markers = await Marker.findAll({ where: { MapId: req.params.id } });
    res.json(markers);
});

router.post('/markers', authMiddleware, async (req, res) => {
    const marker = await Marker.create({ ...req.body });
    res.json(marker);
});

router.delete('/markers/:id', authMiddleware, async (req, res) => {
    await Marker.destroy({ where: { id: req.params.id } });
    res.json({ message: "Markör raderad" });
});

module.exports = router;