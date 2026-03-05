import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar: React.FC = () => {
    const { logout } = useAuth();

    const navItems = [
        { path: '/dashboard', label: 'Virtual Machines (Dashboard)' },
        { path: '/create-vm', label: 'VM 생성 (Create VM)' },
        { path: '/info', label: '서비스 안내 (Info)' },
        // Add more item here if needed
    ];

    return (
        <aside style={styles.sidebar}>
            <div style={styles.logoArea}>
                <Link to="/" style={{ textDecoration: 'none' }}>
                    <h2 style={styles.logoText}>ANACLOUD</h2>
                    <span style={styles.versionText}>v0.1.0</span>
                </Link>
            </div>

            <nav style={styles.nav}>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        style={({ isActive }) => ({
                            ...styles.link,
                            ...(isActive ? styles.activeLink : {}),
                        })}
                    >
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div style={styles.footer}>
                <button onClick={logout} style={styles.logoutButton}>
                    로그아웃 (Logout)
                </button>
            </div>
        </aside>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    sidebar: {
        width: 'var(--sidebar-width)',
        height: '100vh',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
    },
    logoArea: {
        padding: 'var(--spacing-lg)',
        borderBottom: '1px solid var(--border-color)',
    },
    logoText: {
        color: 'var(--primary-color)',
        fontSize: '1.2rem',
        fontWeight: 'bold',
        marginBottom: 'var(--spacing-xs)',
    },
    versionText: {
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
    },
    nav: {
        padding: 'var(--spacing-md)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-xs)',
    },
    link: {
        padding: 'var(--spacing-sm) var(--spacing-md)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-secondary)',
        transition: 'background-color 0.2s, color 0.2s',
        fontSize: '0.95rem',
        textDecoration: 'none',
    },
    activeLink: {
        backgroundColor: 'var(--bg-tertiary)',
        color: 'var(--primary-color)',
        fontWeight: '500',
        borderLeft: '3px solid var(--primary-color)',
    },
    footer: {
        padding: 'var(--spacing-md)',
        borderTop: '1px solid var(--border-color)',
    },
    logoutButton: {
        width: '100%',
        padding: 'var(--spacing-sm)',
        textAlign: 'left',
        color: 'var(--accent-error)',
        fontSize: '0.9rem',
    }
};

export default Sidebar;
