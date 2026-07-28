import { SignInButton } from '../auth/clerkAdapter';
import { Bot, Crosshair, ShieldAlert, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background font-sans text-foreground selection:bg-brand-dim">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(var(--text-primary-rgb),0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(var(--text-primary-rgb),0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-brand opacity-10 blur-[100px]" />

      {/* Header */}
      <header className="relative z-10 flex h-16 items-center justify-between border-b border-border bg-shell px-6 md:px-12">
        <div className="flex items-center gap-3">
          <div className="size-2.5 rounded-full bg-brand" />
          <span className="text-lg font-semibold tracking-tight text-foreground">MyPortStock</span>
        </div>
        <SignInButton mode="modal">
          <button className="text-sm font-medium text-text-secondary transition-colors duration-200 hover:text-foreground">Sign In</button>
        </SignInButton>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-out">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-brand bg-brand-dim px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand">
            <span className="size-1.5 animate-pulse rounded-full bg-brand motion-reduce:animate-none" />
            AI-Powered Quantitative Trading
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-[1.1] tracking-tight text-foreground md:text-7xl">
            Quantitative Precision <br className="hidden md:block" /> for Your Portfolio.
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-text-secondary md:text-xl">
            A personal AI trading assistant providing real-time quantitative screening, risk management, and decision snapshots based on strict
            algorithmic rules.
          </p>

          <SignInButton mode="modal">
            <button className="group relative inline-flex items-center gap-2 rounded-lg bg-foreground px-8 py-4 text-lg font-semibold text-text-inverse transition-all duration-300 hover:scale-[1.02] hover:opacity-90 active:scale-[0.98] motion-reduce:transform-none">
              Enter Terminal
              <ArrowRight size={20} className="transition-transform group-hover:translate-x-1 motion-reduce:transform-none" />
            </button>
          </SignInButton>

          {/* Features */}
          <div className="mt-20 flex flex-wrap justify-center gap-8 border-t border-border pt-10 md:gap-16">
            <div className="flex items-center gap-3 text-text-secondary">
              <div className="rounded-md border border-border bg-panel-solid p-2">
                <Bot size={20} className="text-foreground" />
              </div>
              <span className="font-medium text-sm">Multi-Agent Analysis</span>
            </div>
            <div className="flex items-center gap-3 text-text-secondary">
              <div className="rounded-md border border-border bg-panel-solid p-2">
                <ShieldAlert size={20} className="text-foreground" />
              </div>
              <span className="font-medium text-sm">Strict Risk Control</span>
            </div>
            <div className="flex items-center gap-3 text-text-secondary">
              <div className="rounded-md border border-border bg-panel-solid p-2">
                <Crosshair size={20} className="text-foreground" />
              </div>
              <span className="font-medium text-sm">Market Signals</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
