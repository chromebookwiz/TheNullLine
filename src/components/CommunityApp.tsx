"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

// ── Replace this with your actual Monero donation address ──────────────────────
const XMR_ADDRESS = '44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGv7SqSsaBYBb98uNbr2VBBEt7f2wfn3RVGQBEP3A';
// ────────────────────────────────────────────────────────────────────────────────

type Tab = 'leaderboard' | 'register' | 'login' | 'donate';

interface LeaderEntry {
  rank?: number;
  username: string;
  totalXmr: number;
  lastDate: string;
}

export default function CommunityApp() {
  const [tab, setTab] = useState<Tab>('leaderboard');
  const [token, setToken] = useState<string | null>(null);
  const [loggedInAs, setLoggedInAs] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);
  const [lbError, setLbError] = useState('');

  // Register form
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regMsg, setRegMsg] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Login form
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginMsg, setLoginMsg] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Donate form
  const [donTxId, setDonTxId] = useState('');
  const [donAmount, setDonAmount] = useState('');
  const [donNote, setDonNote] = useState('');
  const [donMsg, setDonMsg] = useState('');
  const [donLoading, setDonLoading] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    setLbLoading(true);
    setLbError('');
    try {
      const res = await fetch('/api/donations/leaderboard');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load.');
      setLeaderboard((data.leaderboard ?? []).map((e: LeaderEntry, i: number) => ({ ...e, rank: i + 1 })));
    } catch (e: unknown) {
      setLbError(e instanceof Error ? e.message : 'Network error.');
    } finally {
      setLbLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'leaderboard') fetchLeaderboard();
  }, [tab, fetchLeaderboard]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegLoading(true);
    setRegMsg('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: regUsername, email: regEmail, password: regPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Registration failed.');
      setRegMsg(`✓ Registered as ${data.username}. You can now log in.`);
      setRegUsername(''); setRegEmail(''); setRegPassword('');
    } catch (e: unknown) {
      setRegMsg(e instanceof Error ? e.message : 'Network error.');
    } finally {
      setRegLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginMsg('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Login failed.');
      setToken(data.token);
      setLoggedInAs(data.username);
      setLoginMsg('');
      setTab('donate');
    } catch (e: unknown) {
      setLoginMsg(e instanceof Error ? e.message : 'Network error.');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleDonate(e: React.FormEvent) {
    e.preventDefault();
    setDonLoading(true);
    setDonMsg('');
    try {
      const res = await fetch('/api/donations/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ txId: donTxId, xmrAmount: parseFloat(donAmount), note: donNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Submission failed.');
      setDonMsg('✓ Donation recorded. Thank you for supporting The Null Line.');
      setDonTxId(''); setDonAmount(''); setDonNote('');
    } catch (e: unknown) {
      setDonMsg(e instanceof Error ? e.message : 'Network error.');
    } finally {
      setDonLoading(false);
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'leaderboard', label: 'LEADERBOARD' },
    { id: 'register', label: 'REGISTER' },
    { id: 'login', label: loggedInAs ? `✓ ${loggedInAs.toUpperCase()}` : 'LOGIN' },
    { id: 'donate', label: 'DONATE XMR' },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-white font-mono select-none overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-black text-white shrink-0">
        <div className="text-[10px] tracking-[0.3em] font-bold uppercase">◊.COMMUNITY</div>
        <div className="text-[8px] text-white/30 mt-1 uppercase tracking-widest">Fund The Null Line · Monero Donation Leaderboard</div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-black/10 shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-[8px] tracking-[0.25em] uppercase font-bold border-r border-black/5 last:border-0 transition-all ${tab === t.id ? 'bg-black text-white' : 'text-black/40 hover:text-black'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* ── Leaderboard ──────────────────────────────────────────────── */}
        {tab === 'leaderboard' && (
          <div className="p-5 space-y-3">
            <div className="flex justify-between items-center">
              <div className="text-[9px] tracking-[0.3em] text-black/30 uppercase font-bold">Top Donors</div>
              <button
                onClick={fetchLeaderboard}
                className="text-[8px] tracking-[0.2em] uppercase text-black/30 hover:text-black transition-all"
              >↺ Refresh</button>
            </div>
            {lbLoading && <div className="text-[9px] text-black/30 uppercase tracking-widest py-8 text-center">Loading...</div>}
            {lbError && <div className="text-[9px] text-red-400 uppercase tracking-widest py-4 text-center">{lbError}</div>}
            {!lbLoading && !lbError && leaderboard.length === 0 && (
              <div className="text-[9px] text-black/20 uppercase tracking-widest py-8 text-center">No donations yet. Be the first.</div>
            )}
            {leaderboard.map((entry, i) => (
              <motion.div
                key={entry.username}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 py-2.5 border-b border-black/5 last:border-0"
              >
                <div className="w-6 text-[9px] font-bold text-black/30 text-right shrink-0">
                  {i === 0 ? '◊' : i === 1 ? '·' : `${i + 1}`}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold uppercase truncate">{entry.username}</div>
                  <div className="text-[8px] text-black/30 uppercase">{new Date(entry.lastDate).toLocaleDateString()}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-bold">{entry.totalXmr.toFixed(4)}</div>
                  <div className="text-[8px] text-black/30 uppercase">XMR</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Register ──────────────────────────────────────────────────── */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="p-5 space-y-4">
            <div className="text-[9px] tracking-[0.3em] text-black/30 uppercase font-bold mb-1">Create Account</div>
            <Field label="Username" value={regUsername} onChange={setRegUsername} placeholder="null_user" maxLength={30} />
            <Field label="Email" type="email" value={regEmail} onChange={setRegEmail} placeholder="you@example.com" maxLength={120} />
            <Field label="Password" type="password" value={regPassword} onChange={setRegPassword} placeholder="min 8 characters" maxLength={128} />
            <SubmitButton loading={regLoading} label="CREATE ACCOUNT" />
            {regMsg && (
              <div className={`text-[9px] uppercase tracking-wide ${regMsg.startsWith('✓') ? 'text-black/60' : 'text-red-400'}`}>
                {regMsg}
              </div>
            )}
          </form>
        )}

        {/* ── Login ─────────────────────────────────────────────────────── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="p-5 space-y-4">
            <div className="text-[9px] tracking-[0.3em] text-black/30 uppercase font-bold mb-1">
              {loggedInAs ? `Logged in as ${loggedInAs}` : 'Sign In'}
            </div>
            {loggedInAs ? (
              <div className="space-y-2">
                <div className="text-[9px] text-black/50 uppercase">You are currently logged in.</div>
                <button
                  type="button"
                  onClick={() => { setToken(null); setLoggedInAs(null); }}
                  className="w-full py-3 border border-black/10 text-black/40 text-[9px] tracking-[0.3em] uppercase hover:border-black/40 hover:text-black transition-all"
                >Sign Out</button>
              </div>
            ) : (
              <>
                <Field label="Username" value={loginUsername} onChange={setLoginUsername} placeholder="null_user" />
                <Field label="Password" type="password" value={loginPassword} onChange={setLoginPassword} placeholder="password" />
                <SubmitButton loading={loginLoading} label="SIGN IN" />
                {loginMsg && <div className="text-[9px] text-red-400 uppercase tracking-wide">{loginMsg}</div>}
              </>
            )}
          </form>
        )}

        {/* ── Donate ────────────────────────────────────────────────────── */}
        {tab === 'donate' && (
          <div className="p-5 space-y-5">
            {/* XMR Address */}
            <div>
              <div className="text-[9px] tracking-[0.3em] text-black/30 uppercase font-bold mb-2">Monero Address</div>
              <div className="bg-black/[0.03] border border-black/5 rounded p-3">
                <div className="text-[8px] font-mono text-black/70 break-all leading-relaxed select-all">{XMR_ADDRESS}</div>
              </div>
              <div className="text-[8px] text-black/20 mt-1.5 uppercase tracking-wide">Send XMR to the address above, then record your transaction below.</div>
            </div>

            {/* Donation form */}
            {!loggedInAs ? (
              <div className="py-4 text-center space-y-2">
                <div className="text-[9px] text-black/40 uppercase">Please log in to record your donation.</div>
                <button
                  onClick={() => setTab('login')}
                  className="px-5 py-2 border border-black text-[9px] tracking-[0.3em] uppercase font-bold hover:bg-black hover:text-white transition-all"
                >→ LOGIN</button>
              </div>
            ) : (
              <form onSubmit={handleDonate} className="space-y-4">
                <div className="text-[9px] tracking-[0.3em] text-black/30 uppercase font-bold">Record Donation ({loggedInAs})</div>
                <Field label="Transaction ID" value={donTxId} onChange={setDonTxId} placeholder="Monero tx hash" maxLength={200} />
                <Field label="Amount (XMR)" type="number" value={donAmount} onChange={setDonAmount} placeholder="e.g. 0.5" />
                <Field label="Note (optional)" value={donNote} onChange={setDonNote} placeholder="keep building" maxLength={280} />
                <SubmitButton loading={donLoading} label="RECORD DONATION" />
                {donMsg && (
                  <div className={`text-[9px] uppercase tracking-wide ${donMsg.startsWith('✓') ? 'text-black/60' : 'text-red-400'}`}>
                    {donMsg}
                  </div>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function Field({
  label, value, onChange, type = 'text', placeholder = '', maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <div className="text-[8px] tracking-[0.25em] uppercase text-black/30 mb-1">{label}</div>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        required
        onChange={e => onChange(e.target.value)}
        className="w-full border border-black/10 px-3 py-2 text-[10px] font-mono bg-white focus:border-black outline-none transition-all"
      />
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 border border-black bg-black text-white font-bold text-[10px] tracking-[0.3em] uppercase hover:bg-white hover:text-black disabled:opacity-40 transition-all"
    >
      {loading ? '...' : label}
    </button>
  );
}
