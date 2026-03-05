import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/global.css';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <header className="header-bar">
        <div className="header-content">
          <h1>ANA Cloud Portal</h1>
          <nav>
            {user ? (
              <>
                <span>Welcome, {user.Username} ({user.UserStudentId})</span>
                <Link to="/dashboard">Dashboard</Link>
                <a href="#" onClick={handleLogout}>Logout</a>
              </>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <div className="container">
        {user && (
          <aside className="sidebar">
            <ul>
              <li><Link to="/dashboard">My VMs</Link></li>
              <li><Link to="/profile">My Profile</Link></li>
            </ul>
          </aside>
        )}
        <main className="content">
          {children}
        </main>
      </div>

      <footer className="footer">
        &copy; 2024 ANA Cloud Portal. All rights reserved.
      </footer>
    </div>
  );
};

export default Layout;
