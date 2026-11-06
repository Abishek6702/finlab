import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import AuthLayout from '../components/auth/AuthLayout';
import { AuthInput, PasswordInput, AuthButton, AuthDivider } from '../components/auth/AuthFormComponents';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9003/api';

export default function RegisterPage() {
  const { setAuthSession } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // API function directly in RegisterPage
  const registerUser = async (payload) => {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, payload, {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  };

  // Google Login API function directly in RegisterPage
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
    const passwordPolicyRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please provide a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!passwordPolicyRegex.test(formData.password)) {
      newErrors.password = 'Must contain uppercase, lowercase letter, and a number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      const res = await registerUser({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      const token = res?.data?.accessToken;
      const user = res?.data?.user;

      if (token && user) {
        setAuthSession(token, user);
      }

      navigate(user?.onboardingCompleted === false ? '/onboarding' : '/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed. Please try again.';
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

      navigate(user?.onboardingCompleted === false ? '/onboarding' : '/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Google signup failed.';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      heading="Create your free account"
      subheading="Start managing your money with clarity."
    >
      {serverError && (
        <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs font-medium text-red-600 dark:text-red-400">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AuthInput
            id="firstName"
            name="firstName"
            label="First Name"
            placeholder="John"
            autoComplete="given-name"
            value={formData.firstName}
            onChange={handleChange}
            error={errors.firstName}
            required
          />
          <AuthInput
            id="lastName"
            name="lastName"
            label="Last Name"
            placeholder="Doe"
            autoComplete="family-name"
            value={formData.lastName}
            onChange={handleChange}
            error={errors.lastName}
            required
          />
        </div>

        <AuthInput
          id="email"
          name="email"
          type="email"
          label="Email Address"
          placeholder="john@example.com"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          required
        />

        <PasswordInput
          id="password"
          name="password"
          label="Password"
          placeholder="Min. 8 characters"
          autoComplete="new-password"
          value={formData.password}
          onChange={handleChange}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword((prev) => !prev)}
          error={errors.password}
          required
        />

        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm Password"
          placeholder="Repeat password"
          autoComplete="new-password"
          value={formData.confirmPassword}
          onChange={handleChange}
          showPassword={showConfirmPassword}
          onTogglePassword={() => setShowConfirmPassword((prev) => !prev)}
          error={errors.confirmPassword}
          required
        />

        <div className="pt-2">
          <AuthButton isLoading={isSubmitting}>
            Create Free Account
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
        Already have a FinLab account?{' '}
        <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">
          Sign In
        </Link>
      </p>
    </AuthLayout>
  );
}
