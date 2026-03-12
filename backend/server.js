const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Sequelize, DataTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = "min_hemliga_nyckel_123";
const app = express();

app.use(cors());
app.use(express.json());

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.userId = user.userId;
        next();
    });
};

// --- DATABASE SETUP ---
const dbPath = path.resolve(__dirname, 'database.sqlite');
const sequelize = new Sequelize({ dialect: 'sqlite', storage: dbPath, logging: false, dialectOptions: {
        foreignKeys: true
    }, }); sequelize.query("PRAGMA foreign_keys = ON;");

// --- MODELS ---
const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false }
});

const Campaign = sequelize.define('Campaign', {
    name: { type: DataTypes.STRING, allowNull: false }
});

const Category = sequelize.define('Category', {
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.ENUM('map', 'lore'), allowNull: false },
    CampaignId: { type: DataTypes.INTEGER, allowNull: false }
});

const Map = sequelize.define('Map', {
    name: DataTypes.STRING,
    imageUrl: DataTypes.STRING,
    categoryId: { type: DataTypes.INTEGER, allowNull: true },
    CampaignId: { type: DataTypes.INTEGER, allowNull: false }
});

const Lore = sequelize.define('Lore', {
    title: DataTypes.STRING,
    content: DataTypes.TEXT,
    imageUrl: { type: DataTypes.STRING, allowNull: true },
    categoryId: { type: DataTypes.INTEGER, allowNull: true },
    CampaignId: { type: DataTypes.INTEGER, allowNull: false }
});

const Marker = sequelize.define('Marker', {
    label: DataTypes.STRING,
    posX: DataTypes.FLOAT,
    posY: DataTypes.FLOAT,
    type: DataTypes.STRING, 
    LoreId: { type: DataTypes.INTEGER, allowNull: true },
    targetMapId: { type: DataTypes.INTEGER, allowNull: true }
});

// --- RELATIONSHIPS ---
// User relations
User.hasMany(Campaign, { onDelete: 'CASCADE' });
Campaign.belongsTo(User);

User.hasMany(Map, { onDelete: 'CASCADE' });
Map.belongsTo(User);

User.hasMany(Lore, { onDelete: 'CASCADE' });
Lore.belongsTo(User);

User.hasMany(Category, { onDelete: 'CASCADE' });
Category.belongsTo(User);
Category.belongsTo(Campaign);

// Campaign relations
Campaign.hasMany(Map, { onDelete: 'CASCADE' });
Map.belongsTo(Campaign);

Campaign.hasMany(Lore, { onDelete: 'CASCADE' });
Lore.belongsTo(Campaign);

// Category & Marker relations
Category.hasMany(Map, { foreignKey: 'categoryId' });
Map.belongsTo(Category, { foreignKey: 'categoryId' });

Category.hasMany(Lore, { foreignKey: 'categoryId' });
Lore.belongsTo(Category, { foreignKey: 'categoryId' });

Map.hasMany(Marker, { onDelete: 'CASCADE' });
Marker.belongsTo(Map);

// --- FILE UPLOAD SETUP ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// --- ROUTES: AUTH ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        await User.create({ username: req.body.username, password: hashedPassword });
        res.json({ success: true });
    } catch (err) { res.status(400).json({ error: "Användarnamn upptaget eller felaktigt" }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const user = await User.findOne({ where: { username: req.body.username } });
        if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
            return res.status(401).json({ error: "Fel användarnamn eller lösenord" });
        }
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    } catch (err) { res.status(500).json({ error: "Serverfel vid inloggning" }); }
});

// --- ROUTES: CAMPAIGNS ---
app.get('/api/campaigns', authenticateToken, async (req, res) => {
    res.json(await Campaign.findAll({ where: { UserId: req.userId } }));
});

app.post('/api/campaigns', authenticateToken, async (req, res) => {
    res.json(await Campaign.create({ ...req.body, UserId: req.userId }));
});

// --- ROUTES: MAPS ---
app.get('/api/maps', authenticateToken, async (req, res) => {
    try {
        const { campaignId } = req.query;
        
        // Skapa ett sökfilter
        const whereClause = { UserId: req.userId };
        
        // Lägg bara till CampaignId i sökningen om det faktiskt skickats med
        if (campaignId && campaignId !== 'undefined') {
            whereClause.CampaignId = campaignId;
        }

        const maps = await Map.findAll({ where: whereClause });
        res.json(maps);
    } catch (err) {
        console.error("Fel vid hämtning av kartor:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/maps/upload', authenticateToken, upload.single('mapImage'), async (req, res) => {
    try {
        // 1. Kontrollera att filen faktiskt kom fram
        if (!req.file) {
            return res.status(400).json({ error: "Ingen bildfil hittades i anropet" });
        }

        // 2. Kontrollera att campaignId skickades med
        if (!req.body.campaignId) {
            return res.status(400).json({ error: "Inget campaignId angavs" });
        }

        // 3. Skapa kartan
        const map = await Map.create({ 
            name: req.body.name || "Namnlös karta", 
            imageUrl: `uploads/${req.file.filename}`, 
            UserId: req.userId,
            CampaignId: req.body.campaignId // Säkerställ att detta matchar kolumnen i DB
        });

        res.json(map);
    } catch (err) {
        // Logga det faktiska felet i din terminal så du ser vad som händer
        console.error("DETALJERAT FEL VID UPPLADDNING:", err);
        res.status(500).json({ error: "Serverfel: " + err.message });
    }
});

// Flytta Lore till kategori
app.patch('/api/lore/:id/move', authenticateToken, async (req, res) => {
    try {
        const { categoryId } = req.body;
        await Lore.update(
            { categoryId: categoryId === "" ? null : categoryId },
            { where: { id: req.params.id, UserId: req.userId } }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/markers', authenticateToken, async (req, res) => {
    const { campaignId } = req.query;
    try {
        // Skapa filter för mappen som markörerna tillhör
        const mapFilter = { UserId: req.userId };
        if (campaignId && campaignId !== 'undefined') {
            mapFilter.CampaignId = campaignId;
        }

        const markers = await Marker.findAll({
            include: [{
                model: Map,
                where: mapFilter, // Filtrera via kartans CampaignId
                attributes: [] 
            }]
        });
        res.json(markers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Flytta Karta till kategori
app.patch('/api/maps/:id/move', authenticateToken, async (req, res) => {
    try {
        const { categoryId } = req.body;
        await Map.update(
            { categoryId: categoryId === "" ? null : categoryId },
            { where: { id: req.params.id, UserId: req.userId } }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/lore/:id', authenticateToken, upload.single('loreImage'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, categoryId } = req.body;
        
        const lore = await Lore.findOne({ where: { id, UserId: req.userId } });
        if (!lore) return res.status(404).json({ error: "Dokumentet hittades inte" });

        // Uppdatera fälten
        lore.title = title || lore.title;
        lore.content = content || lore.content;
        lore.categoryId = categoryId || lore.categoryId;

        // Om en ny bild laddades upp, uppdatera URL:en
        if (req.file) {
            lore.imageUrl = `uploads/${req.file.filename}`;
        }

        await lore.save();
        res.json(lore);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/maps/:id', authenticateToken, async (req, res) => {
    await Map.destroy({ where: { id: req.params.id, UserId: req.userId } });
    res.json({ success: true });
});

// --- ROUTES: MARKERS ---

app.get('/api/maps/:id/markers', authenticateToken, async (req, res) => {
    try {
        const markers = await Marker.findAll({ 
            where: { MapId: req.params.id } 
        });
        res.json(markers);
    } catch (err) {
        res.status(500).json({ error: "Kunde inte hämta markörer för denna karta" });
    }
});

app.post('/api/maps/markers', authenticateToken, async (req, res) => {
    res.json(await Marker.create(req.body));
});

app.delete('/api/maps/markers/:id', authenticateToken, async (req, res) => {
    await Marker.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
});

// --- ROUTES: LORE ---
app.get('/api/lore', authenticateToken, async (req, res) => {
    try {
        const { campaignId } = req.query;
        const whereClause = { UserId: req.userId }; // Skapa variabeln först!

        if (campaignId && campaignId !== 'undefined') {
            whereClause.CampaignId = campaignId;
        }

        const lore = await Lore.findAll({ where: whereClause });
        res.json(lore);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/lore', authenticateToken, upload.single('loreImage'), async (req, res) => {
    const data = { ...req.body, UserId: req.userId, CampaignId: req.body.campaignId };
    if (req.file) data.imageUrl = `uploads/${req.file.filename}`;
    res.json(await Lore.create(data));
});

app.delete('/api/lore/:id', authenticateToken, async (req, res) => {
    await Lore.destroy({ where: { id: req.params.id, UserId: req.userId } });
    res.json({ success: true });
});

// --- ROUTES: CATEGORIES ---
app.get('/api/categories', authenticateToken, async (req, res) => {
    try {
        const { campaignId } = req.query;
        const whereClause = { UserId: req.userId };

        if (campaignId && campaignId !== 'undefined') {
            whereClause.CampaignId = campaignId;
        }

        const categories = await Category.findAll({ where: whereClause });
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/categories', authenticateToken, async (req, res) => {
    try {

        const { name, type, campaignId, CampaignId } = req.body;
        const finalCampaignId = campaignId || CampaignId;

        if (!finalCampaignId) {
            return res.status(400).json({ error: "CampaignId saknas i anropet" });
        }
        // FIX: Se till att CampaignId faktiskt sparas när kategorin skapas
        const newCategory = await Category.create({ 
            name,
            type,
            UserId: req.userId,
            CampaignId: finalCampaignId
        });
        res.json(newCategory);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Vi raderar bara om kategorin tillhör den inloggade användaren
        const deleted = await Category.destroy({ 
            where: { id: id, UserId: req.userId } 
        });

        if (deleted) {
            // Om du vill vara extra säker kan du här nollställa categoryId 
            // på alla Maps och Lore som tillhörde denna kategori, 
            // men Sequelize brukar sköta det om du har allowNull: true.
            res.json({ success: true });
        } else {
            res.status(404).json({ error: "Kategorin hittades inte" });
        }
    } catch (err) {
        console.error("Fel vid radering av kategori:", err);
        res.status(500).json({ error: err.message });
    }
});

// Ta bort en kampanj och allt tillhörande innehåll
app.delete('/api/campaigns/:id', authenticateToken, async (req, res) => {
  try {
    const campaignId = req.params.id;
    // HÄR ÄR FIXEN: Vi använder req.userId (som din middleware sätter)
    const userId = req.userId; 

    // 1. Hitta kampanjen först och kontrollera ägarskap
    const campaign = await Campaign.findOne({ where: { id: campaignId, UserId: userId } });

    if (!campaign) {
      return res.status(404).json({ message: "Kampanjen hittades inte eller tillhör inte dig" });
    }

    // 2. Radera kampanjen
    // Eftersom du har onDelete: 'CASCADE' i dina relationer i koden ovan,
    // kommer Sequelize sköta raderingen av tillhörande Maps och Lore automatiskt!

    await Category.destroy({ where: { CampaignId: campaignId } });
    await Map.destroy({ where: { CampaignId: campaignId } });
    await Lore.destroy({ where: { CampaignId: campaignId } });
    await campaign.destroy();

    res.json({ message: "Kampanj och all tillhörande data raderad" });
  } catch (error) {
    console.error("Fel vid radering:", error);
    res.status(500).json({ message: "Serverfel vid radering" });
  }
});

// --- START SERVER ---
sequelize.sync().then(() => {
    console.log("Database synchronized");
    app.listen(5000, () => console.log("SERVER RUNNING ON PORT 5000"));
});