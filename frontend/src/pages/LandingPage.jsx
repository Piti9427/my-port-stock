import { SignInButton } from '../auth/clerkAdapter';
import { Bot, Crosshair, ShieldAlert, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-hidden bg-[var(--bg-void)] text-[var(--text-primary)] font-sans selection:bg-emerald-500/30">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-[var(--brand-primary)] opacity-10 dark:opacity-20 blur-[100px]"></div>

      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 md:px-12 border-b border-[var(--border-subtle)] relative z-10 bg-[var(--bg-shell)]/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand-primary)]"></div>
          <span className="font-semibold tracking-tight text-[var(--text-primary)] text-lg">MyPortStock</span>
        </div>
        <SignInButton mode="modal">
          <button className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200">Sign In</button>
        </SignInButton>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 text-center">
        <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-out">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-xs font-semibold tracking-widest uppercase mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-pulse"></span>
            AI-Powered Quantitative Trading
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[var(--text-primary)] mb-6 leading-[1.1]">
            Quantitative Precision <br className="hidden md:block" /> for Your Portfolio.
          </h1>

          <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            A personal AI trading assistant providing real-time quantitative screening, risk management, and decision snapshots based on strict
            algorithmic rules.
          </p>

          <SignInButton mode="modal">
            <button className="group relative inline-flex items-center gap-2 bg-[var(--text-primary)] text-[var(--text-inverse)] px-8 py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
              Enter Terminal
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </SignInButton>

          {/* Features */}
          <div className="mt-20 flex flex-wrap justify-center gap-8 md:gap-16 border-t border-[var(--border-subtle)] pt-10">
            <div className="flex items-center gap-3 text-[var(--text-secondary)]">
              <div className="p-2 rounded-md bg-[var(--bg-panel-solid)] border border-[var(--border-subtle)]">
                <Bot size={20} className="text-[var(--text-primary)]" />
              </div>
              <span className="font-medium text-sm">Multi-Agent Analysis</span>
            </div>
            <div className="flex items-center gap-3 text-[var(--text-secondary)]">
              <div className="p-2 rounded-md bg-[var(--bg-panel-solid)] border border-[var(--border-subtle)]">
                <ShieldAlert size={20} className="text-[var(--text-primary)]" />
              </div>
              <span className="font-medium text-sm">Strict Risk Control</span>
            </div>
            <div className="flex items-center gap-3 text-[var(--text-secondary)]">
              <div className="p-2 rounded-md bg-[var(--bg-panel-solid)] border border-[var(--border-subtle)]">
                <Crosshair size={20} className="text-[var(--text-primary)]" />
              </div>
              <span className="font-medium text-sm">Market Signals</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
