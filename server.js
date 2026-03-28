require("dotenv").config();
const app = require("./src/app");
const { connectDB, connectUserDB } = require("./src/config/db");

// Connect to both databases
const startServer = async () => {
  // Connect main content database
  await connectDB();

  // Connect user database (optional - won't crash if not set)
  await connectUserDB();

  // Initialize Telegram bot
  const { initBot } = require('./src/services/telegram.service');
  initBot();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();
