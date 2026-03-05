import React from 'react';

interface CardProps {
    children: React.ReactNode;
    title?: React.ReactNode;
    action?: React.ReactNode;
    style?: React.CSSProperties;
    className?: string; // Allow passing className for custom styling if needed
}

const Card: React.FC<CardProps> = ({ children, title, action, style, className }) => {
    return (
        <div className={className} style={{ ...styles.card, ...style }}>
            {(title || action) && (
                <div style={styles.header}>
                    {title && <h3 style={styles.title}>{title}</h3>}
                    {action && <div>{action}</div>}
                </div>
            )}
            <div style={styles.content}>
                {children}
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    card: {
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 'var(--spacing-md)',
        overflow: 'hidden',
    },
    header: {
        padding: 'var(--spacing-md)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: '1.1rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
        margin: 0,
    },
    content: {
        padding: 'var(--spacing-md)',
    }
};

export default Card;
