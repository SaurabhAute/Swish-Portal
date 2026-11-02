const assert = require('assert');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Follow = require('../models/Follow');
const User = require('../models/User');

const { toggleLike, getFeed, getUserPosts } = require('../controllers/postController');
const { addComment, getComments, deleteComment } = require('../controllers/commentController');
const { followUser, unfollowUser, getFollowers, getFollowing } = require('../controllers/followController');
const { getUserProfile, getUserById } = require('../controllers/userController');

async function runE2EWalkthrough() {
  console.log('====================================================');
  console.log('🚶 Running End-to-End Walkthrough (2 Users)');
  console.log('====================================================\n');

  // Simulated Database State in Memory
  const userAlice = {
    _id: new mongoose.Types.ObjectId(),
    email: 'alice@campus.edu',
    role: 'user',
    profile: { firstName: 'Alice', lastName: 'Walker', avatar: 'https://avatar/alice.jpg' },
    toJSON() { return { _id: this._id, email: this.email, role: this.role, profile: { ...this.profile } }; },
  };

  const userBob = {
    _id: new mongoose.Types.ObjectId(),
    email: 'bob@campus.edu',
    role: 'user',
    profile: { firstName: 'Bob', lastName: 'Builder', avatar: 'https://avatar/bob.jpg' },
    toJSON() { return { _id: this._id, email: this.email, role: this.role, profile: { ...this.profile } }; },
  };

  const postDoc = {
    _id: new mongoose.Types.ObjectId(),
    authorId: userAlice,
    imageUrl: 'https://cloudinary.com/swish/sample.jpg',
    imagePublicId: 'swish/sample',
    caption: 'Campus sunrise!',
    likes: [],
    commentCount: 0,
    isRemoved: false,
    createdAt: new Date('2026-11-01T08:00:00.000Z'),
  };

  const commentsDb = [];
  const followsDb = [];

  // Wire Mongoose mocks to simulated in-memory store
  User.findById = (id) => {
    const idStr = id.toString();
    const doc = idStr === userAlice._id.toString() ? userAlice : (idStr === userBob._id.toString() ? userBob : null);
    return {
      select: () => Promise.resolve(doc),
      then: (resolve) => Promise.resolve(doc).then(resolve),
    };
  };

  Post.findById = async (id) => {
    if (id.toString() === postDoc._id.toString() && !postDoc.isRemoved) return postDoc;
    return null;
  };

  Post.findOneAndUpdate = async (query, update) => {
    if (query._id.toString() === postDoc._id.toString()) {
      if (update.$addToSet && update.$addToSet.likes) {
        const uId = update.$addToSet.likes.toString();
        if (!postDoc.likes.some((x) => x.toString() === uId)) {
          postDoc.likes.push(update.$addToSet.likes);
        }
      }
      if (update.$pull && update.$pull.likes) {
        const uId = update.$pull.likes.toString();
        postDoc.likes = postDoc.likes.filter((x) => x.toString() !== uId);
      }
      if (update.$inc && update.$inc.commentCount) {
        postDoc.commentCount = Math.max(0, postDoc.commentCount + update.$inc.commentCount);
      }
      return postDoc;
    }
    return null;
  };

  Post.findByIdAndUpdate = async (id, update) => {
    return Post.findOneAndUpdate({ _id: id }, update);
  };

  Post.find = (query) => ({
    sort: () => ({
      limit: () => ({
        populate: () => Promise.resolve([postDoc]),
      }),
    }),
  });

  Comment.create = async (doc) => {
    const comment = {
      _id: new mongoose.Types.ObjectId(),
      postId: doc.postId,
      authorId: doc.authorId.toString() === userAlice._id.toString() ? userAlice : userBob,
      text: doc.text,
      isRemoved: false,
      createdAt: new Date(),
      populate: async function () { return this; },
    };
    commentsDb.push(comment);
    return comment;
  };

  Comment.findById = async (id) => {
    return commentsDb.find((c) => c._id.toString() === id.toString()) || null;
  };

  Comment.findByIdAndDelete = async (id) => {
    const idx = commentsDb.findIndex((c) => c._id.toString() === id.toString());
    if (idx !== -1) {
      const removed = commentsDb.splice(idx, 1)[0];
      return removed;
    }
    return null;
  };

  Comment.find = (query) => ({
    sort: () => ({
      limit: () => ({
        populate: () => {
          const filtered = commentsDb.filter((c) => c.postId.toString() === query.postId.toString() && !c.isRemoved);
          return Promise.resolve(filtered);
        },
      }),
    }),
  });

  Follow.create = async (doc) => {
    const existing = followsDb.find(
      (f) => f.followerId.toString() === doc.followerId.toString() && f.followingId.toString() === doc.followingId.toString()
    );
    if (existing) {
      const err = new Error('Duplicate key');
      err.code = 11000;
      throw err;
    }
    const record = {
      _id: new mongoose.Types.ObjectId(),
      followerId: doc.followerId,
      followingId: doc.followingId,
      createdAt: new Date(),
    };
    followsDb.push(record);
    return record;
  };

  Follow.findOneAndDelete = async (query) => {
    const idx = followsDb.findIndex(
      (f) => f.followerId.toString() === query.followerId.toString() && f.followingId.toString() === query.followingId.toString()
    );
    if (idx !== -1) {
      return followsDb.splice(idx, 1)[0];
    }
    return null;
  };

  Follow.findOne = async (query) => {
    return followsDb.find(
      (f) => f.followerId.toString() === query.followerId.toString() && f.followingId.toString() === query.followingId.toString()
    ) || null;
  };

  Follow.countDocuments = async (query) => {
    if (query.followingId) {
      return followsDb.filter((f) => f.followingId.toString() === query.followingId.toString()).length;
    }
    if (query.followerId) {
      return followsDb.filter((f) => f.followerId.toString() === query.followerId.toString()).length;
    }
    return 0;
  };

  Follow.find = (query) => ({
    sort: () => ({
      skip: () => ({
        limit: () => ({
          populate: () => {
            const matches = followsDb.filter((f) => {
              if (query.followingId) return f.followingId.toString() === query.followingId.toString();
              if (query.followerId) return f.followerId.toString() === query.followerId.toString();
              return true;
            });
            const populated = matches.map((m) => ({
              ...m,
              followerId: m.followerId.toString() === userAlice._id.toString() ? userAlice : userBob,
              followingId: m.followingId.toString() === userAlice._id.toString() ? userAlice : userBob,
            }));
            return Promise.resolve(populated);
          },
        }),
      }),
    }),
  });

  // Helper response mock
  function createRes() {
    let resCode = 200;
    let resBody = null;
    return {
      status(code) { resCode = code; return this; },
      json(data) { resBody = data; return this; },
      get code() { return resCode; },
      get body() { return resBody; },
    };
  }

  // --- Step 1: Feed check ---
  console.log('1. Checking initial feed from Bob\'s perspective...');
  let res = createRes();
  await getFeed({ query: {}, user: { _id: userBob._id, id: userBob._id.toString() } }, res);
  assert.strictEqual(res.body.posts[0].likeCount, 0);
  assert.strictEqual(res.body.posts[0].likedByMe, false);
  assert.strictEqual(res.body.posts[0].commentCount, 0);
  console.log('   ✓ Post has 0 likes, 0 comments, likedByMe = false');

  // --- Step 2: AC-03 Likes ---
  console.log('2. Bob likes Alice\'s post (AC-03)...');
  res = createRes();
  await toggleLike({ params: { id: postDoc._id.toString() }, user: { _id: userBob._id, id: userBob._id.toString() } }, res);
  assert.strictEqual(res.code, 200);
  assert.strictEqual(res.body.liked, true);
  assert.strictEqual(res.body.likeCount, 1);
  console.log('   ✓ Bob liked the post, likeCount = 1, liked = true');

  // Verify feed reflects like for Bob and not Alice
  res = createRes();
  await getFeed({ query: {}, user: { _id: userBob._id, id: userBob._id.toString() } }, res);
  assert.strictEqual(res.body.posts[0].likeCount, 1);
  assert.strictEqual(res.body.posts[0].likedByMe, true);

  res = createRes();
  await getFeed({ query: {}, user: { _id: userAlice._id, id: userAlice._id.toString() } }, res);
  assert.strictEqual(res.body.posts[0].likeCount, 1);
  assert.strictEqual(res.body.posts[0].likedByMe, false);
  console.log('   ✓ Feed displays 1 like; likedByMe=true for Bob, false for Alice');

  // --- Step 3: AC-04 Comments ---
  console.log('3. Bob comments on Alice\'s post (AC-04)...');
  res = createRes();
  await addComment({
    params: { postId: postDoc._id.toString() },
    body: { text: 'Beautiful campus view!' },
    user: { _id: userBob._id, id: userBob._id.toString() },
  }, res);
  assert.strictEqual(res.code, 201);
  assert.strictEqual(res.body.comment.text, 'Beautiful campus view!');
  assert.strictEqual(res.body.comment.author.name, 'Bob Builder');
  const bobCommentId = res.body.comment._id;

  // Alice comments back
  res = createRes();
  await addComment({
    params: { postId: postDoc._id.toString() },
    body: { text: 'Thanks Bob!' },
    user: { _id: userAlice._id, id: userAlice._id.toString() },
  }, res);
  assert.strictEqual(res.code, 201);
  assert.strictEqual(postDoc.commentCount, 2);
  console.log('   ✓ 2 comments stored, post.commentCount = 2');

  // Get comments list (oldest first)
  res = createRes();
  await getComments({
    params: { postId: postDoc._id.toString() },
    query: {},
    user: { _id: userBob._id },
  }, res);
  assert.strictEqual(res.body.comments.length, 2);
  assert.strictEqual(res.body.comments[0].text, 'Beautiful campus view!');
  assert.strictEqual(res.body.comments[1].text, 'Thanks Bob!');
  console.log('   ✓ Comments retrieved oldest first with author summaries');

  // Alice attempts to delete Bob's comment -> 403
  res = createRes();
  await deleteComment({
    params: { id: bobCommentId.toString() },
    user: { _id: userAlice._id, id: userAlice._id.toString() },
  }, res);
  assert.strictEqual(res.code, 403);
  console.log('   ✓ Cross-user comment deletion rejected with 403 Forbidden');

  // Bob deletes his own comment -> 200, count decrements
  res = createRes();
  await deleteComment({
    params: { id: bobCommentId.toString() },
    user: { _id: userBob._id, id: userBob._id.toString() },
  }, res);
  assert.strictEqual(res.code, 200);
  assert.strictEqual(postDoc.commentCount, 1);
  console.log('   ✓ Author comment deletion succeeded, post.commentCount decremented to 1');

  // --- Step 4: AC-05 Follow System ---
  console.log('4. Bob follows Alice (AC-05)...');
  res = createRes();
  await followUser({
    params: { id: userAlice._id.toString() },
    user: { _id: userBob._id, id: userBob._id.toString() },
  }, res);
  assert.strictEqual(res.code, 200);
  assert.strictEqual(res.body.isFollowing, true);
  assert.strictEqual(res.body.followersCount, 1);

  // Bob views Alice's profile
  res = createRes();
  await getUserById({
    params: { id: userAlice._id.toString() },
    user: { _id: userBob._id, id: userBob._id.toString() },
  }, res);
  assert.strictEqual(res.body.user.followersCount, 1);
  assert.strictEqual(res.body.user.isFollowing, true);

  // Bob views own profile
  res = createRes();
  await getUserProfile({
    user: { _id: userBob._id, id: userBob._id.toString() },
  }, res);
  assert.strictEqual(res.body.user.followingCount, 1);
  assert.strictEqual(res.body.user.followersCount, 0);

  // Alice views own profile
  res = createRes();
  await getUserProfile({
    user: { _id: userAlice._id, id: userAlice._id.toString() },
  }, res);
  assert.strictEqual(res.body.user.followersCount, 1);
  assert.strictEqual(res.body.user.followingCount, 0);
  console.log('   ✓ AC-05 verified: Alice followersCount=1, Bob followingCount=1, isFollowing=true');

  // Alice checks her followers list
  res = createRes();
  await getFollowers({
    params: { id: userAlice._id.toString() },
    query: {},
    user: { _id: userAlice._id },
  }, res);
  assert.strictEqual(res.body.users.length, 1);
  assert.strictEqual(res.body.users[0].name, 'Bob Builder');
  assert.strictEqual(res.body.users[0].email, undefined, 'No email leaked');
  console.log('   ✓ Alice\'s followers list contains Bob without sensitive fields');

  // Bob unfollows Alice
  res = createRes();
  await unfollowUser({
    params: { id: userAlice._id.toString() },
    user: { _id: userBob._id, id: userBob._id.toString() },
  }, res);
  assert.strictEqual(res.code, 200);
  assert.strictEqual(res.body.isFollowing, false);
  assert.strictEqual(res.body.followersCount, 0);

  res = createRes();
  await getUserById({
    params: { id: userAlice._id.toString() },
    user: { _id: userBob._id, id: userBob._id.toString() },
  }, res);
  assert.strictEqual(res.body.user.followersCount, 0);
  assert.strictEqual(res.body.user.isFollowing, false);
  console.log('   ✓ Unfollow verified: Alice followersCount=0, isFollowing=false');

  console.log('\n🎉 ALL ACCEPTANCE CRITERIA (AC-03, AC-04, AC-05) PASSED END-TO-END!\n');
}

runE2EWalkthrough();
