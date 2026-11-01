# Handoff Documentation — Posts & Feed (Person 2)

Welcome to the Swish codebase! This handoff document summarizes the state of the project at the completion of the **Posts & Feed** slice (Person 2), detailing what was built, how to run and test it, known notes, and extension points for **Person 3 (Engagement: likes, comments, follow)** and **Person 4 (Explore & Admin Moderation)**.

---

## 1. Current Folder Structure

```
Swish/
├── README.md                           # Main architecture, endpoints, and setup guide
├── HANDOFF.md                          # This handoff document
├── backend/
│   ├── .env.example                    # Template with MONGO_URI, JWT_*, and CLOUDINARY_*
│   ├── package.json                    # Backend dependencies (express, mongoose, multer, cloudinary, etc.)
│   ├── server.js                       # Main server entry; routes registered at /api/auth, /api/users, /api/posts
│   ├── config/
│   │   ├── db.js                       # Mongoose connection logic
│   │   └── cloudinary.js               # Cloudinary v2 SDK configuration
│   ├── controllers/
│   │   ├── authController.js           # Auth: register, login, password resets (Person 1)
│   │   ├── userController.js           # Profiles: get profile, update profile, public profile (FR-02)
│   │   └── postController.js           # Posts: createPost, getFeed, getUserPosts, deletePost (Person 2)
│   ├── middleware/
│   │   ├── verifyToken.js              # Validates JWT & sets req.user (without passwordHash)
│   │   ├── requireRole.js              # RBAC guard (user, moderator, admin)
│   │   ├── stubUser.js                 # Dev utility for mock auth
│   │   └── uploadImage.js              # Multer + Cloudinary middleware with clean 400 error handling
│   ├── models/
│   │   ├── User.js                     # User schema (email, passwordHash, role, profile)
│   │   └── Post.js                     # Post schema (authorId, imageUrl, caption, likes, commentCount, isRemoved)
│   ├── routes/
│   │   ├── authRoutes.js               # Auth endpoints (/api/auth)
│   │   ├── userRoutes.js               # User endpoints (/api/users)
│   │   └── postRoutes.js               # Post endpoints (/api/posts)
│   └── tests/
│       ├── week2_person1.test.js       # Auth & Profile integration test (Person 1)
│       └── week2_person2.test.js       # Posts & Feed test suite (Person 2 — 11 test suites)
└── frontend/
    ├── package.json                    # React 19, Vite, React Router 7, Axios, Lucide
    ├── vite.config.js
    ├── eslint.config.js                # Configured for Vite + React 19 (0 errors)
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx                     # Route definitions (/dashboard, /create, /profile, /profile/:id)
    │   ├── index.css                   # Unified dark theme vanilla CSS design system
    │   ├── context/
    │   │   └── AuthContext.jsx         # Auth state provider (user, login, register, logout, etc.)
    │   ├── routes/
    │   │   └── ProtectedRoute.jsx      # Route guard using React Router Outlet
    │   ├── services/
    │   │   └── api.js                  # Axios instance with JWT interceptor, authService, userService, postService
    │   ├── components/
    │   │   ├── PostCard.jsx            # Feed post card with extension slots for likes & comments
    │   │   ├── AuthButton.jsx
    │   │   ├── AuthInput.jsx
    │   │   ├── PasswordInput.jsx
    │   │   └── SwishLogo.jsx
    │   └── pages/
    │       ├── Feed.jsx                # Campus feed with pagination, empty/loading/error states, CTA
    │       ├── PostUpload.jsx          # Create post page (/create) with image preview & character count
    │       ├── Profile.jsx             # Dual-mode profile (/profile for own editable, /profile/:id for public view)
    │       ├── Dashboard.jsx           # Re-exports Feed for backward compatibility
    │       ├── Login.jsx
    │       ├── Register.jsx
    │       ├── ForgotPassword.jsx
    │       └── ResetPassword.jsx
```

---

## 2. Environment Variables Required

### `backend/.env`
```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
PORT=5000

# Cloudinary credentials (Person 2)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### `frontend/.env`
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 3. How to Run Both Apps

### Backend
```bash
cd backend
npm install
npm run dev        # Starts server on http://localhost:5000 with nodemon
npm run test:posts # Runs Person 2 test suite (11/11 tests passing)
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # Starts Vite dev server on http://localhost:5173
npm run lint       # Runs ESLint (0 errors)
npm run build      # Builds production bundle
```

---

## 4. API Endpoints

All endpoints require `Authorization: Bearer <token>` unless marked Public.

### Auth (`/api/auth`) — Person 1
- `POST /api/auth/register` (Public): Register a user.
- `POST /api/auth/login` (Public): Login and receive JWT.
- `GET /api/auth/me`: Get authenticated user.
- `POST /api/auth/forgot-password` (Public): Generate password reset token.
- `POST /api/auth/reset-password/:token` (Public): Reset password with token.
- `PUT /api/auth/change-password`: Change password for authenticated user.

### Users & Profiles (`/api/users`) — FR-02 (Person 1 & 2)
- `GET /api/users/profile` & `GET /api/users/me`: Get current user's profile.
- `PUT /api/users/profile` & `PUT /api/users/me`: Update own profile (name, bio, avatar, phone). Validates bio <= 500 chars and avatar format/size.
- `DELETE /api/users/profile`: Delete own account.
- `GET /api/users/:id`: Public profile view for other users. Safely suppresses email and phone unless requester is the owner.
- `GET /api/users`: Search and paginate users (for discovery/admin).

### Posts & Feed (`/api/posts`) — Person 2
- `POST /api/posts`: Multipart form upload (`image` + optional `caption`). Max 5MB, JPEG/PNG/WebP only. Creates post and returns populated author summary.
- `GET /api/posts`: Campus feed, newest first, excluding `isRemoved: true`. Cursor-based pagination (`limit`, `cursor`).
- `GET /api/posts/user/:userId`: Posts by a specific user, newest first.
- `DELETE /api/posts/:id`: Author-only deletion. Returns 403 if requested by another user. Cleans up asset from Cloudinary and deletes MongoDB document.

---

## 5. Post Schema (`Post.js`)

```javascript
{
  _id: mongoose.Schema.Types.ObjectId,
  authorId: { type: ObjectId, ref: 'User', required: true, index: true },
  imageUrl: { type: String, required: true },
  imagePublicId: { type: String, required: true },
  caption: { type: String, trim: true, maxlength: 500, default: '' },
  likes: [{ type: ObjectId, ref: 'User', default: [] }],
  commentCount: { type: Number, default: 0 },
  isRemoved: { type: Boolean, default: false },
  createdAt: { type: Date }
}
```

**Indexes**:
- `{ createdAt: -1 }`
- `{ isRemoved: 1, createdAt: -1 }`

---

## 6. Extension Points for Person 3 (Engagement: Likes, Comments, Follow)

### A. Likes (`post.likes`)
- The `Post` model already has `likes: [ObjectId]` (array of user ObjectIds) defaulting to `[]`.
- In `frontend/src/components/PostCard.jsx`, see the commented slot:
  ```jsx
  {/* ── LIKE_BUTTON_SLOT ───────────────────── */}
  {/*
   * Person 3 (Engagement): Drop your LikeButton component here.
   * Available data: post._id, post.likes (array of user ObjectIds)
   * Example: <LikeButton postId={post._id} likes={post.likes} />
   */}
  ```
- Recommended backend endpoints for Person 3:
  - `POST /api/posts/:id/like` (toggle or like)
  - `DELETE /api/posts/:id/like` (unlike)

### B. Comments (`post.commentCount`)
- The `Post` model has a `commentCount: Number` counter cache defaulting to `0`.
- In `frontend/src/components/PostCard.jsx`, see the commented slot:
  ```jsx
  {/* ── COMMENT_SECTION_SLOT ───────────────── */}
  {/*
   * Person 3 (Engagement): Drop your CommentSection component here.
   * Available data: post._id, post.commentCount
   * Example: <CommentSection postId={post._id} />
   */}
  ```
- Recommended backend endpoints for Person 3:
  - `GET /api/posts/:id/comments`
  - `POST /api/posts/:id/comments`

### C. Follow
- The public profile at `/profile/:id` renders public user info and posts.
- Person 3 can drop a `<FollowButton targetUserId={id} />` in the `profile-hero-card` of `frontend/src/pages/Profile.jsx`.

---

## 7. Notes for Person 4 (Explore & Admin Moderation)

- **Feed Filtering**: `getFeed` and `getUserPosts` query `{ isRemoved: { $ne: true } }`. When a post is flagged and removed by a moderator or admin, set `post.isRemoved = true`. The feed will immediately stop displaying it.
- **Admin Delete vs User Delete**: `DELETE /api/posts/:id` is strictly author-only. Admin post removal should be handled via a dedicated moderation endpoint (e.g. `PATCH /api/admin/posts/:id/remove` or `DELETE /api/admin/posts/:id` using `requireRole('admin', 'moderator')`).

---

## 8. Known Notes & Testing Observations

- Cloudinary credentials must be added to `backend/.env` for image uploads to Cloudinary in live environments.
- Automated tests (`npm run test:posts`) use mock-compatible and in-process validation that tests all guards, schemas, and pagination logic without requiring external secrets.
