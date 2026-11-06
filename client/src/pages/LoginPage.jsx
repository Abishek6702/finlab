import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import AuthLayout from '../components/auth/AuthLayout';
import { AuthInput, PasswordInput, AuthButton, AuthDivider } from '../components/auth/AuthFormComponents';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9003/api';

export default function LoginPage() {
  const { setAuthSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destination = location.state?.from?.pathname || '/dashboard';

  // API function directly in LoginPage
  const loginUser = async (credentials) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials, {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  };

  // Google Login API function directly in LoginPage
  const googleLoginUser = async (idToken) => {
    const response = await axios.post(`${API_BASE_URL}/auth/google`, { idToken }, {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  };

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    setServerError('');

    try {
      const res = await loginUser({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      const token = res?.data?.accessToken;
      const user = res?.data?.user;

      if (token && user) {
        setAuthSession(token, user);
      }

      navigate(destination, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unable to sign in. Please verify your credentials.';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (idToken) => {
    setIsSubmitting(true);
    setServerError('');
    try {
      const res = await googleLoginUser(idToken);
      const token = res?.data?.accessToken;
      const user = res?.data?.user;

      if (token && user) {
        setAuthSession(token, user);
      }

      navigate(destination, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Google authentication failed.';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      heading="Welcome back"
      subheading="Take control of your finances, one step at a time."
    >
      {serverError && (
        <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs font-medium text-red-600 dark:text-red-400">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthInput
          id="email"
          name="email"
          type="email"
          label="Email Address"
          placeholder="you@example.com"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          required
        />

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Password <span className="text-red-500">*</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword((prev) => !prev)}
            error={errors.password}
          />
        </div>

        <div className="pt-1">
          <AuthButton isLoading={isSubmitting}>
            Sign In to FinLab
          </AuthButton>
        </div>
      </form>

      <AuthDivider text="OR" />

      <GoogleSignInButton
        onCredentialSuccess={handleGoogleSuccess}
        onError={(err) => setServerError(err)}
        disabled={isSubmitting}
      />

      <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
        Don&apos;t have a FinLab account?{' '}
        <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">
          Create free account
        </Link>
      </p>
    </AuthLayout>
  );
}
