const assert = require('assert');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Follow = require('../models/Follow');
const { toggleLike, getFeed, getUserPosts } = require('../controllers/postController');
const { addComment, getComments, deleteComment } = require('../controllers/commentController');
const { followUser, unfollowUser, getFollowers, getFollowing } = require('../controllers/followController');
const { getUserProfile, getUserById } = require('../controllers/userController');
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

  console.log('\n--- 2. Comments Slice Tests (FR-06, AC-04) ---');

  // Test 8: Comment schema validation
  test('Comment schema contains all required fields, limits, and defaults', () => {
    const paths = Comment.schema.paths;
    assert.ok(paths.postId, 'Comment schema must have postId');
    assert.ok(paths.authorId, 'Comment schema must have authorId');
    assert.ok(paths.text, 'Comment schema must have text');
    assert.ok(paths.isRemoved, 'Comment schema must have isRemoved');
    assert.ok(paths.createdAt, 'Comment schema must have createdAt');

    const testComment = new Comment({
      postId: new mongoose.Types.ObjectId(),
      authorId: new mongoose.Types.ObjectId(),
      text: 'Hello campus!',
    });
    assert.strictEqual(testComment.isRemoved, false);
    assert.strictEqual(testComment.text, 'Hello campus!');
  });

  // Test 9: Empty or trimmed empty text rejected with 400
  await testAsync('POST /api/posts/:postId/comments rejects empty text with 400', async () => {
    const postId = new mongoose.Types.ObjectId();
    const originalFindById = Post.findById;
    Post.findById = async () => ({ _id: postId, isRemoved: false });

    try {
      const req = {
        params: { postId: postId.toString() },
        body: { text: '   ' },
        user: { _id: new mongoose.Types.ObjectId() },
      };
      let status = 0;
      let body = null;
      const res = { status(c) { status = c; return this; }, json(d) { body = d; return this; } };

      await addComment(req, res);
      assert.strictEqual(status, 400);
      assert.strictEqual(body.message, 'Comment text cannot be empty');
    } finally {
      Post.findById = originalFindById;
    }
  });

  // Test 10: Text over 300 characters rejected with 400
  await testAsync('POST /api/posts/:postId/comments rejects text exceeding 300 chars with 400', async () => {
    const postId = new mongoose.Types.ObjectId();
    const originalFindById = Post.findById;
    Post.findById = async () => ({ _id: postId, isRemoved: false });

    try {
      const req = {
        params: { postId: postId.toString() },
        body: { text: 'a'.repeat(301) },
        user: { _id: new mongoose.Types.ObjectId() },
      };
      let status = 0;
      let body = null;
      const res = { status(c) { status = c; return this; }, json(d) { body = d; return this; } };

      await addComment(req, res);
      assert.strictEqual(status, 400);
      assert.strictEqual(body.message, 'Comment cannot exceed 300 characters');
    } finally {
      Post.findById = originalFindById;
    }
  });

  // Test 11: Missing or removed post returns 404
  await testAsync('POST /api/posts/:postId/comments returns 404 for removed post', async () => {
    const postId = new mongoose.Types.ObjectId();
    const originalFindById = Post.findById;
    Post.findById = async () => ({ _id: postId, isRemoved: true });

    try {
      const req = {
        params: { postId: postId.toString() },
        body: { text: 'Nice photo!' },
        user: { _id: new mongoose.Types.ObjectId() },
      };
      let status = 0;
      let body = null;
      const res = { status(c) { status = c; return this; }, json(d) { body = d; return this; } };

      await addComment(req, res);
      assert.strictEqual(status, 404);
      assert.strictEqual(body.message, 'Post not found');
    } finally {
      Post.findById = originalFindById;
    }
  });

  // Test 12: AC-04 - Successfully create comment, atomically increment commentCount, populate author summary
  await testAsync('AC-04: Submitting comment stores comment, increments post commentCount, returns author summary', async () => {
    const postId = new mongoose.Types.ObjectId();
    const authorId = new mongoose.Types.ObjectId();
    const commentId = new mongoose.Types.ObjectId();

    let incUpdate = null;
    const originalFindById = Post.findById;
    const originalFindByIdAndUpdate = Post.findByIdAndUpdate;
    const originalCreate = Comment.create;

    Post.findById = async () => ({ _id: postId, isRemoved: false, authorId: new mongoose.Types.ObjectId() });
    Post.findByIdAndUpdate = async (id, update) => {
      incUpdate = update;
      return { _id: id };
    };

    Comment.create = async (doc) => ({
      _id: commentId,
      postId: doc.postId,
      authorId: {
        _id: authorId,
        email: 'alice@campus.edu',
        profile: { firstName: 'Alice', lastName: 'Smith', avatar: 'https://avatar.jpg' },
      },
      text: doc.text,
      isRemoved: false,
      createdAt: new Date(),
      populate: async function () { return this; },
    });

    try {
      const req = {
        params: { postId: postId.toString() },
        body: { text: 'Great photo of the quad!' },
        user: { _id: authorId, id: authorId.toString() },
      };
      let status = 0;
      let body = null;
      const res = { status(c) { status = c; return this; }, json(d) { body = d; return this; } };

      await addComment(req, res);
      assert.strictEqual(status, 201);
      assert.strictEqual(body.message, 'Comment added successfully');
      assert.strictEqual(body.comment.text, 'Great photo of the quad!');
      assert.strictEqual(body.comment.author.name, 'Alice Smith');
      assert.strictEqual(body.comment.author.profilePhotoUrl, 'https://avatar.jpg');
      assert.deepStrictEqual(incUpdate, { $inc: { commentCount: 1 } }, 'Must atomically increment commentCount');
    } finally {
      Post.findById = originalFindById;
      Post.findByIdAndUpdate = originalFindByIdAndUpdate;
      Comment.create = originalCreate;
    }
  });

  // Test 13: GET /api/posts/:postId/comments paginated, oldest first, excludes isRemoved
  await testAsync('GET /api/posts/:postId/comments returns paginated comments (oldest first, no removed)', async () => {
    const postId = new mongoose.Types.ObjectId();
    const authorId = new mongoose.Types.ObjectId();

    let capturedQuery = null;
    let capturedSort = null;

    const originalPostFindById = Post.findById;
    const originalCommentFind = Comment.find;

    Post.findById = async () => ({ _id: postId, isRemoved: false });

    const sampleComment = {
      _id: new mongoose.Types.ObjectId(),
      postId,
      authorId: {
        _id: authorId,
        email: 'bob@campus.edu',
        profile: { firstName: 'Bob', lastName: 'Lee' },
      },
      text: 'First comment!',
      isRemoved: false,
      createdAt: new Date('2026-11-01T10:00:00.000Z'),
    };

    Comment.find = function (q) {
      capturedQuery = q;
      return {
        sort(s) {
          capturedSort = s;
          return {
            limit(l) {
              return {
                populate: () => Promise.resolve([sampleComment]),
              };
            },
          };
        },
      };
    };

    try {
      const req = {
        params: { postId: postId.toString() },
        query: { limit: '10' },
        user: { _id: authorId },
      };
      let status = 0;
      let body = null;
      const res = { status(c) { status = c; return this; }, json(d) { body = d; return this; } };

      await getComments(req, res);
      assert.strictEqual(status, 200);
      assert.deepStrictEqual(capturedQuery.isRemoved, { $ne: true });
      assert.deepStrictEqual(capturedSort, { createdAt: 1 }, 'Comments must be sorted oldest first');
      assert.strictEqual(body.comments.length, 1);
      assert.strictEqual(body.hasMore, false);
      assert.strictEqual(body.comments[0].text, 'First comment!');
    } finally {
      Post.findById = originalPostFindById;
      Comment.find = originalCommentFind;
    }
  });

  // Test 14: DELETE /api/comments/:id returns 403 when deleting someone else's comment
  await testAsync('DELETE /api/comments/:id returns 403 when deleting another user\'s comment', async () => {
    const commentOwnerId = new mongoose.Types.ObjectId();
    const otherUserId = new mongoose.Types.ObjectId();
    const commentId = new mongoose.Types.ObjectId();

    const originalFindById = Comment.findById;
    Comment.findById = async () => ({
      _id: commentId,
      authorId: commentOwnerId,
      postId: new mongoose.Types.ObjectId(),
    });

    try {
      const req = {
        params: { id: commentId.toString() },
        user: { _id: otherUserId, id: otherUserId.toString() },
      };
      let status = 0;
      let body = null;
      const res = { status(c) { status = c; return this; }, json(d) { body = d; return this; } };

      await deleteComment(req, res);
      assert.strictEqual(status, 403);
      assert.strictEqual(body.message, 'You can only delete your own comments');
    } finally {
      Comment.findById = originalFindById;
    }
  });

  // Test 15: DELETE /api/comments/:id allows author deletion and decrements post commentCount
  await testAsync('DELETE /api/comments/:id deletes author comment and atomically decrements commentCount', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const commentId = new mongoose.Types.ObjectId();
    const postId = new mongoose.Types.ObjectId();

    let postUpdated = false;
    let commentDeleted = false;

    const originalFindById = Comment.findById;
    const originalFindByIdAndDelete = Comment.findByIdAndDelete;
    const originalPostFindOneAndUpdate = Post.findOneAndUpdate;

    Comment.findById = async () => ({
      _id: commentId,
      authorId: ownerId,
      postId,
    });
    Comment.findByIdAndDelete = async (id) => {
      commentDeleted = true;
      return { _id: id };
    };
    Post.findOneAndUpdate = async (q, u) => {
      postUpdated = true;
      assert.deepStrictEqual(u, { $inc: { commentCount: -1 } });
      return { _id: postId };
    };

    try {
      const req = {
        params: { id: commentId.toString() },
        user: { _id: ownerId, id: ownerId.toString() },
      };
      let status = 0;
      let body = null;
      const res = { status(c) { status = c; return this; }, json(d) { body = d; return this; } };

      await deleteComment(req, res);
      assert.strictEqual(status, 200);
      assert.strictEqual(body.message, 'Comment deleted successfully');
      assert.strictEqual(commentDeleted, true);
      assert.strictEqual(postUpdated, true);
    } finally {
      Comment.findById = originalFindById;
      Comment.findByIdAndDelete = originalFindByIdAndDelete;
      Post.findOneAndUpdate = originalPostFindOneAndUpdate;
    }
  });

  console.log('\n--- 3. Follow Slice Tests (FR-07, AC-05) ---');

  // Test 16: Follow schema contains unique compound index
  test('Follow schema contains followerId, followingId, and unique compound index', () => {
    const paths = Follow.schema.paths;
    assert.ok(paths.followerId, 'Follow schema must have followerId');
    assert.ok(paths.followingId, 'Follow schema must have followingId');
    assert.ok(paths.createdAt, 'Follow schema must have createdAt');

    const indexes = Follow.schema.indexes();
    const hasUniqueCompound = indexes.some(
      ([idx, opts]) => idx.followerId === 1 && idx.followingId === 1 && opts.unique === true
    );
    assert.ok(hasUniqueCompound, 'Follow schema must define unique compound index on (followerId, followingId)');
  });

  // Test 17: User cannot follow themselves (400)
  await testAsync('POST /api/users/:id/follow returns 400 when attempting to follow self', async () => {
    const userId = new mongoose.Types.ObjectId();
    const req = {
      params: { id: userId.toString() },
      user: { _id: userId, id: userId.toString() },
    };
    let status = 0;
    let body = null;
    const res = { status(c) { status = c; return this; }, json(d) { body = d; return this; } };

    await followUser(req, res);
    assert.strictEqual(status, 400);
    assert.strictEqual(body.message, 'You cannot follow yourself');
  });

  // Test 18: Target user does not exist returns 404
  await testAsync('POST /api/users/:id/follow returns 404 for non-existent user', async () => {
    const currentUserId = new mongoose.Types.ObjectId();
    const targetUserId = new mongoose.Types.ObjectId();

    const originalFindById = User.findById;
    User.findById = async () => null;

    try {
      const req = {
        params: { id: targetUserId.toString() },
        user: { _id: currentUserId, id: currentUserId.toString() },
      };
      let status = 0;
      let body = null;
      const res = { status(c) { status = c; return this; }, json(d) { body = d; return this; } };

      await followUser(req, res);
      assert.strictEqual(status, 404);
      assert.strictEqual(body.message, 'User not found');
    } finally {
      User.findById = originalFindById;
    }
  });

  // Test 19: Invalid ObjectId returns 400
  await testAsync('POST /api/users/:id/follow returns 400 for invalid ObjectId', async () => {
    const req = {
      params: { id: 'invalid-id' },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    let status = 0;
    let body = null;
    const res = { status(c) { status = c; return this; }, json(d) { body = d; return this; } };

    await followUser(req, res);
    assert.strictEqual(status, 400);
    assert.strictEqual(body.message, 'Invalid user ID');
  });

  // Test 20: Following twice is harmless and idempotent
  await testAsync('POST /api/users/:id/follow is idempotent (following twice does not error or corrupt)', async () => {
    const currentUserId = new mongoose.Types.ObjectId();
    const targetUserId = new mongoose.Types.ObjectId();

    const originalUserFindById = User.findById;
    const originalFollowCreate = Follow.create;
    const originalCount = Follow.countDocuments;

    User.findById = async () => ({ _id: targetUserId });

    let createCalls = 0;
    Follow.create = async () => {
      createCalls++;
      if (createCalls > 1) {
        // Simulate duplicate key error
        const dupErr = new Error('E11000 duplicate key error collection');
        dupErr.code = 11000;
        throw dupErr;
      }
      return { followerId: currentUserId, followingId: targetUserId };
    };

    Follow.countDocuments = async (q) => {
      return 1; // Count stays 1
    };

    try {
      const req = {
        params: { id: targetUserId.toString() },
        user: { _id: currentUserId, id: currentUserId.toString() },
      };
      let status = 0;
      let body = null;
      const res = { status(c) { status = c; return this; }, json(d) { body = d; return this; } };

      // First follow
      await followUser(req, res);
      assert.strictEqual(status, 200);
      assert.strictEqual(body.isFollowing, true);

      // Second follow (idempotent duplicate)
      await followUser(req, res);
      assert.strictEqual(status, 200);
      assert.strictEqual(body.isFollowing, true);
      assert.strictEqual(body.followersCount, 1);
    } finally {
      User.findById = originalUserFindById;
      Follow.create = originalFollowCreate;
      Follow.countDocuments = originalCount;
    }
  });

  // Test 21: Unfollow when not following is harmless and idempotent
  await testAsync('DELETE /api/users/:id/follow is idempotent (unfollowing when not following is harmless)', async () => {
    const currentUserId = new mongoose.Types.ObjectId();
    const targetUserId = new mongoose.Types.ObjectId();

    const originalUserFindById = User.findById;
    const originalFollowFindOneAndDelete = Follow.findOneAndDelete;
    const originalCount = Follow.countDocuments;

    User.findById = async () => ({ _id: targetUserId });
    Follow.findOneAndDelete = async () => null; // Nothing to delete
    Follow.countDocuments = async () => 0;

    try {
      const req = {
        params: { id: targetUserId.toString() },
        user: { _id: currentUserId, id: currentUserId.toString() },
      };
      let status = 0;
      let body = null;
      const res = { status(c) { status = c; return this; }, json(d) { body = d; return this; } };

      await unfollowUser(req, res);
      assert.strictEqual(status, 200);
      assert.strictEqual(body.isFollowing, false);
      assert.strictEqual(body.followersCount, 0);
    } finally {
      User.findById = originalUserFindById;
      Follow.findOneAndDelete = originalFollowFindOneAndDelete;
      Follow.countDocuments = originalCount;
    }
  });

  // Test 22: AC-05 - Following relationship reflected on both profiles
  await testAsync('AC-05: Following relationship reflected on both profiles (followersCount, followingCount, isFollowing)', async () => {
    const userA = new mongoose.Types.ObjectId(); // follower
    const userB = new mongoose.Types.ObjectId(); // followed

    // User A follows User B
    const originalUserFindById = User.findById;
    const originalFollowCount = Follow.countDocuments;
    const originalFollowFindOne = Follow.findOne;

    User.findById = (id) => {
      const isA = id.toString() === userA.toString();
      const mockDoc = {
        _id: isA ? userA : userB,
        email: isA ? 'a@campus.edu' : 'b@campus.edu',
        role: 'user',
        profile: { firstName: isA ? 'User' : 'Target', lastName: isA ? 'A' : 'B' },
        toJSON() { return { _id: this._id, email: this.email, role: this.role, profile: { ...this.profile } }; },
      };
      return {
        select: async () => mockDoc,
        then: (resolve) => Promise.resolve(mockDoc).then(resolve),
      };
    };

    // Follow relations: A follows B
    Follow.countDocuments = async (query) => {
      if (query.followingId && query.followingId.toString() === userB.toString()) return 1; // B has 1 follower
      if (query.followerId && query.followerId.toString() === userA.toString()) return 1; // A follows 1 user
      return 0;
    };

    Follow.findOne = async (query) => {
      if (query.followerId.toString() === userA.toString() && query.followingId.toString() === userB.toString()) {
        return { followerId: userA, followingId: userB };
      }
      return null;
    };

    try {
      // 1. User A checks own profile
      const reqOwn = { user: { _id: userA, id: userA.toString() } };
      let ownBody = null;
      const resOwn = { status() { return this; }, json(d) { ownBody = d; return this; } };
      await getUserProfile(reqOwn, resOwn);

      assert.strictEqual(ownBody.user.followingCount, 1, 'User A followingCount should be 1');
      assert.strictEqual(ownBody.user.followersCount, 0, 'User A followersCount should be 0');

      // 2. User A views User B's profile
      const reqPublic = {
        params: { id: userB.toString() },
        user: { _id: userA, id: userA.toString() },
      };
      let publicBody = null;
      const resPublic = { status() { return this; }, json(d) { publicBody = d; return this; } };
      await getUserById(reqPublic, resPublic);

      assert.strictEqual(publicBody.user.followersCount, 1, 'User B followersCount should be 1');
      assert.strictEqual(publicBody.user.isFollowing, true, 'User A viewing User B should show isFollowing=true');
    } finally {
      User.findById = originalUserFindById;
      Follow.countDocuments = originalFollowCount;
      Follow.findOne = originalFollowFindOne;
    }
  });

  // Test 23: GET /api/users/:id/followers and following return sanitized user summaries
  await testAsync('GET followers and following return paginated user summaries without emails or passwords', async () => {
    const targetUserId = new mongoose.Types.ObjectId();
    const followerUserId = new mongoose.Types.ObjectId();

    const originalUserFindById = User.findById;
    const originalFollowFind = Follow.find;
    const originalFollowCount = Follow.countDocuments;

    User.findById = async () => ({ _id: targetUserId });

    const sampleFollow = {
      _id: new mongoose.Types.ObjectId(),
      followerId: {
        _id: followerUserId,
        email: 'secret@campus.edu',
        passwordHash: 'secret_hash',
        role: 'user',
        profile: { firstName: 'Sam', lastName: 'Student', avatar: 'https://avatar.png' },
      },
      followingId: targetUserId,
      createdAt: new Date(),
    };

    Follow.find = () => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            populate: () => Promise.resolve([sampleFollow]),
          }),
        }),
      }),
    });
    Follow.countDocuments = async () => 1;

    try {
      const req = {
        params: { id: targetUserId.toString() },
        query: { limit: '10', page: '1' },
        user: { _id: new mongoose.Types.ObjectId() },
      };
      let status = 0;
      let body = null;
      const res = { status(c) { status = c; return this; }, json(d) { body = d; return this; } };

      await getFollowers(req, res);
      assert.strictEqual(status, 200);
      assert.strictEqual(body.users.length, 1);
      const followerSummary = body.users[0];
      assert.strictEqual(followerSummary.name, 'Sam Student');
      assert.strictEqual(followerSummary.profilePhotoUrl, 'https://avatar.png');
      assert.strictEqual(followerSummary.role, 'user');
      assert.strictEqual(followerSummary.email, undefined, 'Followers list must NOT expose emails');
      assert.strictEqual(followerSummary.passwordHash, undefined, 'Followers list must NOT expose passwords');
    } finally {
      User.findById = originalUserFindById;
      Follow.find = originalFollowFind;
      Follow.countDocuments = originalFollowCount;
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
