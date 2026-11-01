import React, { useState } from 'react';

const SwishLogo = () => {
  const [liked1, setLiked1] = useState(false);
  const [liked2, setLiked2] = useState(false);
  const [likes1, setLikes1] = useState(128);
  const [likes2, setLikes2] = useState(54);

  return (
    <div className="auth-brand">
      {/* Glow blobs */}
      <div className="brand-glow-1"></div>
      <div className="brand-glow-2"></div>

      {/* Top logo */}
      <div className="brand-header">
        <div className="brand-logo">SWISH</div>
        <div className="brand-tagline">Connect. Create. Share.</div>
      </div>

      {/* Interactive floating social cards */}
      <div className="social-visual">
        <div className="social-cards-container">
          {/* Card 1 — Post */}
          <div className="social-card social-card-1">
            <div className="sc-user">
              <div className="sc-avatar sc-avatar-1">AR</div>
              <div>
                <div className="sc-name">Arya Mehta</div>
                <div className="sc-handle">@arya_creates</div>
              </div>
            </div>
            <div className="sc-text">Just shipped the new dashboard design ✨ Feels good to build something beautiful!</div>
            <div className="sc-actions">
              <button
                className={`sc-action ${liked1 ? 'liked' : ''}`}
                onClick={() => { setLiked1(!liked1); setLikes1(liked1 ? likes1 - 1 : likes1 + 1); }}
              >
                {liked1 ? '❤️' : '🤍'} {likes1}
              </button>
              <button className="sc-action">💬 24</button>
              <span className="sc-stat">2m ago</span>
            </div>
          </div>

          {/* Card 2 — Trending */}
          <div className="social-card social-card-2">
            <div className="sc-trending">
              <div className="sc-sparkle-dot"></div>
              Trending
            </div>
            <div className="sc-user">
              <div className="sc-avatar sc-avatar-2">KS</div>
              <div>
                <div className="sc-name">Kai Shah</div>
                <div className="sc-handle">@kai.dev</div>
              </div>
            </div>
            <div className="sc-text">The community here is incredible 🚀</div>
            <div className="sc-actions">
              <button
                className={`sc-action ${liked2 ? 'liked' : ''}`}
                onClick={() => { setLiked2(!liked2); setLikes2(liked2 ? likes2 - 1 : likes2 + 1); }}
              >
                {liked2 ? '❤️' : '🤍'} {likes2}
              </button>
              <button className="sc-action">💬 12</button>
              <span className="sc-stat">15m ago</span>
            </div>
          </div>

          {/* Card 3 — Notification-style */}
          <div className="social-card social-card-3">
            <div className="sc-user">
              <div className="sc-avatar sc-avatar-3">PR</div>
              <div>
                <div className="sc-name">Priya Roy</div>
                <div className="sc-handle">@priya.stories</div>
              </div>
            </div>
            <div className="sc-text">Started following you and 3 others. Your profile is 🔥</div>
            <div className="sc-actions">
              <button className="sc-action">👋 Follow back</button>
              <span className="sc-stat">1h ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom stats */}
      <div className="brand-stats">
        <div>
          <div className="brand-stat-num">12K+</div>
          <div className="brand-stat-label">Creators</div>
        </div>
        <div>
          <div className="brand-stat-num">48K+</div>
          <div className="brand-stat-label">Posts shared</div>
        </div>
        <div>
          <div className="brand-stat-num">150+</div>
          <div className="brand-stat-label">Communities</div>
        </div>
      </div>
    </div>
  );
};

export default SwishLogo;
