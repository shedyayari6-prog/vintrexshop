import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import OAuthButtons from "../components/OAuthButtons.jsx";
import Brand from "../components/Brand.jsx";

export default function AuthPage({ mode }) {
  const isSignup = mode === "signup";
  const { user, loading, signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  if (loading) {
    return (
      <div className="auth-wrap">
        <div className="auth-card" style={{ textAlign: "center", padding: "40px" }}>
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (password.length < 6) return setError("Password needs at least 6 characters.");
    setBusy(true);
    const { data, error } = isSignup ? await signUp(email, password) : await signIn(email, password);
    setBusy(false);
    if (error) return setError(error.message);
    if (isSignup && !data.session) {
      return setInfo("Check your email and click the confirmation link, then log in.");
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit}>
        <Brand />
        <h1>{isSignup ? "Open your store" : "Welcome back"}</h1>

        <OAuthButtons />

        <label>Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label>Password
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignup ? "new-password" : "current-password"} />
        </label>

        {error && <p className="msg msg-error" role="alert">{error}</p>}
        {info && <p className="msg msg-ok">{info}</p>}

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Please wait..." : isSignup ? "Create account" : "Log in"}
        </button>

        <p className="auth-switch">
          {isSignup ? <>Already have an account? <Link to="/login">Log in</Link></>
                    : <>New here? <Link to="/signup">Open your store</Link></>}
        </p>
      </form>
    </div>
  );
}