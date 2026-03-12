const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Marker = sequelize.define('Marker', {
  label: { type: DataTypes.STRING, allowNull: false },
  posX: { type: DataTypes.FLOAT, allowNull: false },
  posY: { type: DataTypes.FLOAT, allowNull: false },
  MapId: { type: DataTypes.INTEGER, allowNull: false },
  LoreId: { type: DataTypes.INTEGER, allowNull: true },
  targetMapId: { type: DataTypes.INTEGER, allowNull: true }
});

module.exports = Marker;