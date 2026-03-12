const jwt = require('jsonwebtoken');
const JWT_SECRET = "min_hemliga_nyckel_123"; 

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Åtkomst nekad. Token saknas." });

  jwt.verify(token, JWT_SECRET, (err,decoded) => {
    if (err) {
      console.log("Valideringsfel:", err.message);
      return res.status(403).json({ error: "Ogiltig eller utgången token"});
    }

    req.userId = decoded.userId;
    next();
  });
};