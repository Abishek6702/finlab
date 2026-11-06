import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AuthLayout from '../components/auth/AuthLayout';
import { PasswordInput, AuthButton } from '../components/auth/AuthFormComponents';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9003/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // API function directly in ResetPasswordPage
  const submitPasswordReset = async (payload) => {
    const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, payload, {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  };

  const validate = () => {
    const newErrors = {};
    const passwordPolicyRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

    if (!password) {
      newErrors.password = 'New password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!passwordPolicyRegex.test(password)) {
      newErrors.password = 'Must contain uppercase, lowercase letter, and a number';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm your new password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setServerError('Reset token is missing from the URL. Please request a new link.');
      return;
    }

    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    setServerError('');

    try {
      await submitPasswordReset({
        token,
        newPassword: password,
      });
      setIsSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to reset password. The link may have expired.';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout heading="Invalid Request" subheading="Password reset token missing.">
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs font-medium text-amber-700 dark:text-amber-400">
            This password reset link is invalid or has expired.
          </div>
          <Link
            to="/forgot-password"
            className="flex w-full items-center justify-center rounded-xl bg-blue-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
          >
            Request New Reset Link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      heading="Set new password"
      subheading="Please enter your new secure password below."
    >
      {isSuccess ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">Password Updated</p>
            <p className="mt-1">Your password has been reset successfully. All other active sessions were signed out.</p>
          </div>
          <Link
            to="/login"
            className="flex w-full items-center justify-center rounded-xl bg-blue-700 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800"
          >
            Sign In with New Password
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {serverError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400">
              {serverError}
            </div>
          )}

          <PasswordInput
            id="newPassword"
            name="newPassword"
            label="New Password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
            }}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword((prev) => !prev)}
            error={errors.password}
            required
          />

          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm New Password"
            placeholder="Repeat new password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
            }}
            showPassword={showConfirmPassword}
            onTogglePassword={() => setShowConfirmPassword((prev) => !prev)}
            error={errors.confirmPassword}
            required
          />

          <div className="pt-2">
            <AuthButton isLoading={isSubmitting}>
              Reset Password
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
