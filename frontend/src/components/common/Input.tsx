import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    fullWidth?: boolean;
}

const Input: React.FC<InputProps> = ({ 
    label, 
    error, 
    fullWidth = false, 
    style, 
    id,
    ...props 
}) => {
    
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        marginBottom: '12px',
        width: fullWidth ? '100%' : 'auto',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '0.9rem',
        color: 'var(--text-secondary)',
        fontWeight: 500,
    };

    const inputStyle: React.CSSProperties = {
        padding: '8px 12px',
        fontSize: '0.95rem',
        backgroundColor: 'var(--bg-tertiary)',
        border: error ? '1px solid var(--accent-error)' : '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-primary)',
        outline: 'none',
        transition: 'border-color 0.2s',
        ...style
    };

    return (
        <div style={containerStyle}>
            {label && <label htmlFor={id} style={labelStyle}>{label}</label>}
            <input 
                id={id}
                style={inputStyle}
                onFocus={(e) => {
                    if (!error) e.target.style.borderColor = 'var(--primary-color)';
                }}
                onBlur={(e) => {
                    if (!error) e.target.style.borderColor = 'var(--border-color)';
                }}
                {...props} 
            />
            {error && <span style={{ fontSize: '0.8rem', color: 'var(--accent-error)' }}>{error}</span>}
        </div>
    );
};

export default Input;
