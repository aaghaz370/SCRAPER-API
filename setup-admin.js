const mongoose = require('mongoose');
const AdminUser = require('./src/models/admin.user.model');
require('dotenv').config();

// Get MongoDB URI from environment
const MONGO_URI = process.env.MONGO_URI;

const setupSuperAdmin = async () => {
    try {
        // Check if MONGO_URI exists
        if (!MONGO_URI) {
            console.log('❌ Error: MONGO_URI not found in .env file');
            console.log('Please add MONGO_URI to your .env file');
            process.exit(1);
        }

        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Check if Super Admin exists
        const existing = await AdminUser.findOne({ role: 'superadmin' });

        if (existing) {
            console.log('⚠️ Super Admin already exists:');
            console.log('   Email:', existing.email);
            console.log('   Name:', existing.name);
            console.log('\n💡 Use this account to login to admin panel');
            return;
        }

        // Create Super Admin with your credentials
        const superAdmin = new AdminUser({
            email: 'univora8@gmail.com',
            password: 'aaghaz9431',
            name: 'Super Administrator',
            role: 'superadmin'
        });

        await superAdmin.save();

        console.log('\n✅ Super Admin Created Successfully!');
        console.log('================================================');
        console.log('📧 Email:    univora8@gmail.com');
        console.log('🔒 Password: aaghaz9431');
        console.log('================================================');
        console.log('⚠️ IMPORTANT: Change this password after first login!');
        console.log('   Go to Admin Panel → User Management → Change Password');
        console.log('================================================\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
        process.exit(0);
    }
};

setupSuperAdmin();
