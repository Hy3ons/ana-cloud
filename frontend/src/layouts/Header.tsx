import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Header: React.FC = () => {
    const { user } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    return (
        <header style={styles.header}>
            <div style={styles.breadcrumb}>
                {/* Placeholder for breadcrumb or page title */}
                <span style={{ color: 'var(--text-muted)' }}>Portal  / </span>
                <span style={{ marginLeft: '8px', fontWeight: 500 }}>Overview</span>
            </div>

            <div style={{ ...styles.userArea, gap: '16px' } as React.CSSProperties}>
                <div
                    style={styles.userProfile}
                    onMouseEnter={() => setIsDropdownOpen(true)}
                    onMouseLeave={() => setIsDropdownOpen(false)}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                    <div style={styles.userAvatar}>
                        {user?.Username ? user.Username.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span style={styles.userName}>{user?.Username || 'User'}</span>

                    {isDropdownOpen && user && (
                        <div style={styles.dropdown}>
                            <div style={styles.dropdownHeader}>
                                <strong>{user.Username}</strong>님의 정보
                            </div>
                            <div style={styles.dropdownContent}>
                                <div style={styles.dropdownItem}>
                                    <span style={styles.dropdownLabel}>이메일</span>
                                    <span style={styles.dropdownValue}>{user.Email}</span>
                                </div>
                                <div style={styles.dropdownItem}>
                                    <span style={styles.dropdownLabel}>학번</span>
                                    <span style={styles.dropdownValue}>{user.UserStudentId}</span>
                                </div>
                                <div style={styles.dropdownItem}>
                                    <span style={styles.dropdownLabel}>소속 네임스페이스</span>
                                    <span style={styles.dropdownValue}>{user.Namespace}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <a
                    href="https://github.com/Hy3ons/ana-cloud"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="해당 시스템을 개발한 Github Repository로 이동합니다."
                    style={{ display: 'flex', alignItems: 'center', transition: 'opacity 0.2s', padding: '4px' }}
                >
                    <img
                        src="/logo-github-w.png"
                        alt="GitHub Repository"
                        style={{ width: '28px', height: '28px', opacity: 0.7, cursor: 'pointer' }}
                        onMouseOver={e => e.currentTarget.style.opacity = '1'}
                        onMouseOut={e => e.currentTarget.style.opacity = '0.7'}
                    />
                </a>
            </div>
        </header>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    header: {
        height: 'var(--header-height)',
        backgroundColor: 'var(--bg-primary)', // Matches body bg, or could be secondary
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--spacing-lg)',
    },
    breadcrumb: {
        fontSize: '0.9rem',
    },
    userArea: {
        display: 'flex',
        alignItems: 'center',
    },
    userProfile: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        padding: '8px 12px',
        borderRadius: '8px',
        transition: 'background-color 0.2s',
        position: 'relative',
    },
    userAvatar: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: 'var(--accent-primary)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '14px',
    },
    userName: {
        fontSize: '0.95rem',
        fontWeight: 500,
        color: 'var(--text-primary)',
    },
    dropdown: {
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        minWidth: '240px',
        zIndex: 100,
        overflow: 'hidden',
    },
    dropdownHeader: {
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-tertiary)',
        fontSize: '0.9rem',
        color: 'var(--text-primary)',
    },
    dropdownContent: {
        padding: '8px 0',
    },
    dropdownItem: {
        display: 'flex',
        flexDirection: 'column',
        padding: '8px 16px',
        gap: '4px',
    },
    dropdownLabel: {
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
    },
    dropdownValue: {
        fontSize: '0.9rem',
        color: 'var(--text-secondary)',
        wordBreak: 'break-all',
    }
};

export default Header;
