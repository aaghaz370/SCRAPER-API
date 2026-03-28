/**
 * 📧 CINEMAHUB ADMIN EMAIL/DETAILS CHANGE SCRIPT
 * 
 * Run this script to change admin email, name, or role
 * 
 * Usage:
 *   1. Open terminal in CINEMAHUB_BACKEND folder
 *   2. Run: node update-admin.js
 *   3. Follow the prompts
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGO_URI not found in .env file!');
    process.exit(1);
}

// Admin User Schema
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
    console.log('\n📧 ===============================');
    console.log('   CINEMAHUB ADMIN UPDATE TOOL');
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
            process.exit(1);
        }

        console.log('📋 Existing Admin Users:\n');
        users.forEach((user, i) => {
            console.log(`   ${i + 1}. ${user.email}`);
            console.log(`      Name: ${user.name}`);
            console.log(`      Role: ${user.role}\n`);
        });

        // Ask for current email
        const currentEmail = await ask('📧 Enter CURRENT email of user to update: ');

        const user = await AdminUser.findOne({ email: currentEmail.trim() });

        if (!user) {
            console.log(`\n❌ User "${currentEmail}" not found!`);
            process.exit(1);
        }

        console.log(`\n✅ Found user: ${user.name}`);
        console.log('\n📝 What do you want to update?');
        console.log('   1. Email');
        console.log('   2. Name');
        console.log('   3. Both Email & Name');
        console.log('   4. Cancel\n');

        const choice = await ask('Enter choice (1-4): ');

        switch (choice) {
            case '1': {
                const newEmail = await ask('📧 Enter NEW email: ');
                if (!newEmail.includes('@')) {
                    console.log('❌ Invalid email format!');
                    process.exit(1);
                }

                // Check if email already exists
                const exists = await AdminUser.findOne({ email: newEmail.trim() });
                if (exists) {
                    console.log('❌ This email already exists!');
                    process.exit(1);
                }

                user.email = newEmail.trim();
                await user.save();
                console.log('\n✅ Email updated successfully!');
                console.log(`   New Email: ${newEmail}`);
                break;
            }

            case '2': {
                const newName = await ask('👤 Enter NEW name: ');
                user.name = newName.trim();
                await user.save();
                console.log('\n✅ Name updated successfully!');
                console.log(`   New Name: ${newName}`);
                break;
            }

            case '3': {
                const newEmail = await ask('📧 Enter NEW email: ');
                if (!newEmail.includes('@')) {
                    console.log('❌ Invalid email format!');
                    process.exit(1);
                }

                const exists = await AdminUser.findOne({ email: newEmail.trim() });
                if (exists) {
                    console.log('❌ This email already exists!');
                    process.exit(1);
                }

                const newName = await ask('👤 Enter NEW name: ');

                user.email = newEmail.trim();
                user.name = newName.trim();
                await user.save();

                console.log('\n✅ Updated successfully!');
                console.log(`   New Email: ${newEmail}`);
                console.log(`   New Name: ${newName}`);
                break;
            }

            case '4':
                console.log('\n👋 Cancelled.');
                break;

            default:
                console.log('\n❌ Invalid choice!');
        }

        console.log('\n⚠️  IMPORTANT: Remember your new email for login!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        rl.close();
        await mongoose.disconnect();
        process.exit(0);
    }
}

main();
