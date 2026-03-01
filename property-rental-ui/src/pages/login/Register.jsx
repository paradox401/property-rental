import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { image } from '../../assets/assets';
import { API_BASE_URL } from '../../config/api';
import './Register.css';

export default function Register() {
  const [name, setName] = useState('');
  const [citizenshipNumber, setCitizenshipNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('owner');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Please fill all fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, citizenshipNumber, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
      } else {
        if (data.verificationRequired) {
          setVerificationRequired(true);
          setVerificationEmail(data.email || email);
          setSuccess(data.message || 'OTP sent. Please verify your email.');
        } else {
          setSuccess('Registration successful! Redirecting...');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      }
    } catch (err) {
      setError('Server error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!verificationEmail || !otp) {
      setError('Please enter OTP.');
      return;
    }
    setOtpLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'OTP verification failed');
      } else {
        setSuccess('Email verified successfully! Redirecting to login...');
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch {
      setError('Server error. Please try again later.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setSuccess('');
    if (!verificationEmail) {
      setError('Missing verification email.');
      return;
    }
    setOtpLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/resend-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to resend OTP');
      } else {
        setSuccess(data.message || 'OTP resent');
      }
    } catch {
      setError('Server error. Please try again later.');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-left">
        <h1>
          JOIN<span className="green"> US</span>
        </h1>
        <img src={image.property} alt="Property" />
      </div>
      <div className="register-right">
        <h2>
          <span className="logo">Property</span> Rental
        </h2>
        <h3>{verificationRequired ? 'Verify Email' : 'Register'}</h3>
        {!verificationRequired ? (
        <form onSubmit={handleSubmit}>
          <label> Name</label>
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label>Citizenship Number</label>
          <input
            type="text"
            placeholder="Citizenship Number"
            value={citizenshipNumber}
            onChange={(e) => setCitizenshipNumber(e.target.value)}
          />
          <label>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label>Register As</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="owner">Owner</option>
            <option value="renter">Renter</option>
          </select>

          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        ) : (
        <form onSubmit={handleVerifyOtp}>
          <label>Email</label>
          <input type="email" value={verificationEmail} readOnly />

          <label>OTP</label>
          <input
            type="text"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
          <button type="submit" disabled={otpLoading}>
            {otpLoading ? 'Verifying...' : 'Verify OTP'}
          </button>
          <button type="button" disabled={otpLoading} onClick={handleResendOtp}>
            {otpLoading ? 'Please wait...' : 'Resend OTP'}
          </button>
        </form>
        )}
        <div className="register-footer">
          <p>
            Already have an account? <Link to="/login">Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
