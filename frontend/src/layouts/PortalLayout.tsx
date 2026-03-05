import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface PortalLayoutProps {
    children: React.ReactNode;
}

const PortalLayout: React.FC<PortalLayoutProps> = ({ children }) => {
    return (
        <div style={styles.container}>
            <Sidebar />
            <div style={styles.mainWrapper}>
                <Header />
                <main style={styles.contentArea}>
                    {children}
                </main>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-primary)',
    },
    mainWrapper: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0, // flexbox overflow fix
    },
    contentArea: {
        flex: 1,
        overflowY: 'auto',
        padding: 'var(--spacing-lg)',
        position: 'relative',
    }
};

export default PortalLayout;
