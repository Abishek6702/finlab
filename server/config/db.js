const path = require('path');
const dns = require('dns');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configure reliable DNS servers (Google Public DNS) to prevent querySrv ECONNREFUSED
// when local routers or ISP DNS block SRV records.
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  // If restricted, fallback to default resolver
}

// MongoDB connection establishment
const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB Connected Successfully');
  return mongoose.connection;
};

module.exports = connectDB;
