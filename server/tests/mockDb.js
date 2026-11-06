const bcrypt = require("bcrypt");

class MockDatabase {
  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.seq = 1;
  }

  clear() {
    this.users.clear();
    this.sessions.clear();
  }

  nextId() {
    return (this.seq++).toString(16).padStart(24, "0");
  }

  saveUser(doc) {
    const raw = {
      ...doc.toObject(),
      password: doc.password,
      passwordResetTokenHash: doc.passwordResetTokenHash,
      passwordResetExpires: doc.passwordResetExpires,
      passwordChangedAt: doc.passwordChangedAt,
    };
    this.users.set(doc._id.toString(), raw);
  }

  saveSession(doc) {
    const raw = doc.toObject();
    raw.refreshTokenHash = doc.refreshTokenHash;
    raw.revokedAt = doc.revokedAt;
    this.sessions.set(doc._id.toString(), raw);
  }

  findRawUser(filter) {
    for (const u of this.users.values()) {
      if (filter.email && u.email === filter.email.toLowerCase().trim()) {
        return u;
      }
      if (filter.$or) {
        for (const cond of filter.$or) {
          if (cond.googleId && u.googleId === cond.googleId) {
            return u;
          }
          if (cond.email && u.email === cond.email.toLowerCase().trim()) {
            return u;
          }
        }
      }
      if (filter.passwordResetTokenHash) {
        if (
          u.passwordResetTokenHash === filter.passwordResetTokenHash &&
          u.passwordResetExpires &&
          u.passwordResetExpires > new Date()
        ) {
          return u;
        }
      }
    }
    return null;
  }

  findRawSession(filter) {
    for (const s of this.sessions.values()) {
      if (filter.refreshTokenHash && s.refreshTokenHash === filter.refreshTokenHash) {
        return s;
      }
    }
    return null;
  }
}

const mockDb = new MockDatabase();

function setupMongooseMocks(User, Session) {
  // Bind instance save helper
  const bindUserDoc = (doc) => {
    doc.save = async function () {
      if (this.isModified && this.isModified("password") && this.password && !this.password.startsWith("$2b$")) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
      }
      if (!this.isNew && this.isModified && this.isModified("password")) {
        this.passwordChangedAt = new Date();
      }
      mockDb.saveUser(this);
      return this;
    };
    return doc;
  };

  const bindSessionDoc = (doc) => {
    doc.save = async function () {
      mockDb.saveSession(this);
      return this;
    };
    return doc;
  };

  // Override User.prototype.init / save
  const origUserInit = User.prototype.init;
  User.prototype.save = async function () {
    if (this.isModified("password") && this.password && !this.password.startsWith("$2b$")) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    if (!this.isNew && this.isModified("password")) {
      this.passwordChangedAt = new Date();
    }
    mockDb.saveUser(this);
    return this;
  };

  Session.prototype.save = async function () {
    mockDb.saveSession(this);
    return this;
  };

  // Override User.findOne
  User.findOne = function (filter) {
    const exec = async () => {
      const raw = mockDb.findRawUser(filter);
      if (!raw) return null;
      const doc = new User(raw);
      doc._id = raw._id;
      doc.password = raw.password;
      doc.passwordResetTokenHash = raw.passwordResetTokenHash;
      doc.passwordResetExpires = raw.passwordResetExpires;
      doc.passwordChangedAt = raw.passwordChangedAt;
      doc.isNew = false;
      return bindUserDoc(doc);
    };

    return {
      select: () => ({ then: (res, rej) => exec().then(res, rej) }),
      then: (res, rej) => exec().then(res, rej),
    };
  };

  // Override User.findById
  User.findById = function (id) {
    const exec = async () => {
      const raw = mockDb.users.get(id ? id.toString() : "");
      if (!raw) return null;
      const doc = new User(raw);
      doc._id = raw._id;
      doc.password = raw.password;
      doc.passwordResetTokenHash = raw.passwordResetTokenHash;
      doc.passwordResetExpires = raw.passwordResetExpires;
      doc.passwordChangedAt = raw.passwordChangedAt;
      doc.isNew = false;
      return bindUserDoc(doc);
    };

    return {
      select: () => ({ then: (res, rej) => exec().then(res, rej) }),
      then: (res, rej) => exec().then(res, rej),
    };
  };

  // Override Session.findById
  Session.findById = function (id) {
    const exec = async () => {
      const raw = mockDb.sessions.get(id ? id.toString() : "");
      if (!raw) return null;
      const doc = new Session(raw);
      doc._id = raw._id;
      doc.refreshTokenHash = raw.refreshTokenHash;
      doc.revokedAt = raw.revokedAt;
      doc.isNew = false;
      return bindSessionDoc(doc);
    };
    return { then: (res, rej) => exec().then(res, rej) };
  };

  // Override Session.findOne
  Session.findOne = function (filter) {
    const exec = async () => {
      const raw = mockDb.findRawSession(filter);
      if (!raw) return null;
      const doc = new Session(raw);
      doc._id = raw._id;
      doc.refreshTokenHash = raw.refreshTokenHash;
      doc.revokedAt = raw.revokedAt;
      doc.isNew = false;
      return bindSessionDoc(doc);
    };
    return { then: (res, rej) => exec().then(res, rej) };
  };

  // Override Session.findOneAndUpdate
  Session.findOneAndUpdate = function (filter, update) {
    const exec = async () => {
      const raw = mockDb.findRawSession(filter);
      if (!raw) return null;
      if (update.$set && update.$set.revokedAt) {
        raw.revokedAt = update.$set.revokedAt;
      }
      const doc = new Session(raw);
      doc._id = raw._id;
      doc.refreshTokenHash = raw.refreshTokenHash;
      doc.revokedAt = raw.revokedAt;
      doc.isNew = false;
      return bindSessionDoc(doc);
    };
    return { then: (res, rej) => exec().then(res, rej) };
  };

  // Override Session.updateMany
  Session.updateMany = function (filter, update) {
    const exec = async () => {
      let count = 0;
      for (const raw of mockDb.sessions.values()) {
        if (filter.userId && raw.userId.toString() === filter.userId.toString()) {
          if (filter.revokedAt === null) {
            if (!raw.revokedAt && update.$set && update.$set.revokedAt) {
              raw.revokedAt = update.$set.revokedAt;
              count++;
            }
          } else if (update.$set && update.$set.revokedAt) {
            raw.revokedAt = update.$set.revokedAt;
            count++;
          }
        }
      }
      return { modifiedCount: count };
    };
    return { then: (res, rej) => exec().then(res, rej) };
  };
}

module.exports = { mockDb, setupMongooseMocks };
