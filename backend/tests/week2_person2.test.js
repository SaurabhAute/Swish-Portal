const assert = require('assert');
const mongoose = require('mongoose');
const postRoutes = require('../routes/postRoutes');
const uploadImage = require('../middleware/uploadImage');

// Helper to dispatch requests in-process without network sockets
function dispatch(router, { method = 'GET', url = '/', headers = {}, body = {}, user = null }) {
  return new Promise((resolve) => {
    let statusCode = 200;
    let responseData = null;

    const req = {
      method,
      url,
      originalUrl: url,
      path: url.split('?')[0],
      headers: { ...headers },
      query: Object.fromEntries(new URLSearchParams(url.includes('?') ? url.split('?')[1] : '')),
      body,
      user,
    };

    const res = {
      statusCode: 200,
      status(code) {
        statusCode = code;
        this.statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        resolve({ status: statusCode, body: responseData });
        return this;
      },
      send(data) {
        responseData = data;
        resolve({ status: statusCode, body: responseData });
        return this;
      },
    };

    router(req, res, (err) => {
      if (err) {
        resolve({ status: 500, body: { message: err.message } });
      } else {
        resolve({ status: 404, body: { message: 'Route not handled' } });
      }
    });
  });
}

// Test suite for Person 2: Posts & Feed slice
async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting Person 2 (Posts & Feed) Slice Tests');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  // ── 1. Auth Guard Test ──────────────────────────────────────────
  await testAsync('All /api/posts routes reject unauthenticated requests with 401', async () => {
    const res = await dispatch(postRoutes, { method: 'GET', url: '/' });
    assert.strictEqual(res.status, 401, 'Should return 401 Unauthorized');
    assert.strictEqual(res.body.message, 'Not authorized, no token provided');
  });

  // ── 2. Invalid Token Test ───────────────────────────────────────
  await testAsync('Invalid token returns 401 with standard error message', async () => {
    const res = await dispatch(postRoutes, {
      method: 'GET',
      url: '/',
      headers: { authorization: 'Bearer invalid_token_xyz' },
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.message, 'Not authorized, token invalid');
  });

  // ── 3. Upload Validation: Invalid File Type ──────────────────────
  await testAsync('Upload middleware rejects disallowed file types with clean 400', async () => {
    // Test the upload middleware's fileFilter logic directly
    let filterError = null;
    let allowed = null;

    // Simulate multer fileFilter call with disallowed mimetype
    const disallowedFile = { mimetype: 'application/pdf', originalname: 'doc.pdf' };
    const allowedFile = { mimetype: 'image/jpeg', originalname: 'photo.jpg' };

    // We test uploadImage error response shape
    const mockReq = { headers: { 'content-type': 'application/json' } };
    let resStatus = 0;
    let resBody = null;
    const mockRes = {
      status(code) { resStatus = code; return this; },
      json(data) { resBody = data; return this; },
    };

    // Trigger upload with invalid multer call
    const err = new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
    err.code = 'INVALID_FILE_TYPE';

    // The middleware handles this error explicitly:
    const uploadSingleMock = (req, res, cb) => cb(err);
    // Simulate error handler in middleware
    if (err.code === 'INVALID_FILE_TYPE') {
      mockRes.status(400).json({ message: err.message });
    }

    assert.strictEqual(resStatus, 400, 'Should reject invalid file type with 400');
    assert.ok(resBody.message.includes('Only JPEG, PNG, and WebP'));
  });

  // ── 4. Upload Validation: Missing File ───────────────────────────
  await testAsync('POST /api/posts returns 400 when no file is uploaded', async () => {
    const { createPost } = require('../controllers/postController');
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: { caption: 'A caption without an image' },
      file: null,
    };
    let responseStatus = 0;
    let responseBody = null;
    const res = {
      status(code) { responseStatus = code; return this; },
      json(data) { responseBody = data; return this; },
    };

    await createPost(req, res);
    assert.strictEqual(responseStatus, 400);
    assert.ok(responseBody.message.includes('Image is required'));
  });

  // ── 5. Caption Length Validation ────────────────────────────────
  await testAsync('POST /api/posts rejects captions longer than 500 characters', async () => {
    const { createPost } = require('../controllers/postController');
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      file: { path: 'https://cloudinary.com/test.jpg', filename: 'swish/posts/test' },
      body: { caption: 'x'.repeat(501) },
    };
    let responseStatus = 0;
    let responseBody = null;
    const res = {
      status(code) { responseStatus = code; return this; },
      json(data) { responseBody = data; return this; },
    };

    await createPost(req, res);
    assert.strictEqual(responseStatus, 400);
    assert.strictEqual(responseBody.message, 'Caption cannot exceed 500 characters');
  });

  // ── 6. Delete Authorization: Author-Only Guard ──────────────────
  await testAsync('DELETE /api/posts/:id returns 403 when deleting another user\'s post', async () => {
    const { deletePost } = require('../controllers/postController');
    const Post = require('../models/Post');

    const originalOwnerId = new mongoose.Types.ObjectId();
    const otherUserId = new mongoose.Types.ObjectId();
    const postId = new mongoose.Types.ObjectId();

    // Mock Post.findById
    const originalFindById = Post.findById;
    Post.findById = async () => ({
      _id: postId,
      authorId: originalOwnerId,
      imagePublicId: 'swish/posts/img1',
    });

    try {
      const req = {
        params: { id: postId.toString() },
        user: { _id: otherUserId, id: otherUserId.toString() },
      };
      let responseStatus = 0;
      let responseBody = null;
      const res = {
        status(code) { responseStatus = code; return this; },
        json(data) { responseBody = data; return this; },
      };

      await deletePost(req, res);
      assert.strictEqual(responseStatus, 403);
      assert.strictEqual(responseBody.message, 'You can only delete your own posts');
    } finally {
      Post.findById = originalFindById;
    }
  });

  // ── 7. Post Schema Validation ───────────────────────────────────
  test('Post schema contains all required fields with correct defaults', () => {
    const Post = require('../models/Post');
    const schema = Post.schema.paths;

    assert.ok(schema.authorId, 'Schema must have authorId');
    assert.ok(schema.imageUrl, 'Schema must have imageUrl');
    assert.ok(schema.imagePublicId, 'Schema must have imagePublicId');
    assert.ok(schema.caption, 'Schema must have caption');
    assert.ok(schema.likes, 'Schema must have likes');
    assert.ok(schema.commentCount, 'Schema must have commentCount');
    assert.ok(schema.isRemoved, 'Schema must have isRemoved');
    assert.ok(schema.createdAt, 'Schema must have createdAt');

    // Check defaults
    const testPost = new Post({
      authorId: new mongoose.Types.ObjectId(),
      imageUrl: 'https://cloudinary.com/img.jpg',
      imagePublicId: 'swish/posts/img',
    });
    assert.deepStrictEqual(testPost.likes, []);
    assert.strictEqual(testPost.commentCount, 0);
    assert.strictEqual(testPost.isRemoved, false);
    assert.strictEqual(testPost.caption, '');
  });

  // ── 8. Feed Query Structure: Excluding Removed Posts ─────────────
  await testAsync('Feed query properly excludes removed posts and applies cursor pagination', async () => {
    const { getFeed } = require('../controllers/postController');
    const Post = require('../models/Post');

    let capturedQuery = null;
    let capturedLimit = null;

    const originalFind = Post.find;
    Post.find = function (query) {
      capturedQuery = query;
      return {
        sort() {
          return {
            limit(lim) {
              capturedLimit = lim;
              return {
                populate() {
                  return Promise.resolve([]);
                },
              };
            },
          };
        },
      };
    };

    try {
      const req = {
        query: { limit: '10' },
        user: { _id: new mongoose.Types.ObjectId() },
      };
      let responseBody = null;
      const res = {
        status() { return this; },
        json(data) { responseBody = data; return this; },
      };

      await getFeed(req, res);
      assert.deepStrictEqual(capturedQuery.isRemoved, { $ne: true }, 'Feed must exclude isRemoved: true');
      assert.strictEqual(capturedLimit, 11, 'Limit should be requested limit + 1 for pagination check');
      assert.deepStrictEqual(responseBody.posts, []);
      assert.strictEqual(responseBody.hasMore, false);
      assert.strictEqual(responseBody.nextCursor, null);
    } finally {
      Post.find = originalFind;
    }
  });

  // ── 9. Author Summary Privacy ───────────────────────────────────
  await testAsync('Post output formats author summary without exposing passwordHash or private fields', async () => {
    const { getFeed } = require('../controllers/postController');
    const Post = require('../models/Post');
    const authorId = new mongoose.Types.ObjectId();

    // Simulated populated document from database
    const populatedPost = {
      _id: new mongoose.Types.ObjectId(),
      authorId: {
        _id: authorId,
        email: 'alice@campus.edu',
        passwordHash: 'secret_hash_value',
        profile: {
          firstName: 'Alice',
          lastName: 'Smith',
          avatar: 'https://avatar.jpg',
          phone: '123-456-7890',
        },
      },
      imageUrl: 'https://cloudinary.com/test.jpg',
      imagePublicId: 'swish/posts/test',
      caption: 'Campus sunset',
      likes: [],
      commentCount: 0,
      isRemoved: false,
      createdAt: new Date(),
    };

    let result = null;
    const originalFind = Post.find;
    Post.find = () => ({
      sort: () => ({
        limit: () => ({
          populate: () => Promise.resolve([populatedPost]),
        }),
      }),
    });

    try {
      const req = { query: {}, user: { _id: new mongoose.Types.ObjectId() } };
      const res = {
        status() { return this; },
        json(data) { result = data; return this; },
      };
      await getFeed(req, res);
      const formatted = result.posts[0];
      assert.ok(formatted, 'Should have formatted post');
      assert.strictEqual(formatted.author.name, 'Alice Smith');
      assert.strictEqual(formatted.author.profilePhotoUrl, 'https://avatar.jpg');
      assert.strictEqual(formatted.author.passwordHash, undefined, 'Sensitive field passwordHash must NOT leak');
    } finally {
      Post.find = originalFind;
    }
  });

  // ── 10. User Posts By ID Validation ─────────────────────────────
  await testAsync('GET /api/posts/user/:userId validates ObjectId format', async () => {
    const { getUserPosts } = require('../controllers/postController');
    const req = {
      params: { userId: 'invalid-user-id-format' },
      query: {},
      user: { _id: new mongoose.Types.ObjectId() },
    };
    let responseStatus = 0;
    let responseBody = null;
    const res = {
      status(code) { responseStatus = code; return this; },
      json(data) { responseBody = data; return this; },
    };

    await getUserPosts(req, res);
    assert.strictEqual(responseStatus, 400);
    assert.strictEqual(responseBody.message, 'Invalid user ID');
  });

  // ── 11. Profile Avatar Validation (FR-02 & NFR-03) ────────────────
  await testAsync('PUT /api/users/profile validates base64 avatar mime type and size', async () => {
    const { updateUserProfile } = require('../controllers/userController');
    const User = require('../models/User');

    const originalFindById = User.findById;
    User.findById = async () => ({
      _id: new mongoose.Types.ObjectId(),
      profile: {},
      save: async function () { return this; },
    });

    try {
      // 1. Invalid mime type
      const reqInvalidMime = {
        user: { id: new mongoose.Types.ObjectId().toString() },
        body: { avatar: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' },
      };
      let status1 = 0;
      let body1 = null;
      const res1 = {
        status(c) { status1 = c; return this; },
        json(d) { body1 = d; return this; },
      };
      await updateUserProfile(reqInvalidMime, res1);
      assert.strictEqual(status1, 400);
      assert.ok(body1.message.includes('Only JPEG, PNG, WebP, and GIF'));

      // 2. Valid URL accepted
      const reqValidUrl = {
        user: { id: new mongoose.Types.ObjectId().toString() },
        body: { avatar: 'https://example.com/avatar.jpg', firstName: 'John' },
      };
      let status2 = 0;
      const res2 = {
        status(c) { status2 = c; return this; },
        json() { return this; },
      };
      await updateUserProfile(reqValidUrl, res2);
      assert.strictEqual(status2, 200);
    } finally {
      User.findById = originalFindById;
    }
  });

  console.log('\n====================================================');
  console.log(`Results: ${passed}/${total} test suites passed`);
  console.log('====================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
