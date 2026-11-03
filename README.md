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
    "likes": [],
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
      "likes": [],
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
npm run dev        # Starts backend on http://localhost:5000
npm run test:posts # Runs slice automated test suite (11 test suites)
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # Starts Vite dev server on http://localhost:5173
npm run lint       # Runs ESLint (0 errors)
npm run build      # Production build check
```
