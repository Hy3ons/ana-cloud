import React from 'react';

interface StatusBadgeProps {
    status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    let backgroundColor = 'var(--bg-tertiary)';
    let color = 'var(--text-secondary)';
    const label = status || 'Unknown';

    if (status === 'Running') {
        backgroundColor = 'rgba(16, 124, 16, 0.2)'; // success with opacity
        color = 'var(--accent-success)';
    } else if (status === 'Stopped') {
        backgroundColor = 'rgba(216, 59, 1, 0.2)'; // warning/error
        color = 'var(--accent-warning)';
    } else if (status === 'Terminating') {
        backgroundColor = 'rgba(197, 15, 31, 0.2)';
        color = 'var(--accent-error)';
    }

    const style: React.CSSProperties = {
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.85rem',
        fontWeight: 600,
        backgroundColor,
        color,
        display: 'inline-block',
    };

    return <span style={style}>{label}</span>;
};

export default StatusBadge;
