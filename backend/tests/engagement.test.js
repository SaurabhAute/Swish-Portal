const assert = require('assert');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const { toggleLike, getFeed, getUserPosts } = require('../controllers/postController');
const postRoutes = require('../routes/postRoutes');

// Helper to simulate router request dispatch without network sockets
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
      params: {},
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

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting Person 3 (Engagement) Slice Tests');
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

  console.log('--- 1. Likes Slice Tests (FR-05, AC-03) ---');

  // Test 1: Invalid ObjectId returns 400
  await testAsync('POST /api/posts/:id/like returns 400 for invalid ObjectId', async () => {
    const req = {
      params: { id: 'invalid-post-id' },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    let status = 0;
    let body = null;
    const res = {
      status(c) { status = c; return this; },
      json(d) { body = d; return this; },
    };

    await toggleLike(req, res);
    assert.strictEqual(status, 400);
    assert.strictEqual(body.message, 'Invalid post ID');
  });

  // Test 2: Non-existent post returns 404
  await testAsync('POST /api/posts/:id/like returns 404 if post does not exist', async () => {
    const originalFindById = Post.findById;
    Post.findById = async () => null;

    try {
      const req = {
        params: { id: new mongoose.Types.ObjectId().toString() },
        user: { _id: new mongoose.Types.ObjectId() },
      };
      let status = 0;
      let body = null;
      const res = {
        status(c) { status = c; return this; },
        json(d) { body = d; return this; },
      };

      await toggleLike(req, res);
      assert.strictEqual(status, 404);
      assert.strictEqual(body.message, 'Post not found');
    } finally {
      Post.findById = originalFindById;
    }
  });

  // Test 3: Removed post cannot be liked (returns 404)
  await testAsync('POST /api/posts/:id/like returns 404 if post isRemoved is true', async () => {
    const originalFindById = Post.findById;
    Post.findById = async () => ({
      _id: new mongoose.Types.ObjectId(),
      isRemoved: true,
      likes: [],
    });

    try {
      const req = {
        params: { id: new mongoose.Types.ObjectId().toString() },
        user: { _id: new mongoose.Types.ObjectId() },
      };
      let status = 0;
      let body = null;
      const res = {
        status(c) { status = c; return this; },
        json(d) { body = d; return this; },
      };

      await toggleLike(req, res);
      assert.strictEqual(status, 404);
      assert.strictEqual(body.message, 'Post not found');
    } finally {
      Post.findById = originalFindById;
    }
  });

  // Test 4: AC-03 - Liking an unliked post records like and returns updated count
  await testAsync('AC-03: Liking a post adds like atomically and returns { liked: true, likeCount: 1 }', async () => {
    const postId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    const originalFindById = Post.findById;
    const originalFindOneAndUpdate = Post.findOneAndUpdate;

    let updateOperatorUsed = null;

    Post.findById = async () => ({
      _id: postId,
      isRemoved: false,
      likes: [],
      authorId: new mongoose.Types.ObjectId(),
    });

    Post.findOneAndUpdate = async (query, update, options) => {
      updateOperatorUsed = update;
      return {
        _id: postId,
        isRemoved: false,
        likes: [userId],
      };
    };

    try {
      const req = {
        params: { id: postId.toString() },
        user: { _id: userId, id: userId.toString() },
      };
      let status = 0;
      let body = null;
      const res = {
        status(c) { status = c; return this; },
        json(d) { body = d; return this; },
      };

      await toggleLike(req, res);
      assert.strictEqual(status, 200);
      assert.strictEqual(body.liked, true);
      assert.strictEqual(body.likeCount, 1);
      assert.ok(updateOperatorUsed.$addToSet, 'Must use $addToSet operator for atomic like');
    } finally {
      Post.findById = originalFindById;
      Post.findOneAndUpdate = originalFindOneAndUpdate;
    }
  });

  // Test 5: Liking twice toggles like off
  await testAsync('Liking an already liked post toggles like off atomically ($pull) and decrements count', async () => {
    const postId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    const originalFindById = Post.findById;
    const originalFindOneAndUpdate = Post.findOneAndUpdate;

    let updateOperatorUsed = null;

    Post.findById = async () => ({
      _id: postId,
      isRemoved: false,
      likes: [userId],
      authorId: new mongoose.Types.ObjectId(),
    });

    Post.findOneAndUpdate = async (query, update, options) => {
      updateOperatorUsed = update;
      return {
        _id: postId,
        isRemoved: false,
        likes: [],
      };
    };

    try {
      const req = {
        params: { id: postId.toString() },
        user: { _id: userId, id: userId.toString() },
      };
      let status = 0;
      let body = null;
      const res = {
        status(c) { status = c; return this; },
        json(d) { body = d; return this; },
      };

      await toggleLike(req, res);
      assert.strictEqual(status, 200);
      assert.strictEqual(body.liked, false);
      assert.strictEqual(body.likeCount, 0);
      assert.ok(updateOperatorUsed.$pull, 'Must use $pull operator for atomic unlike');
    } finally {
      Post.findById = originalFindById;
      Post.findOneAndUpdate = originalFindOneAndUpdate;
    }
  });

  // Test 6: Concurrent likes do not duplicate ($addToSet safety)
  await testAsync('Concurrent likes do not create duplicate likes due to atomic $addToSet', async () => {
    const postId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    // Mock an in-memory post document simulating MongoDB atomic behavior
    const mockPostDoc = {
      _id: postId,
      isRemoved: false,
      likes: [],
      authorId: new mongoose.Types.ObjectId(),
    };

    const originalFindById = Post.findById;
    const originalFindOneAndUpdate = Post.findOneAndUpdate;

    Post.findById = async () => ({ ...mockPostDoc, likes: [...mockPostDoc.likes] });
    Post.findOneAndUpdate = async (query, update) => {
      if (update.$addToSet && update.$addToSet.likes) {
        const toAdd = update.$addToSet.likes.toString();
        if (!mockPostDoc.likes.some((id) => id.toString() === toAdd)) {
          mockPostDoc.likes.push(update.$addToSet.likes);
        }
      }
      return { ...mockPostDoc, likes: [...mockPostDoc.likes] };
    };

    try {
      const req1 = { params: { id: postId.toString() }, user: { _id: userId, id: userId.toString() } };
      const req2 = { params: { id: postId.toString() }, user: { _id: userId, id: userId.toString() } };

      let res1Body = null;
      let res2Body = null;
      const res1 = { status() { return this; }, json(d) { res1Body = d; return this; } };
      const res2 = { status() { return this; }, json(d) { res2Body = d; return this; } };

      // Simulate concurrent requests
      await Promise.all([toggleLike(req1, res1), toggleLike(req2, res2)]);

      assert.strictEqual(mockPostDoc.likes.length, 1, 'Likes array must not contain duplicate user IDs');
    } finally {
      Post.findById = originalFindById;
      Post.findOneAndUpdate = originalFindOneAndUpdate;
    }
  });

  // Test 7: Post response format provides likeCount and likedByMe without exposing raw liker IDs
  await testAsync('Post feed response contains likeCount & likedByMe without raw likes array', async () => {
    const currentUserId = new mongoose.Types.ObjectId();
    const otherUserId = new mongoose.Types.ObjectId();

    const samplePost = {
      _id: new mongoose.Types.ObjectId(),
      authorId: {
        _id: otherUserId,
        email: 'bob@campus.edu',
        profile: { firstName: 'Bob', lastName: 'Builder' },
      },
      imageUrl: 'https://cloudinary.com/test.jpg',
      imagePublicId: 'swish/posts/test',
      caption: 'Testing likes feed',
      likes: [currentUserId],
      commentCount: 3,
      isRemoved: false,
      createdAt: new Date(),
    };

    const originalFind = Post.find;
    Post.find = () => ({
      sort: () => ({
        limit: () => ({
          populate: () => Promise.resolve([samplePost]),
        }),
      }),
    });

    try {
      const req = { query: {}, user: { _id: currentUserId, id: currentUserId.toString() } };
      let result = null;
      const res = {
        status() { return this; },
        json(d) { result = d; return this; },
      };

      await getFeed(req, res);
      const post = result.posts[0];
      assert.strictEqual(post.likeCount, 1);
      assert.strictEqual(post.likedByMe, true);
      assert.strictEqual(post.commentCount, 3);
      assert.strictEqual(post.likes, undefined, 'Raw likes array must NOT be exposed to client');
    } finally {
      Post.find = originalFind;
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
