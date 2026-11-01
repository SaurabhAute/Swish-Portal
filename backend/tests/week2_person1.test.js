require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('../config/db');
const User = require('../models/User');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/auth', require('../routes/authRoutes'));
app.use('/api/users', require('../routes/userRoutes'));

async function run() {
  await connectDB();
  const server = app.listen(5099, async () => {
    console.log('Test server running on port 5099');
    const baseUrl = 'http://localhost:5099/api';

    const testEmail = `test_p1_${Date.now()}@example.com`;
    const initialPassword = 'password123';
    const newPassword = 'newPassword456!';
    const resetPassword = 'resetPassword789!';

    try {
      console.log('\n--- 1. Testing Registration ---');
      const regRes = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: initialPassword,
          firstName: 'Alice',
          lastName: 'Tester',
          role: 'user',
        }),
      });
      const regData = await regRes.json();
      console.log('Register status:', regRes.status, 'Message:', regData.message);
      if (regRes.status !== 201) throw new Error('Registration failed');
      let token = regData.token;
      const userId = regData.user._id;

      console.log('\n--- 2. Testing Login ---');
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: initialPassword }),
      });
      const loginData = await loginRes.json();
      console.log('Login status:', loginRes.status, 'Message:', loginData.message);
      if (loginRes.status !== 200) throw new Error('Login failed');
      token = loginData.token;

      console.log('\n--- 3. Testing GET /api/users/profile (FR-02 Read) ---');
      const profileGetRes = await fetch(`${baseUrl}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profileGetData = await profileGetRes.json();
      console.log('Get profile status:', profileGetRes.status, 'User email:', profileGetData.user?.email);
      if (profileGetRes.status !== 200 || profileGetData.user?.email !== testEmail) {
        throw new Error('Get profile failed');
      }

      console.log('\n--- 4. Testing PUT /api/users/profile (FR-02 Update: bio, photo, basic info) ---');
      const updatePayload = {
        firstName: 'AliceUpdated',
        lastName: 'TesterUpdated',
        bio: 'Passionate developer and Swish enthusiast.',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        phone: '+1-234-567-8901',
      };
      const profilePutRes = await fetch(`${baseUrl}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatePayload),
      });
      const profilePutData = await profilePutRes.json();
      console.log('Update profile status:', profilePutRes.status, 'Message:', profilePutData.message);
      console.log('Updated profile fields:', profilePutData.user?.profile);
      if (
        profilePutRes.status !== 200 ||
        profilePutData.user?.profile?.bio !== updatePayload.bio ||
        profilePutData.user?.profile?.firstName !== updatePayload.firstName
      ) {
        throw new Error('Update profile failed');
      }

      console.log('\n--- 5. Testing GET /api/users/:id (Public profile) ---');
      const userByIdRes = await fetch(`${baseUrl}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userByIdData = await userByIdRes.json();
      console.log('Get user by ID status:', userByIdRes.status, 'Name:', userByIdData.user?.profile?.firstName);
      if (userByIdRes.status !== 200) throw new Error('Get user by ID failed');

      console.log('\n--- 6. Testing Change Password Flow (PUT /api/users/change-password) ---');
      const changePwdRes = await fetch(`${baseUrl}/users/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: initialPassword,
          newPassword: newPassword,
        }),
      });
      const changePwdData = await changePwdRes.json();
      console.log('Change password status:', changePwdRes.status, 'Message:', changePwdData.message);
      if (changePwdRes.status !== 200) throw new Error('Change password failed');

      console.log('\n--- 7. Verifying login with old password fails ---');
      const oldLoginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: initialPassword }),
      });
      console.log('Old password login status (expecting 401):', oldLoginRes.status);
      if (oldLoginRes.status !== 401) throw new Error('Old password should be rejected');

      console.log('\n--- 8. Verifying login with new password succeeds ---');
      const newLoginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: newPassword }),
      });
      const newLoginData = await newLoginRes.json();
      console.log('New password login status (expecting 200):', newLoginRes.status);
      if (newLoginRes.status !== 200) throw new Error('New password login should succeed');
      token = newLoginData.token;

      console.log('\n--- 9. Testing Forgot Password Flow (POST /api/auth/forgot-password) ---');
      const forgotRes = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });
      const forgotData = await forgotRes.json();
      console.log('Forgot password status:', forgotRes.status, 'Message:', forgotData.message);
      console.log('Reset token generated:', forgotData.resetToken ? 'YES' : 'NO');
      if (forgotRes.status !== 200 || !forgotData.resetToken) throw new Error('Forgot password failed');
      const resetToken = forgotData.resetToken;

      console.log('\n--- 10. Testing Reset Password Flow (POST /api/auth/reset-password/:token) ---');
      const resetRes = await fetch(`${baseUrl}/auth/reset-password/${resetToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword }),
      });
      const resetData = await resetRes.json();
      console.log('Reset password status:', resetRes.status, 'Message:', resetData.message);
      if (resetRes.status !== 200) throw new Error('Reset password failed');

      console.log('\n--- 11. Testing Login with reset password ---');
      const afterResetLoginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: resetPassword }),
      });
      const afterResetLoginData = await afterResetLoginRes.json();
      console.log('Login after reset status (expecting 200):', afterResetLoginRes.status);
      if (afterResetLoginRes.status !== 200) throw new Error('Login with reset password failed');
      token = afterResetLoginData.token;

      console.log('\n--- 12. Testing Delete Profile / Account (DELETE /api/users/profile - FR-02 Delete) ---');
      const deleteRes = await fetch(`${baseUrl}/users/profile`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const deleteData = await deleteRes.json();
      console.log('Delete account status:', deleteRes.status, 'Message:', deleteData.message);
      if (deleteRes.status !== 200) throw new Error('Delete account failed');

      console.log('\n--- 13. Verifying deleted account cannot log in ---');
      const deletedLoginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: resetPassword }),
      });
      console.log('Login deleted account status (expecting 401):', deletedLoginRes.status);
      if (deletedLoginRes.status !== 401) throw new Error('Deleted user should not be able to log in');

      console.log('\n===========================================');
      console.log('🎉 ALL WEEK 2 PERSON 1 TESTS PASSED SUCCESSFULLY!');
      console.log('===========================================\n');
    } catch (err) {
      console.error('\n❌ TEST FAILED:', err.message);
      process.exit(1);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

run();
