import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Anchor, Mail, ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  

  const GENERIC_MSG = 'If this email belongs to a registered user, we have sent a password recovery code to it.';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      // Fire-and-forget — we never reveal whether the email exists
      await api.post('/auth/forgot-password', { email });
    } catch (_) {
      // Intentionally swallowed — always show the same message
    } finally {
      setLoading(false);
      setSubmitted(true); // Always show success
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/20 mb-4">
          <Anchor className="h-6 w-6 stroke-[2.5]" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Forgot Password?
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          We will generate a code to reset your password
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow-xl border border-slate-100 dark:border-slate-700/50 sm:rounded-2xl sm:px-10 transition-all duration-200">
          
          {submitted ? (
            /* SUCCESS STATE — always shown after submit, regardless of email validity */
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <svg className="h-7 w-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Check Your Email</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{GENERIC_MSG}</p>
              <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">Didn't receive it? Check your spam folder or try again.</p>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* EMAIL ADDRESS */}
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Mail className="h-4.5 w-4.5" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none text-slate-900 dark:text-white transition-all disabled:opacity-50"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-brand-500 hover:bg-brand-655 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Send Recovery Email'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* BACK TO LOGIN */}
          <div className="mt-6 text-center border-t border-slate-100 dark:border-slate-750 pt-5">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-500 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
