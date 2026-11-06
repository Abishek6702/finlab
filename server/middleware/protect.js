const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication required. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Load authoritative account from DB
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ success: false, message: "User account no longer exists." });
    }

    if (user.hasAccess === false) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Your account access has been restricted.",
      });
    }

    // Check if password was changed after token was issued
    if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: "Password was changed recently. Please log in again.",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token has expired. Please log in again." });
    }
    return res.status(401).json({ success: false, message: "Invalid authentication token." });
  }
};





module.exports = { protect};
