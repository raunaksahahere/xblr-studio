import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Database, ShieldAlert, CheckCircle2, User, Key, Eye, EyeOff, Building } from 'lucide-react';

export default function Login() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationType, setOrganizationType] = useState('CA_FIRM'); // CA_FIRM, CS_FIRM, AUDIT_FIRM, COMPANY, CONSULTANCY, OTHER
  const [roleName, setRoleName] = useState('REVIEWER'); // REVIEWER, CLIENT, ADMIN, PREPARER

  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin 
      ? { email, password } 
      : { email, password, name, organizationName, organizationType, roleName };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      if (isLogin) {
        setAuth(data.user, data.accessToken, data.refreshToken);
      } else {
        setSuccess('Account and organization created successfully! Please log in.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Connection to server failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] radial-bg flex items-center justify-center p-4">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse-glow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1.5s' }}></div>

      <div className="w-full max-w-lg glass-panel rounded-2xl border border-slate-800/80 p-8 shadow-2xl relative overflow-hidden">
        
        {/* Decorative corner lines */}
        <div className="absolute top-0 left-0 w-24 h-1 bg-gradient-to-r from-blue-500 to-transparent"></div>
        <div className="absolute top-0 left-0 w-1 h-24 bg-gradient-to-b from-blue-500 to-transparent"></div>

        <div className="text-center mb-8">
          <div className="inline-flex bg-blue-500/10 border border-blue-500/20 w-14 h-14 rounded-2xl items-center justify-center mb-4 animate-float">
            <Database className="w-7 h-7 text-blue-400" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            {isLogin ? 'Welcome Back' : 'Get Started'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {isLogin 
              ? 'Sign in to access your MCA filing intelligence platform' 
              : 'Setup your auditor organization workspace'}
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-center space-x-2.5 p-3 rounded-lg bg-red-950/20 border border-red-500/30 text-red-300 text-xs">
            <ShieldAlert className="w-4.5 h-4.5 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-center space-x-2.5 p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. CA Prian Patel"
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Auditing Firm / Corporate Name</label>
                <input
                  type="text"
                  required
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="e.g. Patel & Associates LLP"
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Organization Type</label>
                  <select
                    value={organizationType}
                    onChange={(e) => setOrganizationType(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                  >
                    <option value="CA_FIRM">CA Firm</option>
                    <option value="CS_FIRM">CS Firm</option>
                    <option value="AUDIT_FIRM">Audit Firm</option>
                    <option value="COMPANY">Company</option>
                    <option value="CONSULTANCY">Consultancy</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Platform Role</label>
                  <select
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                  >
                    <option value="REVIEWER">Reviewer (Auditor/CS)</option>
                    <option value="PREPARER">Preparer (Associate)</option>
                    <option value="CLIENT">Client Portal Guest</option>
                    <option value="ADMIN">System Administrator</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@firm.com"
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Secure Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2.5 px-4 pr-10 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold py-3 rounded-xl transition duration-200 mt-6 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Organization Workspace'}
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSuccess(null);
            }}
            className="text-xs text-blue-400 hover:underline"
          >
            {isLogin 
              ? "Don't have a workspace? Create Organization" 
              : "Already have a workspace? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}
