import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../services/api';
import { Anchor, Mail, Lock, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Extract email query param if passed from forgot password page
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !resetCode || !newPassword) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post('/auth/reset-password', {
        email,
        resetCode,
        newPassword
      });

      if (res.data.success) {
        setSuccessMsg('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        setErrorMsg(res.data.message || 'Reset failed.');
        setLoading(false);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error executing request.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/20 mb-4">
          <Anchor className="h-6 w-6 stroke-[2.5]" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Reset Password
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Enter the verification code to configure a new password
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow-xl border border-slate-100 dark:border-slate-700/50 sm:rounded-2xl sm:px-10 transition-all duration-200">
          
          {/* ALERT NOTIFICATIONS */}
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-550/10 border border-red-500/20 text-red-650 dark:text-red-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-xs flex items-start gap-2.5">
              <svg className="h-4.5 w-4.5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* EMAIL */}
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

            {/* RESET CODE */}
            <div>
              <label htmlFor="code" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Verification Code
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <input
                  id="code"
                  type="text"
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  disabled={loading}
                  className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none text-slate-900 dark:text-white transition-all disabled:opacity-50"
                  placeholder="RESET-XXXXXX"
                />
              </div>
            </div>

            {/* NEW PASSWORD */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none text-slate-900 dark:text-white transition-all disabled:opacity-50"
                  placeholder="Enter new password"
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
                  'Reset Password'
                )}
              </button>
            </div>
          </form>

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

export default ResetPassword;
