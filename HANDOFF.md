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


---

## 9. Engagement Slice Completion (Person 3)

This section documents the completed Engagement slice covering likes (FR-05, AC-03), comments (FR-06, AC-04), and the follow system (FR-07, AC-05).

### 9.1 New Files Added / Modified

#### Backend:
- `backend/models/Comment.js` — Comment schema with indexed `postId`, `authorId`, `text` (1-300 chars), `isRemoved` (default: false), `createdAt`.
- `backend/models/Follow.js` — Follow schema with `followerId`, `followingId`, `createdAt`, and a unique compound index on `(followerId, followingId)`.
- `backend/controllers/commentController.js` — `addComment` (atomic `$inc` on `commentCount`), `getComments` (paginated, oldest first), `deleteComment` (author-only 403 guard, atomic decrement).
- `backend/controllers/followController.js` — `followUser` (idempotent), `unfollowUser` (idempotent), `getFollowers`, `getFollowing` (paginated summaries).
- `backend/routes/commentRoutes.js` — Registered at `/api/comments` (`DELETE /:id`).
- `backend/routes/postRoutes.js` — Added `POST /:id/like`, `POST /:postId/comments`, `GET /:postId/comments`.
- `backend/routes/userRoutes.js` — Added `POST /:id/follow`, `DELETE /:id/follow`, `GET /:id/followers`, `GET /:id/following`.
- `backend/server.js` — Registered `/api/comments` route.
- `backend/controllers/postController.js` — Added `toggleLike` (`$addToSet`/`$pull`), enhanced `formatPost` to compute `likeCount` and `likedByMe`, and omitted raw liker IDs.
- `backend/controllers/userController.js` — Enriched `getUserProfile` and `getUserById` with `followersCount`, `followingCount`, and `isFollowing`.
- `backend/tests/engagement.test.js` — 23 unit & integration tests covering all engagement acceptance criteria and edge cases.
- `backend/tests/e2e_walkthrough.test.js` — End-to-end multi-user walkthrough simulating two users interacting with likes, comments, and following.

#### Frontend:
- `frontend/src/components/CommentSection.jsx` — Expandable comment thread component with paginated loading, 300-char counter, live add, author delete with confirm, and error retry.
- `frontend/src/components/PostCard.jsx` — Integrated interactive like button (optimistic update, error rollback, in-flight guard) and comment toggle.
- `frontend/src/pages/Profile.jsx` — Integrated follow/unfollowing button on `/profile/:id`, clickable follower/following counts opening user lists on both own and other profiles, and synchronized counts.
- `frontend/src/services/api.js` — Exported standalone helper functions: `toggleLike`, `getComments`, `addComment`, `deleteComment`, `followUser`, `unfollowUser`, `getFollowers`, `getFollowing`.
- `frontend/src/index.css` — Styling for like button, comment thread, character counters, modals, and follow buttons matching dark glass-card design.

### 9.2 Exact Field Names Added to Responses

#### Post Responses (`getFeed`, `getUserPosts`, `createPost`):
- `likeCount` (`Number`): Total count of likes on the post.
- `likedByMe` (`Boolean`): Whether the requesting user has liked the post.
- `commentCount` (`Number`): Maintained counter cache of active comments.
*(Note: Raw `likes` array containing user IDs is omitted from client responses to protect privacy).*

#### Profile Responses (`getUserProfile`, `getUserById`):
- `followersCount` (`Number`): Total number of followers.
- `followingCount` (`Number`): Total number of users followed.
- `isFollowing` (`Boolean`): Set when viewing another user's public profile (`/api/users/:id`), indicating if the current authenticated user follows them.

### 9.3 Schemas

#### Comment Schema (`Comment.js`)
```javascript
{
  postId: { type: ObjectId, ref: 'Post', required: true, index: true },
  authorId: { type: ObjectId, ref: 'User', required: true, index: true },
  text: { type: String, required: true, trim: true, minlength: 1, maxlength: 300 },
  isRemoved: { type: Boolean, default: false },
  createdAt: { type: Date }
}
```
**Indexes**:
- `{ postId: 1, createdAt: 1 }`
- `{ postId: 1, isRemoved: 1, createdAt: 1 }`

#### Follow Schema (`Follow.js`)
```javascript
{
  followerId: { type: ObjectId, ref: 'User', required: true, index: true },
  followingId: { type: ObjectId, ref: 'User', required: true, index: true },
  createdAt: { type: Date }
}
```
**Indexes**:
- `{ followerId: 1, followingId: 1 }` (**UNIQUE** compound index preventing duplicates)
- `{ followingId: 1, createdAt: -1 }`
- `{ followerId: 1, createdAt: -1 }`

### 9.4 Moderation & Flagging (`isRemoved`)
- `isRemoved` on comments defaults to `false`.
- Active comment retrieval queries `{ postId, isRemoved: { $ne: true } }`. When marked `true` by moderation, comments are hidden from normal view while preserving the thread audit trail.

### 9.5 Suggested Next Steps for Person 4 (Explore & Admin)
- **Trending & Explore**: Trending algorithms can rank posts using `likeCount` and `commentCount` along with post age (e.g., standard time-decay score: `(likeCount * 2 + commentCount * 3) / (ageInHours + 2)^1.5`).
- **Admin Moderation**:
  - Add admin route `PATCH /api/admin/comments/:id/remove` or toggle `isRemoved: true` using `requireRole('admin', 'moderator')`.
  - When removing comments via admin moderation, optionally decrement post `commentCount` or treat moderation separately.
- **Notification Hooks**:
  - Comments left in `postController.js` (`toggleLike`), `commentController.js` (`addComment`), and `followController.js` (`followUser`) indicate exact integration points for Person 5 (Notifications/Infra).

### 9.6 Known Notes & Shortcuts
- Standalone test suite (`npm run test:engagement`) uses in-memory Mongoose mocking so it runs completely offline without requiring network access to MongoDB Atlas.
- Concurrency for likes and comments uses atomic MongoDB operations (`$addToSet`, `$pull`, `$inc`) ensuring strict data consistency under concurrent requests.
