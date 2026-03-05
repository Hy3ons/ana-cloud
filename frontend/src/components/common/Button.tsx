import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'text';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    fullWidth = false,
    style,
    disabled,
    ...props 
}) => {
    
    const baseStyle: React.CSSProperties = {
        padding: size === 'sm' ? '4px 12px' : size === 'lg' ? '12px 24px' : '8px 16px',
        fontSize: size === 'sm' ? '0.85rem' : size === 'lg' ? '1.1rem' : '0.95rem',
        borderRadius: 'var(--radius-sm)',
        fontWeight: 500,
        transition: 'all 0.2s',
        width: fullWidth ? '100%' : 'auto',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
    };

    const variantStyles: { [key: string]: React.CSSProperties } = {
        primary: {
            backgroundColor: 'var(--primary-color)',
            color: 'white',
        },
        secondary: {
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
        },
        danger: {
            backgroundColor: 'var(--accent-error)',
            color: 'white',
        },
        outline: {
            backgroundColor: 'transparent',
            border: '1px solid var(--primary-color)',
            color: 'var(--primary-color)',
        },
        text: {
            backgroundColor: 'transparent',
            color: 'var(--primary-color)',
            padding: '4px 8px',
        }
    };

    return (
        <button 
            style={{ ...baseStyle, ...variantStyles[variant], ...style }} 
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
