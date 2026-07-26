import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
    }

    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Theme Toggle (top right) */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-sky-500/5 blur-3xl" />
      </div>

      <div className="glass-card relative w-full max-w-md p-8 shadow-2xl animate-fade-in-up">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 text-lg font-bold text-white shadow-lg shadow-emerald-500/20">
            IP
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Welcome back</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Sign in to your IPM ERP account
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-5 animate-fade-in-up rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            <span className="mr-2">⚠</span>
            {error}
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
            >
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full py-3 text-base"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : null}
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-600">
          Contact your administrator to get an account.
        </p>
      </div>
    </div>
  );
}
