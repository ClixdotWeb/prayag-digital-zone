'use client';
import { demoLogin, login } from '@/lib/actions';

export default function Login() {
  return (
    <div className="page"><div className="card" style={{ maxWidth: 460, margin: '0 auto' }}>
      <h1>Sign in or register</h1><p className="muted">Prototype: any details work. In the live system this is OTP or password login.</p>
      <form id="loginForm" className="stack" onSubmit={(e) => { e.preventDefault(); login(Object.fromEntries(new FormData(e.currentTarget))); }}>
        <label className="field">Name<input name="name" required /></label>
        <label className="field">Email<input name="email" type="email" required /></label>
        <label className="field">Mobile<input name="phone" required /></label>
        <label className="check"><input type="checkbox" required /> I&apos;m not a robot (captcha placeholder)</label>
        <button className="btn-primary" type="submit">Continue</button>
        <button type="button" onClick={demoLogin}>Use demo customer</button>
      </form>
    </div></div>
  );
}
