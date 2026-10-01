import React, { useState } from 'react';
import { useLms } from '../../context/LmsContext';
import {
  GraduationCap,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  UserCheck,
  Building,
  KeyRound,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useLms();

  const [activePortal, setActivePortal] = useState<'student' | 'teacher' | 'admin'>('student');
  const [email, setEmail] = useState('2021-cs-29@nicore.edu.pk');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Switch demo persona credentials when clicking portals
  const handleSelectPortal = (portal: 'student' | 'teacher' | 'admin') => {
    setActivePortal(portal);
    setError(null);
    if (portal === 'student') {
      setEmail('2021-cs-29@nicore.edu.pk');
      setPassword('password123');
    } else if (portal === 'teacher') {
      setEmail('s.jenkins@unicore.edu');
      setPassword('password123');
    } else {
      setEmail('registrar@nicore.edu.pk');
      setPassword('password123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await login(email, password);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Authentication failed. Please verify credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Subtle Geometric Grid & Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />

      {/* University Branding Header with 3D Hover Tilt */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 animate-fade-in-up">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-700 text-white shadow-xl shadow-indigo-500/25 mb-3 border border-indigo-400/30 hover:scale-110 hover:rotate-3 transition-all duration-300 cursor-pointer group">
          <GraduationCap className="w-8 h-8 group-hover:scale-110 transition-transform duration-200" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
          UNICORE UNIVERSITY
        </h2>
        <p className="mt-1 text-xs text-slate-400 font-medium tracking-wider uppercase">
          Academic Management & Learning Portal
        </p>
      </div>

      {/* Login Card with Glassmorphism and Lift */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden hover:border-slate-600/80 transition-all duration-200 animate-scale-in">
          {/* Portal Switcher Buttons */}
          <div className="grid grid-cols-3 border-b border-slate-700/80 bg-slate-900/60 p-1.5 gap-1 text-xs">
            <button
              type="button"
              onClick={() => handleSelectPortal('student')}
              className={`py-2 px-3 rounded-lg font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                activePortal === 'student'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 active:scale-95'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectPortal('teacher')}
              className={`py-2 px-3 rounded-lg font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                activePortal === 'teacher'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 active:scale-95'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Faculty</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectPortal('admin')}
              className={`py-2 px-3 rounded-lg font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                activePortal === 'admin'
                  ? 'bg-slate-700 text-white shadow-md shadow-slate-700/30 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 active:scale-95'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            {/* Quick Demo Credentials Autofill Banner */}
            <div className="p-3 bg-slate-900/70 border border-slate-700/70 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Demo Account:</span>
                </span>
                <span className="font-mono text-indigo-400 font-medium">Default: password123</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActivePortal('student');
                    setEmail('alex.j@student.unicore.edu');
                    setPassword('password123');
                  }}
                  className="px-2 py-1 bg-slate-800 hover:bg-indigo-900/50 text-slate-300 hover:text-indigo-200 border border-slate-700 hover:border-indigo-500 rounded text-[11px] font-mono transition-all duration-150 active:scale-95 cursor-pointer"
                >
                  Alex (CS Sem 5)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActivePortal('teacher');
                    setEmail('s.jenkins@unicore.edu');
                    setPassword('password123');
                  }}
                  className="px-2 py-1 bg-slate-800 hover:bg-blue-900/50 text-slate-300 hover:text-blue-200 border border-slate-700 hover:border-blue-500 rounded text-[11px] font-mono transition-all duration-150 active:scale-95 cursor-pointer"
                >
                  Prof. Jenkins
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActivePortal('admin');
                    setEmail('registrar@unicore.edu');
                    setPassword('password123');
                  }}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded text-[11px] font-mono transition-all duration-150 active:scale-95 cursor-pointer"
                >
                  Dean Vance (Admin)
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-start gap-2 animate-scale-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  University Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@unicore.edu"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In to Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Footer note */}
          <div className="px-6 py-3.5 bg-slate-900/60 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>MongoDB Atlas Secure Storage</span>
            </span>
            <span className="text-slate-400">UniCore v2.4</span>
          </div>
        </div>
      </div>
    </div>
  );
};
