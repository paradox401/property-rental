import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // ✅ Added Link
import { image } from '../../assets/assets';
import { AuthContext } from '../../context/AuthContext';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('owner');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password, role);

      if (result.error) {
        setError(result.error || 'Login failed');
      } else {
        if (role === 'owner') {
          navigate('/owner');
        } else if (role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/renter');
        }
      }
    } catch (err) {
      setError('Server error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <h1>WELCOME<span className="green">!</span></h1>
        <img src={image.property} alt="Property" />
      </div>
      <div className="login-right">
        <div className="login-box">

          <h2><span className="logo">Property</span> Rental</h2>
          <h3>LogIn</h3>
          <form onSubmit={handleSubmit}>
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

            <label>Login As</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="owner">Owner</option>
              <option value="renter">Renter</option>
              <option value="admin">Admin</option>
            </select>

            {error && <p className="error">{error}</p>}

            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
          <div className="login-footer">
            <Link to="/forgot-password">Forgot Password?</Link>
            <p>
              Don't have an account? <Link to="/register">Sign Up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
