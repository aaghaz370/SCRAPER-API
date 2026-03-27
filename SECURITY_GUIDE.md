# 🔒 CINEMAHUB SECURITY SYSTEM - Complete Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Role Structure](#role-structure)
3. [Setup Instructions](#setup-instructions)
4. [API Endpoints](#api-endpoints)
5. [Team Management](#team-management)
6. [Security Best Practices](#security-best-practices)

---

## 🎯 Overview

Complete Role-Based Access Control (RBAC) system with 4 roles and granular permissions for all modules.

### ✅ Key Features:
- 🔐 JWT-based authentication
- 👥 4 role levels (Super Admin, Admin, Editor, Viewer)
- 🎛️ Granular permissions per module
- 🛡️ Protected routes with middleware
- 👤 User management (Super Admin only)
- 🔑 Password change functionality

---

## 👥 Role Structure

### 1️⃣ **Super Admin** (You)
- ✅ **FULL ACCESS** to everything
- ✅ Manage users (create, edit, delete)
- ✅ All CRUD operations
- ✅ Cannot be deleted by anyone
- ✅ Can manage all team members

**Use Case:** Owner/Founder

---

### 2️⃣ **Admin** (Managers)
- ✅ All content operations (create, edit, delete)
- ✅ Upload to hosting platforms (Abyss, VOE, Streamtape)
- ✅ Manage movies and series
- ❌ Cannot manage users
- ❌ Cannot delete other admins

**Use Case:** Content Managers, Team Leads

---

### 3️⃣ **Editor** (Content Team)
- ✅ Create and edit content
- ✅ Upload videos to platforms
- ✅ Add movies and series
- ❌ **Cannot delete** anything
- ❌ Cannot manage users

**Use Case:** Content Uploaders, Video Editors

---

### 4️⃣ **Viewer** (Reviewers)
- ✅ **Read-only** access
- ✅ View all content
- ✅ Access all pages
- ❌ Cannot create, edit, or delete
- ❌ Cannot upload

**Use Case:** Content Reviewers, Interns

---

## 🚀 Setup Instructions

### Step 1: Run Setup Script (Create Super Admin)

```bash
cd CINEMAHUB_BACKEND
node setup-admin.js
```

**Output:**
```
✅ Super Admin Created Successfully!
================================================
📧 Email:    admin@cinemahub.com
🔒 Password: SuperAdmin@123
================================================
⚠️ IMPORTANT: Change this password immediately!
```

---

### Step 2: Create Your Team (Optional)

Edit `create-team.js` with your team's emails and run:

```bash
node create-team.js
```

**Default Team Structure:**
- 1 Super Admin (You)
- 2 Admins (Managers)
- 5 Editors (Uploaders)
- 2 Viewers (Reviewers)

**Customize emails in `create-team.js`:**
```javascript
const teamMembers = [
  {
    email: 'your-email@gmail.com',  // Change this
    password: 'YourPassword@123',    // Change this
    name: 'Your Name',               // Change this
    role: 'superadmin'
  },
  // Add more team members...
];
```

---

### Step 3: Change Default Passwords

**After first login, immediately change passwords!**

API Endpoint:
```
POST /api/admin/auth/change-password
{
  "currentPassword": "SuperAdmin@123",
  "newPassword": "YourNewStrongPassword@123"
}
```

---

## 🔌 API Endpoints

### Authentication

#### 1. Login
```
POST /api/admin/auth/login

Body:
{
  "email": "admin@cinemahub.com",
  "password": "SuperAdmin@123"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "email": "admin@cinemahub.com",
    "name": "Super Administrator",
    "role": "superadmin",
    "permissions": { ... }
  }
}
```

#### 2. Get Current User
```
GET /api/admin/auth/me
Headers: Authorization: Bearer <token>
```

#### 3. Change Password
```
POST /api/admin/auth/change-password
Headers: Authorization: Bearer <token>

Body:
{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}
```

---

### User Management (Super Admin Only)

#### 1. Create User
```
POST /api/admin/users
Headers: Authorization: Bearer <token>

Body:
{
  "email": "editor@cinemahub.com",
  "password": "Editor@123",
  "name": "Video Editor",
  "role": "editor"
}
```

#### 2. Get All Users
```
GET /api/admin/users
Headers: Authorization: Bearer <token>
```

#### 3. Update User
```
PUT /api/admin/users/:id
Headers: Authorization: Bearer <token>

Body:
{
  "name": "Updated Name",
  "role": "admin",
  "isActive": true
}
```

#### 4. Delete User
```
DELETE /api/admin/users/:id
Headers: Authorization: Bearer <token>
```

---

## 📊 Permissions Matrix

| Module | Action | Super Admin | Admin | Editor | Viewer |
|--------|--------|-------------|-------|--------|--------|
| **Movies** | View | ✅ | ✅ | ✅ | ✅ |
| Movies | Create | ✅ | ✅ | ✅ | ❌ |
| Movies | Edit | ✅ | ✅ | ✅ | ❌ |
| Movies | Delete | ✅ | ✅ | ❌ | ❌ |
| **Series** | View | ✅ | ✅ | ✅ | ✅ |
| Series | Create | ✅ | ✅ | ✅ | ❌ |
| Series | Edit | ✅ | ✅ | ✅ | ❌ |
| Series | Delete | ✅ | ✅ | ❌ | ❌ |
| **Abyss** | View | ✅ | ✅ | ✅ | ✅ |
| Abyss | Upload | ✅ | ✅ | ✅ | ❌ |
| Abyss | Delete | ✅ | ✅ | ❌ | ❌ |
| **VOE** | View | ✅ | ✅ | ✅ | ✅ |
| VOE | Upload | ✅ | ✅ | ✅ | ❌ |
| VOE | Delete | ✅ | ✅ | ❌ | ❌ |
| **Streamtape** | View | ✅ | ✅ | ✅ | ✅ |
| Streamtape | Upload | ✅ | ✅ | ✅ | ❌ |
| Streamtape | Delete | ✅ | ✅ | ❌ | ❌ |
| **Users** | Manage | ✅ | ❌ | ❌ | ❌ |

---

## 🛡️ Security Best Practices

### ✅ DO:
1. **Change default passwords** immediately
2. **Use strong passwords** (min 12 characters, uppercase, lowercase, numbers, symbols)
3. **Review permissions** regularly
4. **Deactivate unused accounts** instead of deleting
5. **Use different passwords** for each team member
6. **Enable 2FA** (coming soon)
7. **Monitor user activity** (logs coming soon)

### ❌ DON'T:
1. **Share credentials** with multiple people
2. **Use simple passwords** like "123456" or "password"
3. **Give Super Admin access** to team members
4. **Leave inactive accounts** active
5. **Commit API keys** to Git

---

## 🔧 How to Use in Routes

### Protect a Route with Permission:

```javascript
const { authenticate, checkPermission } = require('../middleware/auth.middleware');

// Example: Only users with 'movies_delete' permission can delete movies
router.delete('/admin/movies/:id', 
  authenticate,                      // 1. Check if logged in
  checkPermission('movies_delete'),  // 2. Check permission
  movieController.deleteMovie        // 3. Execute
);
```

### Check Role Level:

```javascript
const { authenticate, isAdminOrAbove } = require('../middleware/auth.middleware');

// Only Admin and Super Admin
router.post('/admin/sensitive-action',
  authenticate,
  isAdminOrAbove,
  controller.sensitiveAction
);
```

---

## 📞 Support

**Need help?**
- Check permissions in user object
- Verify JWT token is valid
- Ensure headers are set correctly
- Check MongoDB connection

**Common Issues:**
1. **401 Unauthorized**: Token missing or invalid
2. **403 Forbidden**: No permission for this action
3. **404 Not Found**: User doesn't exist

---

## 🎉 Next Steps

1. ✅ Run setup scripts
2. ✅ Create your team
3. ✅ Change all passwords
4. ✅ Test all roles
5. ✅ Deploy to production

**Your data is now secure!** 🔒
