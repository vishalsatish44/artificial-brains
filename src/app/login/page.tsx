'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!data.ok) {
      setError(data.error ?? 'Invalid credentials');
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--background)',
    }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 1.5rem' }}>

        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #fcd34d, #fb923c)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 800, color: '#7c2d12',
            marginBottom: '1rem',
          }}>
            SS
          </div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: 4 }}>
            Super Sheldon
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
            AI Demo Console — sign in to continue
          </p>
        </div>

        {/* Card */}
        <div className="card-lg" style={{ padding: '2rem' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                Email address
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  padding: '0.625rem 0.875rem',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 10,
                  fontSize: '0.875rem',
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#4f46e5'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  padding: '0.625rem 0.875rem',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 10,
                  fontSize: '0.875rem',
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#4f46e5'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'}
              />
            </div>

            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: '0.625rem 0.875rem',
                fontSize: '0.82rem',
                color: '#ef4444',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.9rem', marginTop: 4 }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '1.5rem' }}>
          Access is restricted to authorized users only.
        </p>
      </div>
    </div>
  );
}
