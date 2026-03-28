/**
 * 🔐 CINEMAHUB ADMIN PASSWORD RESET SCRIPT
 * 
 * Run this script when you FORGET your admin password
 * 
 * Usage:
 *   1. Open terminal in CINEMAHUB_BACKEND folder
 *   2. Run: node reset-admin.js
 *   3. Follow the prompts
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGO_URI not found in .env file!');
    process.exit(1);
}

// Admin User Schema (same as in model)
const adminUserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, enum: ['superadmin', 'admin', 'editor', 'viewer'] },
    permissions: Object,
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const AdminUser = mongoose.model('AdminUser', adminUserSchema);

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (question) => {
    return new Promise(resolve => rl.question(question, resolve));
};

async function main() {
    console.log('\n🔐 ===============================');
    console.log('   CINEMAHUB ADMIN PASSWORD RESET');
    console.log('================================\n');

    try {
        // Connect to database
        console.log('📡 Connecting to database...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB!\n');

        // Show all admin users
        const users = await AdminUser.find({}, 'name email role isActive');

        if (users.length === 0) {
            console.log('❌ No admin users found!');
            console.log('💡 Run "node setup-admin.js" to create a new admin.');
            process.exit(1);
        }

        console.log('📋 Existing Admin Users:\n');
        users.forEach((user, i) => {
            console.log(`   ${i + 1}. ${user.email}`);
            console.log(`      Name: ${user.name}`);
            console.log(`      Role: ${user.role}`);
            console.log(`      Active: ${user.isActive ? '✅ Yes' : '❌ No'}\n`);
        });

        // Ask for email
        const email = await ask('📧 Enter the email of user to reset: ');

        const user = await AdminUser.findOne({ email: email.trim() });

        if (!user) {
            console.log(`\n❌ User "${email}" not found!`);
            process.exit(1);
        }

        console.log(`\n✅ Found user: ${user.name} (${user.role})`);

        // Ask for new password
        const newPassword = await ask('🔑 Enter NEW password (min 8 chars): ');

        if (newPassword.length < 8) {
            console.log('\n❌ Password must be at least 8 characters!');
            process.exit(1);
        }

        const confirmPassword = await ask('🔑 Confirm NEW password: ');

        if (newPassword !== confirmPassword) {
            console.log('\n❌ Passwords do not match!');
            process.exit(1);
        }

        // Hash and save new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedPassword;
        await user.save();

        console.log('\n✅ ================================');
        console.log('   PASSWORD RESET SUCCESSFUL!');
        console.log('================================');
        console.log(`\n📧 Email: ${user.email}`);
        console.log(`🔑 New Password: ${newPassword}`);
        console.log('\n⚠️  IMPORTANT: Save this password somewhere safe!');
        console.log('⚠️  Delete this console output after noting password.\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        rl.close();
        await mongoose.disconnect();
        process.exit(0);
    }
}

main();
