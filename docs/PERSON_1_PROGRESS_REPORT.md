# Swish Portal — Person 1 (Auth & Identity) Progress Report

**Author:** Saurabh Aute (Person 1)  
**Slice Ownership:** Auth & Identity (FR-01, FR-02)  
**Project:** Swish Portal (MERN Stack)  
**Milestone:** Midpoint Review Readiness (Weeks 1–3 Complete)  
**Repository:** [github.com/SaurabhAute/Swish-Portal](https://github.com/SaurabhAute/Swish-Portal)

---

## 1. Executive Summary

As **Person 1**, I hold complete vertical-slice ownership (both Backend and Frontend) for **Auth & Identity** in the Swish Portal project. My core deliverables cover user registration, secure login, role-based access control, session management via JWT, full profile CRUD operations, password reset flows, and providing the authentication foundation for the rest of the team (Persons 2–5).

All objectives scheduled for **Week 1** and **Weeks 2–3** in the 8-Week Compressed Delivery Plan are **100% complete, tested, and pushed to GitHub**.

---

## 2. Completed Deliverables Breakdown

### A. Week 1 — Auth Fast-Track & Team Scaffolding

| Feature | Requirement | Description | Status |
| :--- | :--- | :--- | :---: |
| **Backend Architecture** | Arch Scaffolding | Established MVC structure: `config/`, `models/`, `controllers/`, `routes/`, `middleware/` in `server.js`. | **Complete** |
| **Database Connection** | Database Setup | Connected to live MongoDB Atlas cluster with auto-reconnection logic in `config/db.js`. | **Complete** |
| **User Model** | FR-01 Model | Built `models/User.js` supporting email, passwordHash, role (`user`, `admin`, `moderator`), and nested profile details. | **Complete** |
| **Password Security** | NFR-03 Security | Pre-save Mongoose hook using `bcryptjs` with salt round 12. Plain-text passwords are never stored. | **Complete** |
| **Registration & Login** | FR-01 Endpoints | `POST /api/auth/register` and `POST /api/auth/login` issuing 7-day signed JWT tokens. | **Complete** |
| **Auth Middleware** | Security Guard | `middleware/verifyToken.js` verifying JWT `Bearer` tokens and attaching `req.user`. | **Complete** |
| **Role Middleware** | RBAC Guard | `middleware/requireRole.js` enforcing role restrictions (`admin`, `moderator`, `user`). | **Complete** |
| **Stub User Helper** | Team Coordination | Created `middleware/stubUser.js` allowing teammates (Persons 2–5) to build features in parallel before real auth was finalized. | **Complete** |

---

### B. Weeks 2–3 — Core Profile CRUD & Password Management

| Feature | Requirement | Description | Status |
| :--- | :--- | :--- | :---: |
| **Profile Read** | FR-02 Read | `GET /api/users/profile` and `GET /api/users/me` returning authenticated user profile. | **Complete** |
| **Profile Update** | FR-02 Update | `PUT /api/users/profile` updating `firstName`, `lastName`, `bio` (<= 500 chars), `avatar`, and `phone`. | **Complete** |
| **Profile Picture Upload** | FR-02 Avatar | Supports local image file upload (Base64 instant preview) or direct image URL with format validation. | **Complete** |
| **Public Profile View** | FR-02 Public | `GET /api/users/:id` returning public profiles while stripping private contact info (email/phone) for other users. | **Complete** |
| **Account Deletion** | FR-02 Delete | `DELETE /api/users/profile` permanently removing user account and profile data. | **Complete** |
| **User Directory** | Discovery/Admin | `GET /api/users` supporting search by name/email with pagination. | **Complete** |
| **Change Password** | Security Flow | `PUT /api/auth/change-password` & `PUT /api/users/change-password` verifying existing password before saving new hash. | **Complete** |
| **Forgot / Reset Password** | Password Recovery | `POST /api/auth/forgot-password` (15-min crypto token) and `POST /api/auth/reset-password/:token`. | **Complete** |
| **Real JWT Integration** | Checkpoint Week 3 | Swapped all remaining routes and Axios calls across the application to real JWTs. No mock/stub tokens remain. | **Complete** |

---

### C. Frontend Implementation & UI Design

| Component / Page | File Location | Key Capabilities |
| :--- | :--- | :--- |
| **Auth Context Provider** | `src/context/AuthContext.jsx` | Global state for `user`, `isAuthenticated`, `loading`, `login()`, `register()`, `logout()`, `updateUser()`, `refreshUser()`. |
| **API Client & Interceptor** | `src/services/api.js` | Axios instance automatically attaching `Authorization: Bearer <swish_token>` to all outgoing requests. |
| **Route Protection** | `src/routes/ProtectedRoute.jsx` | Secures private routes (`/dashboard`, `/create`, `/profile`); redirects unauthenticated users to `/login`. |
| **User Profile Page** | `src/pages/Profile.jsx` | Full dual-mode profile page: hero cover, custom avatar, editable tabs, password change with real-time strength meter, and account deletion confirmation modal. |
| **Login & Register Pages** | `src/pages/Login.jsx`<br>`src/pages/Register.jsx` | Dark-glassmorphic styling, input validation, role toggle, password eye visibility, and error banners. |
| **Forgot & Reset Password** | `src/pages/ForgotPassword.jsx`<br>`src/pages/ResetPassword.jsx` | Token generation display with 1-click proceed/copy actions, token verification, and new password confirmation. |
| **Design System** | `src/index.css` | 100% Vanilla CSS design system with curated dark palette, glassmorphism tokens, and micro-animations. |

---

## 3. API Endpoints Summary (Person 1 Ownership)

### Authentication Endpoints (`/api/auth`)
* `POST /api/auth/register` — Public user registration (creates user, returns JWT).
* `POST /api/auth/login` — Public user authentication (verifies password, returns JWT).
* `GET /api/auth/me` — Protected endpoint returning current authenticated user.
* `POST /api/auth/forgot-password` — Public endpoint generating 15-minute crypto reset token.
* `POST /api/auth/reset-password/:token` — Public endpoint resetting password using valid token.
* `PUT /api/auth/change-password` — Protected endpoint changing password for logged-in user.

### User & Profile Endpoints (`/api/users`)
* `GET /api/users/profile` *(alias: `/api/users/me`)* — Protected endpoint fetching own profile.
* `PUT /api/users/profile` *(alias: `/api/users/me`)* — Protected endpoint updating bio, avatar, name, and phone.
* `DELETE /api/users/profile` — Protected endpoint deleting own user account.
* `GET /api/users/:id` — Protected/Public lookup for public profile (strips private contact info).
* `GET /api/users` — Protected paginated user search.
* `PUT /api/users/change-password` — Protected endpoint for password modification.

---

## 4. Testing & Verification

Automated test suite located in `backend/tests/week2_person1.test.js` was run and verified:

```text
> backend@1.0.0 test
> node tests/week2_person1.test.js

✅ MongoDB connected: Cluster0 (Atlas)
Test server running on port 5099

--- 1. Testing Registration ---
Register status: 201 | Message: User registered successfully
--- 2. Testing Login ---
Login status: 200 | Message: Login successful
--- 3. Testing GET /api/users/profile (FR-02 Read) ---
Get profile status: 200 | User email confirmed
--- 4. Testing PUT /api/users/profile (FR-02 Update) ---
Update profile status: 200 | Profile updated successfully
--- 5. Testing GET /api/users/:id (Public profile) ---
Get user by ID status: 200 | Name verified
--- 6. Testing Change Password Flow ---
Change password status: 200 | Password changed successfully
--- 7. Verifying login with old password fails ---
Old password login status: 401 (Correctly rejected)
--- 8. Verifying login with new password succeeds ---
New password login status: 200 (Accepted)
--- 9. Testing Forgot Password Flow ---
Forgot password status: 200 | Reset token generated: YES
--- 10. Testing Reset Password Flow ---
Reset password status: 200 | Password reset successful
--- 11. Testing Login with reset password ---
Login after reset status: 200 (Accepted)
--- 12. Testing Delete Profile / Account (FR-02 Delete) ---
Delete account status: 200 | User account and profile deleted successfully
--- 13. Verifying deleted account cannot log in ---
Login deleted account status: 401 (Correctly rejected)

===========================================
🎉 ALL WEEK 2 PERSON 1 TESTS PASSED SUCCESSFULLY!
===========================================
```

* **Frontend Build Check:** `npm run build` executed and verified with **0 errors**.
* **CSS Quality:** Standard `background-clip: text;` and cross-browser fallbacks verified on all browsers.

---

## 5. Security & Checkpoint Compliance

1. **Password Safety:** Stored exclusively as one-way salted hashes using `bcrypt` (12 rounds). Plain text is never persisted or returned.
2. **Data Sanitization:** User schema `toJSON` method automatically strips `passwordHash`, `resetPasswordToken`, and `resetPasswordExpire` from every API response.
3. **Environment Security:** Root `.gitignore` actively prevents `.env` and `node_modules/` from reaching GitHub. Safe `.env.example` templates are provided.
4. **End of Week 3 Checkpoint:** Fully achieved. Person 1's real JWT authentication is active across the stack. Downstream slices (Persons 2–5) can now safely import `verifyToken` middleware without relying on `stubUser`.
5. **Git Version Control:** All work committed under verified author identity (`SaurabhAute`) with descriptive conventional commit messages.

---

*Report prepared and certified by Saurabh Aute (Person 1 — Auth & Identity Lead).*
