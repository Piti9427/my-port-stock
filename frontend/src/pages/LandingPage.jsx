import React from 'react';
import { SignInButton } from '@clerk/react';
import { Bot, Crosshair, ShieldAlert } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="landing-container">
      {/* Minimal Top Bar */}
      <header className="landing-header">
        <div className="brand">
          <span className="brand-dot"></span>
          <span className="brand-text">MyPortStock Terminal</span>
        </div>
        <SignInButton mode="modal">
          <button className="btn-secondary" style={{ width: 'auto', padding: '6px 16px', marginTop: 0 }}>
            Sign In
          </button>
        </SignInButton>
      </header>

      {/* Hero Section */}
      <main className="landing-main">
        <div className="hero-content">
          <div className="hero-badge">AI-Powered Quantitative Trading</div>
          <h1 className="hero-title">
            Quantitative Precision <br /> for Your Portfolio.
          </h1>
          <p className="hero-subtitle">
            A personal AI trading assistant providing real-time quantitative screening, risk management, and decision snapshots based on strict
            algorithmic rules.
          </p>

          <div className="hero-cta">
            <SignInButton mode="modal">
              <button className="btn-primary hero-btn" style={{ width: 'auto' }}>
                Enter Terminal
              </button>
            </SignInButton>
          </div>

          <div className="hero-features">
            <div className="feature">
              <Bot size={18} className="feature-icon" />
              <span>Multi-Agent Analysis</span>
            </div>
            <div className="feature">
              <ShieldAlert size={18} className="feature-icon" />
              <span>Strict Risk Control</span>
            </div>
            <div className="feature">
              <Crosshair size={18} className="feature-icon" />
              <span>Market Signals</span>
            </div>
          </div>
        </div>
      </main>

      {/* Background decoration to match Linear/Vercel vibe */}
      <div className="landing-glow-1"></div>
      <div className="landing-glow-2"></div>
    </div>
  );
}
