const mongoose = require('mongoose');
const AdminUser = require('./src/models/admin.user.model');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'your-mongodb-uri';

// Example Team Setup - CUSTOMIZE THIS!
const teamMembers = [
    {
        email: 'admin@cinemahub.com',
        password: 'SuperAdmin@123',
        name: 'Super Administrator',
        role: 'superadmin'
    },
    {
        email: 'manager1@cinemahub.com',
        password: 'Manager@123',
        name: 'Content Manager 1',
        role: 'admin'
    },
    {
        email: 'manager2@cinemahub.com',
        password: 'Manager@123',
        name: 'Content Manager 2',
        role: 'admin'
    },
    {
        email: 'editor1@cinemahub.com',
        password: 'Editor@123',
        name: 'Video Editor 1',
        role: 'editor'
    },
    {
        email: 'editor2@cinemahub.com',
        password: 'Editor@123',
        name: 'Video Editor 2',
        role: 'editor'
    },
    {
        email: 'editor3@cinemahub.com',
        password: 'Editor@123',
        name: 'Video Editor 3',
        role: 'editor'
    },
    {
        email: 'uploader1@cinemahub.com',
        password: 'Upload@123',
        name: 'Content Uploader 1',
        role: 'editor'
    },
    {
        email: 'uploader2@cinemahub.com',
        password: 'Upload@123',
        name: 'Content Uploader 2',
        role: 'editor'
    },
    {
        email: 'viewer1@cinemahub.com',
        password: 'Viewer@123',
        name: 'Content Reviewer',
        role: 'viewer'
    },
    {
        email: 'intern@cinemahub.com',
        password: 'Intern@123',
        name: 'Intern (View Only)',
        role: 'viewer'
    }
];

const createTeam = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Clear existing users (optional - remove if you don't want to reset)
        // await AdminUser.deleteMany({});
        // console.log('🗑️ Cleared existing users\n');

        for (const member of teamMembers) {
            const existing = await AdminUser.findOne({ email: member.email });

            if (existing) {
                console.log(`⚠️ User already exists: ${member.email}`);
                continue;
            }

            const user = new AdminUser(member);
            await user.save();
            console.log(`✅ Created: ${member.email} (${member.role})`);
        }

        console.log('\n================================================');
        console.log('🎉 Team Setup Complete!');
        console.log('================================================');
        console.log('\n📋 Role Distribution:');
        console.log('   - Super Admin: 1 (Full Access)');
        console.log('   - Admin: 2 (Can Delete)');
        console.log('   - Editor: 5 (Upload & Edit Only)');
        console.log('   - Viewer: 2 (Read Only)');
        console.log('\n⚠️ IMPORTANT: Change all passwords after first login!');
        console.log('================================================\n');

        // Display credentials table
        console.log('📧 LOGIN CREDENTIALS:');
        console.log('================================================');
        teamMembers.forEach(member => {
            console.log(`Email: ${member.email.padEnd(30)} | Password: ${member.password.padEnd(15)} | Role: ${member.role}`);
        });
        console.log('================================================\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

createTeam();
