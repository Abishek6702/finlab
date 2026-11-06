import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import AuthLayout from '../components/auth/AuthLayout';
import { AuthInput, AuthButton } from '../components/auth/AuthFormComponents';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9003/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // API function directly in ForgotPasswordPage
  const requestForgotPassword = async (userEmail) => {
    const response = await axios.post(
      `${API_BASE_URL}/auth/forgot-password`,
      { email: userEmail },
      {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return response.data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      setError('Email address is required');
      return;
    }

    if (!emailRegex.test(email.trim())) {
      setError('Please provide a valid email address');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await requestForgotPassword(email.trim().toLowerCase());
      setSuccessMessage(
        res?.message || 'If an account exists with that email, a password reset link has been sent.'
      );
    } catch {
      // Security: always present generic message to prevent account enumeration
      setSuccessMessage('If an account exists with that email, a password reset link has been sent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      heading="Reset your password"
      subheading="Enter your email to receive recovery instructions."
    >
      {successMessage ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">Check your inbox</p>
            <p className="mt-1">{successMessage}</p>
          </div>
          <Link
            to="/login"
            className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Return to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <AuthInput
            id="email"
            name="email"
            type="email"
            label="Registered Email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            required
          />

          <div className="pt-2">
            <AuthButton isLoading={isSubmitting}>
              Send Reset Link
            </AuthButton>
          </div>

          <div className="pt-2 text-center">
            <Link
              to="/login"
              className="text-xs font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              &larr; Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
