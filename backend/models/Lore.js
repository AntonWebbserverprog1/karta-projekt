const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Lore = sequelize.define('Lore', {
  title: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false }, // Möjliggör långa texter
  imageUrl: { type: DataTypes.STRING, allowNull: true },
  category: { type: DataTypes.STRING, defaultValue: 'General' },
  UserId: { type: DataTypes.INTEGER, allowNull: false }
});

module.exports = Lore;