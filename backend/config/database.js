const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false,
    // Dessa inställningar gör SQLite mycket snabbare
    dialectOptions: {
        mode: 2, // SQLITE_OPEN_READWRITE
    }
});

// Kör optimerings-kommandon direkt vid uppstart
sequelize.authenticate().then(async () => {
    await sequelize.query('PRAGMA journal_mode = WAL;'); // Write-Ahead Logging
    await sequelize.query('PRAGMA synchronous = NORMAL;');
    console.log("LOG: Databasen optimerad för snabbhet.");
});

module.exports = sequelize;