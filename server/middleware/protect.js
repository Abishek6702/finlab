const { protect } = require("./authMiddleware");

// Backward compatibility alias for any existing files referencing protect.js
module.exports = protect;
