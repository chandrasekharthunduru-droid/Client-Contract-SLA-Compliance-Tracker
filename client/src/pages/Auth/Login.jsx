import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Zap, Shield, TrendingUp, FileCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(email, password);
    if (result.success) {
      toast.success('Welcome back!');
      navigate(location.state?.from?.pathname || '/');
    } else {
      setError(result.message);
    }
  };


  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand */}
      <div className="hidden lg:flex flex-1 bg-navy-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-electric-500 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-electric-400 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-electric-500 rounded-xl flex items-center justify-center shadow-glow">
              <Zap size={22} className="text-white" />
            </div>
            <span className="font-bold text-white text-2xl tracking-tight">
              Brand<span className="text-electric-400">Spark</span><span className="text-electric-300">X</span>
            </span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Contract & SLA<br />
            <span className="text-electric-400">Compliance Tracker</span>
          </h1>
          <p className="text-white/60 text-lg leading-relaxed">
            Enterprise-grade contract management with automated SLA monitoring, breach tracking, and compliance analytics.
          </p>
        </div>

        <div className="relative space-y-4">
          {[
            { icon: FileCheck, title: '50+ Contract Templates', desc: 'Manage all contract types in one place' },
            { icon: Shield, title: 'SLA Compliance Monitoring', desc: 'Real-time tracking with automated alerts' },
            { icon: TrendingUp, title: 'Advanced Analytics', desc: 'Insights to drive better decisions' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 bg-electric-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon size={18} className="text-electric-400" />
              </div>
              <div>
                <div className="text-white text-sm font-semibold">{title}</div>
                <div className="text-white/50 text-xs">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-navy-900 rounded-xl flex items-center justify-center">
              <Zap size={18} className="text-electric-400" />
            </div>
            <span className="font-bold text-navy-900 text-xl">BrandSparkX</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-gray-400 text-sm">Sign in to your account to continue</p>
          </div>


          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@brandsparkx.com"
                className="form-input"
                required
              />
            </div>
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="form-input pr-10"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>



        </div>
      </div>
    </div>
  );
}
