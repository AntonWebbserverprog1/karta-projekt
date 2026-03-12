const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Map = sequelize.define('Map', {
  name: { type: DataTypes.STRING, allowNull: false },
  imageUrl: { type: DataTypes.STRING, allowNull: false },
  parentMapId: { type: DataTypes.INTEGER, allowNull: true } // För hierarkin
});

module.exports = Map;