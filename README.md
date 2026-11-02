# Swish — Campus Social Platform

Swish is a private social sharing platform built for campus communities.

---

## Architecture & Conventions

- **Monorepo**:
  - `backend/` — Express + Mongoose (MongoDB Atlas), JWT authentication, Cloudinary + Multer for media uploads.
  - `frontend/` — React 19 + Vite, React Router 7, Axios API service layer, custom dark theme vanilla CSS.
- **Authentication**: JWT Bearer token attached via Axios request interceptor (`swish_token` key in `localStorage`). Verified on backend with `verifyToken` middleware, attaching populated user document (`req.user`).
- **Role Guards**: `requireRole('admin', 'moderator')` middleware for administrative actions.

---

## Posts & Feed Slice (Person 2)

### 1. Data Models

#### Post Model (`backend/models/Post.js`)
```javascript
{
  _id: ObjectId,              // Auto-generated primary key
  authorId: ObjectId,         // Ref: 'User', indexed, taken strictly from req.user
  imageUrl: String,           // Full secure Cloudinary URL
  imagePublicId: String,      // Cloudinary public ID for asset management & deletion
  caption: String,            // Trimmed string, max 500 characters, default: ''
  likes: [ObjectId],          // Array of User ObjectIds who liked the post, default: []
  commentCount: Number,       // Counter cache for comments, default: 0
  isRemoved: Boolean,         // Moderation removal flag, default: false
  createdAt: Date             // Creation timestamp (indexed descending)
}
```

**Indexes**:
- `{ createdAt: -1 }` — Enables fast descending feed queries.
- `{ isRemoved: 1, createdAt: -1 }` — Compound index for feed queries filtering active posts.

---

### 2. API Endpoints

All endpoints below require authentication header: `Authorization: Bearer <token>`.

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `POST` | `/api/posts` | Required (`verifyToken`) | `multipart/form-data`<br>• `image` (file, max 5MB, JPEG/PNG/WebP)<br>• `caption` (text, max 500 chars) | Creates a post. Uploads to Cloudinary, stores post, returns created post with author summary. |
| `GET` | `/api/posts` | Required (`verifyToken`) | Query parameters:<br>• `limit` (default: 10, max: 50)<br>• `cursor` (last post ID for pagination) | Campus feed of all active posts (`isRemoved != true`), newest first. Returns `{ posts, nextCursor, hasMore }`. |
| `GET` | `/api/posts/user/:userId` | Required (`verifyToken`) | Query parameters:<br>• `limit` (default: 10, max: 50)<br>• `cursor` (pagination cursor) | Fetch posts by a specific user. |
| `DELETE` | `/api/posts/:id` | Required (`verifyToken`) | None | Delete post. Only the author can delete their post (returns 403 otherwise). Deletes Cloudinary image. |
| `GET` | `/api/users/:id` | Required (`verifyToken`) | None | Public profile view. Hides email and phone unless requester is viewing own profile. |
| `PUT` | `/api/users/profile` | Required (`verifyToken`) | JSON: `{ firstName, lastName, bio, avatar, phone }` | Update own profile. Validates bio (max 500) and avatar format/size. |
| `PUT` | `/api/users/me` | Required (`verifyToken`) | JSON: `{ firstName, lastName, bio, avatar, phone }` | Alias for `/api/users/profile`. |

#### Example Responses

##### `POST /api/posts` (201 Created)
```json
{
  "message": "Post created successfully",
  "post": {
    "_id": "6724fa1031bc00192a54b381",
    "authorId": "6724f8d231bc00192a54b370",
    "author": {
      "id": "6724f8d231bc00192a54b370",
      "name": "Jane Doe",
      "profilePhotoUrl": "https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg"
    },
    "imageUrl": "https://res.cloudinary.com/demo/image/upload/v1/swish/posts/photo.jpg",
    "imagePublicId": "swish/posts/photo",
    "caption": "Campus library during golden hour ✨",
    "likeCount": 0,
    "likedByMe": false,
    "commentCount": 0,
    "isRemoved": false,
    "createdAt": "2026-11-01T21:40:00.000Z"
  }
}
```

##### `GET /api/posts?limit=2` (200 OK)
```json
{
  "posts": [
    {
      "_id": "6724fa1031bc00192a54b381",
      "authorId": "6724f8d231bc00192a54b370",
      "author": {
        "id": "6724f8d231bc00192a54b370",
        "name": "Jane Doe",
        "profilePhotoUrl": "https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg"
      },
      "imageUrl": "https://res.cloudinary.com/demo/image/upload/v1/swish/posts/photo.jpg",
      "imagePublicId": "swish/posts/photo",
      "caption": "Campus library during golden hour ✨",
      "likeCount": 0,
      "likedByMe": false,
      "commentCount": 0,
      "isRemoved": false,
      "createdAt": "2026-11-01T21:40:00.000Z"
    }
  ],
  "nextCursor": "6724fa1031bc00192a54b381",
  "hasMore": true
}
```

---

## Engagement Slice (Person 3)

The Engagement slice adds interactive likes (FR-05, AC-03), threaded comments with atomic counter management (FR-06, AC-04), and a mutual follow system with follower/following lists and profile counts (FR-07, AC-05).

### 1. Data Models

#### Comment Model (`backend/models/Comment.js`)
```javascript
{
  _id: ObjectId,              // Auto-generated primary key
  postId: ObjectId,           // Ref: 'Post', required, indexed
  authorId: ObjectId,         // Ref: 'User', indexed, taken strictly from req.user
  text: String,               // Trimmed string, minlength 1, maxlength 300 characters, required
  isRemoved: Boolean,         // Moderation removal flag, default: false
  createdAt: Date             // Creation timestamp (indexed ascending for chrono comment threads)
}
```

**Indexes**:
- `{ postId: 1, createdAt: 1 }` — Enables fast chronological retrieval of comments for a post.
- `{ postId: 1, isRemoved: 1, createdAt: 1 }` — Filter active (non-removed) comments in chronological order.

#### Follow Model (`backend/models/Follow.js`)
```javascript
{
  _id: ObjectId,              // Auto-generated primary key
  followerId: ObjectId,       // Ref: 'User', required, indexed
  followingId: ObjectId,      // Ref: 'User', required, indexed
  createdAt: Date             // Timestamp when the follow relationship was established
}
```

**Indexes**:
- `{ followerId: 1, followingId: 1 }` — **UNIQUE** compound index. Enforces relationship uniqueness at database level; prevents duplicate follows and eliminates two-sided count desyncs.
- `{ followingId: 1, createdAt: -1 }` — Fast query for user's followers list.
- `{ followerId: 1, createdAt: -1 }` — Fast query for user's following list.

#### Extended Post Response Shape
Post objects returned by `getFeed`, `getUserPosts`, and `createPost` are additively enriched:
- `likeCount` (`Number`) — Total likes on the post.
- `likedByMe` (`Boolean`) — Whether the requesting authenticated user has liked this post.
- `commentCount` (`Number`) — Current comment count cache.
- Raw liker IDs array (`likes`) is strictly suppressed from client payloads.

#### Extended Profile Response Shape
Profile endpoints (`GET /api/users/profile`, `GET /api/users/me`, and `GET /api/users/:id`) are additively enriched:
- `followersCount` (`Number`) — Total users following this user.
- `followingCount` (`Number`) — Total users this user is following.
- `isFollowing` (`Boolean`) — Whether the requesting authenticated user currently follows this user (computed when viewing `/api/users/:id` of another user).

---

### 2. API Endpoints

All endpoints require authentication header: `Authorization: Bearer <token>`. Errors are returned in standard format `{ "message": "error description" }`.

| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `POST` | `/api/posts/:id/like` | Required (`verifyToken`) | None | Toggles like for current user using atomic `$addToSet` / `$pull`. Returns `{ liked, likeCount }`. |
| `POST` | `/api/posts/:postId/comments` | Required (`verifyToken`) | JSON: `{ "text": "..." }` | Creates a comment (1-300 trimmed chars) and atomically increments `post.commentCount`. |
| `GET` | `/api/posts/:postId/comments` | Required (`verifyToken`) | Query parameters:<br>• `limit` (default: 10, max: 50)<br>• `cursor` (pagination cursor) | Paginated comments for a post (oldest first, excludes `isRemoved: true`). Returns `{ comments, nextCursor, hasMore }`. |
| `DELETE` | `/api/comments/:id` | Required (`verifyToken`) | None | Deletes comment. Only author can delete (403 otherwise). Atomically decrements `post.commentCount`. |
| `POST` | `/api/users/:id/follow` | Required (`verifyToken`) | None | Idempotent follow of target user. Prevents self-follow (400). Returns updated counts and `isFollowing: true`. |
| `DELETE` | `/api/users/:id/follow` | Required (`verifyToken`) | None | Idempotent unfollow of target user. Returns updated counts and `isFollowing: false`. |
| `GET` | `/api/users/:id/followers` | Required (`verifyToken`) | Query parameters:<br>• `limit` (default: 20, max: 50)<br>• `page` (default: 1) | Paginated list of user summaries following target user (sanitized, no emails/passwords). |
| `GET` | `/api/users/:id/following` | Required (`verifyToken`) | Query parameters:<br>• `limit` (default: 20, max: 50)<br>• `page` (default: 1) | Paginated list of user summaries target user is following (sanitized, no emails/passwords). |

---

### 3. Example Responses

##### `POST /api/posts/:id/like` (200 OK)
```json
{
  "liked": true,
  "likeCount": 5
}
```

##### `POST /api/posts/:postId/comments` (201 Created)
```json
{
  "message": "Comment added successfully",
  "comment": {
    "_id": "6724fbad31bc00192a54b395",
    "postId": "6724fa1031bc00192a54b381",
    "authorId": "6724f8d231bc00192a54b370",
    "author": {
      "id": "6724f8d231bc00192a54b370",
      "name": "Jane Doe",
      "profilePhotoUrl": "https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg"
    },
    "text": "Stunning lighting! 🌇",
    "isRemoved": false,
    "createdAt": "2026-11-01T21:45:10.000Z"
  }
}
```

##### `GET /api/posts/:postId/comments?limit=10` (200 OK)
```json
{
  "comments": [
    {
      "_id": "6724fbad31bc00192a54b395",
      "postId": "6724fa1031bc00192a54b381",
      "authorId": "6724f8d231bc00192a54b370",
      "author": {
        "id": "6724f8d231bc00192a54b370",
        "name": "Jane Doe",
        "profilePhotoUrl": "https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg"
      },
      "text": "Stunning lighting! 🌇",
      "isRemoved": false,
      "createdAt": "2026-11-01T21:45:10.000Z"
    }
  ],
  "nextCursor": "6724fbad31bc00192a54b395",
  "hasMore": false
}
```

##### `DELETE /api/comments/:id` (200 OK)
```json
{
  "message": "Comment deleted successfully"
}
```

##### `POST /api/users/:id/follow` (200 OK)
```json
{
  "success": true,
  "message": "User followed successfully",
  "isFollowing": true,
  "followersCount": 12,
  "followingCount": 8
}
```

##### `DELETE /api/users/:id/follow` (200 OK)
```json
{
  "success": true,
  "message": "User unfollowed successfully",
  "isFollowing": false,
  "followersCount": 11,
  "followingCount": 8
}
```

##### `GET /api/users/:id/followers?limit=10&page=1` (200 OK)
```json
{
  "users": [
    {
      "id": "6724f8d231bc00192a54b370",
      "name": "Jane Doe",
      "profilePhotoUrl": "https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg",
      "role": "user"
    }
  ],
  "total": 1,
  "page": 1,
  "pages": 1,
  "hasMore": false
}
```

---

## Environment Variables

### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env` and set:
```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
PORT=5000

# Cloudinary credentials (required for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

---

## How to Run & Test

### Backend
```bash
cd backend
npm install
npm run dev             # Starts backend on http://localhost:5000
npm run test:posts      # Runs Person 2 test suite (11 test suites)
npm run test:engagement # Runs Person 3 test suite & e2e walkthrough (23 tests + walkthrough)
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # Starts Vite dev server on http://localhost:5173
npm run lint       # Runs ESLint (0 errors)
npm run build      # Production build check
```
