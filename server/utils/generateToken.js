const { generateAccessToken } = require("./tokenManager");

/**
 * Backward compatibility wrapper for existing generateToken imports
 */
const generateToken = (user) => {
  return generateAccessToken(user);
};

module.exports = generateToken;
