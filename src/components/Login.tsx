import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleLogin called');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      console.log('Login response status:', res.status);
      if (!res.ok) throw new Error('Invalid credentials');
      const { token } = await res.json();
      localStorage.setItem('adminToken', token);
      navigate('/admin');
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid username or password');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-ivory">
      <form onSubmit={handleLogin} className="p-8 bg-white rounded-xl shadow-md">
        <h1 className="text-2xl font-serif mb-6">Admin Login</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        />
        <button type="submit" className="w-full p-2 bg-charcoal text-ivory rounded">Login</button>
        <button
          type="button"
          onClick={async () => {
            console.log('Reset password button clicked');
            try {
              console.log('Resetting password...');
              const res = await fetch('/api/admin/reset-password', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword: 'admin' })
              });
              if (res.ok) {
                console.log('Password reset successfully');
              } else {
                const errorData = await res.json();
                console.error('Password reset failed:', errorData);
              }
            } catch (err) {
              console.error('Password reset error:', err);
            }
          }}
          className="w-full p-2 mt-4 bg-gray-500 text-ivory rounded"
        >
          Reset Password to "admin"
        </button>
      </form>
    </div>
  );
}
