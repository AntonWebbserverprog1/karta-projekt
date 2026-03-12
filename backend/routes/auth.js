const jwt = require('jsonwebtoken');
const JWT_SECRET = "min_hemliga_nyckel_123"; 

module.exports = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Ingen åtkomst: Token saknas" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log("Valideringsfel:", err.message);
            return res.status(403).json({ error: "Ogiltig eller utgången token" });
        }
        req.user = user;
        next();
    });
};