import React, { useEffect, useState } from 'react';
import { getHealth } from '../api/health';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import StatusBadge from '../components/common/StatusBadge';

const HomePage: React.FC = () => {
    // Stats State
    const [activeVMs, setActiveVMs] = useState<number | null>(null);
    const [apiStatus, setApiStatus] = useState<string>('Checking...');
    const [k8sStatus, setK8sStatus] = useState<string>('Checking...');

    // Login State
    const [studentId, setStudentId] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const { login, logout, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await getHealth();
                setApiStatus(data.status === 'ok' ? 'Online' : 'Issues');
                setK8sStatus(data.k8s_connectivity === 'healthy' ? 'Online' : 'Unstable');

                if (data.active_vms !== undefined) {
                    setActiveVMs(data.active_vms);
                }
            } catch {
                setApiStatus('Offline');
                setK8sStatus('Unknown');
            }
        };
        fetchStats();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setIsLoggingIn(true);
        try {
            await login(studentId, password);
            navigate('/dashboard');
        } catch {
            setLoginError('로그인 실패. 정보를 확인하세요.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.heroBackground} />

            <div style={styles.contentWrapper}>
                {/* Left Column: Info & Stats */}
                <div style={styles.leftColumn}>
                    <div style={styles.brandSection}>
                        <h1 style={styles.mainTitle}>ANA CLOUD</h1>
                        <p style={styles.subTitle}>
                            컴퓨터융합학부 ANA 동아리에서 진행중인 VM 제공 서비스입니다.<br />
                        </p>
                    </div>

                    <div style={{ padding: '16px 20px', backgroundColor: 'rgba(255, 152, 0, 0.1)', borderLeft: '4px solid #ff9800', borderRadius: '8px', marginBottom: '20px' }}>
                        <h3 style={{ margin: '0 0 8px 0', color: '#ff9800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            ⚠️ 시스템 이용 간 주의사항
                        </h3>
                        <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                            현재 ANA Cloud는 <strong>사내 서비스의 빠른 공급을 위해 신속하게 구축된 초기 버전</strong>입니다.
                            서비스 이용 시 아래 사항을 반드시 숙지해 주시기 바랍니다.
                        </p>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                            <li>현재 대시보드의 각종 버튼(생성, 시작, 중지, 삭제 등)은 <strong>멱등성(Idempotency)이 완벽하게 보장되지 않습니다.</strong></li>
                            <li>따라서, 버튼을 <strong style={{ color: 'var(--accent-error)' }}>여러 번 중복해서 누를 경우</strong> K8s 내부 VM 관리 프로세스와 데이터베이스 상태가 불일치해질 수 있습니다. 조작 후 잠시 기다려주세요.</li>
                            <li>완벽하게 다듬어진 시스템은 아니지만, 문제가 발생할 경우 그 <strong>어떤 서비스보다 빠르게 기술 지원 및 복구</strong>를 도와드릴 수 있습니다. 부담 없이 편하게 사용하시고 문의해 주세요!</li>
                        </ul>
                    </div>

                    <div style={styles.statsGrid}>
                        <Card title="System Status" style={styles.statCard}>
                            <div style={styles.statusRow}>
                                <span style={styles.statusLabel}>API Gateway</span>
                                <StatusBadge status={apiStatus === 'Online' ? 'Running' : 'Stopped'} />
                            </div>
                            <div style={styles.statusRow}>
                                <span style={styles.statusLabel}>K8s Cluster</span>
                                <StatusBadge status={k8sStatus === 'Online' ? 'Running' : 'Stopped'} />
                            </div>
                        </Card>

                        <Card title="Resources" style={styles.statCard}>
                            <div style={styles.metricContainer}>
                                <span style={styles.metricValue}>{activeVMs ?? '-'}</span>
                                <span style={styles.metricLabel}>Running VMs</span>
                            </div>
                        </Card>
                    </div>

                    <Card title="공지사항 (Announcements)" style={styles.noticeCard}>
                        <ul style={styles.noticeList}>
                            <li style={styles.noticeItem}>
                                <span style={styles.noticeDate}>2026.03.05</span>
                                <span>ANA Cloud v0.1.0 운영 시작</span>
                            </li>
                            <li style={styles.noticeItem}>
                                <span style={styles.noticeDate}>2026.03.05</span>
                                <span>Archlinux LTS 이미지 업데이트 완료</span>
                            </li>
                            <li style={styles.noticeItem}>
                                <span style={styles.noticeDate}>2026.01.10</span>
                                <span>Ubuntu 20.04 LTS 이미지 업데이트 완료</span>
                            </li>
                        </ul>
                    </Card>
                </div>

                {/* Right Column: Login Portal */}
                <div style={styles.rightColumn}>
                    <Card title="Portal Login" style={styles.loginCard}>
                        {user ? (
                            <div style={styles.loggedInContainer}>
                                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>환영합니다!</h3>
                                    <p style={{ color: 'var(--text-secondary)' }}>현재 로그인되어 있습니다.</p>
                                </div>
                                <div style={styles.buttonGroup}>
                                    <Button
                                        fullWidth
                                        size="lg"
                                        onClick={() => navigate('/dashboard')}
                                        style={{ marginBottom: '12px' }}
                                    >
                                        대시보드로 이동 (Go to Dashboard)
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        fullWidth
                                        size="lg"
                                        onClick={logout}
                                    >
                                        로그아웃 (Logout)
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleLogin} style={styles.form}>
                                <div style={styles.inputGroup}>
                                    <Input
                                        label="학번 (Student ID)"
                                        value={studentId}
                                        onChange={(e) => setStudentId(e.target.value)}
                                        placeholder="학번을 입력하세요"
                                        fullWidth
                                        required
                                    />
                                </div>
                                <div style={styles.inputGroup}>
                                    <Input
                                        label="비밀번호 (Password)"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="비밀번호를 입력하세요"
                                        fullWidth
                                        required
                                    />
                                </div>

                                {loginError && <div style={styles.errorText}>{loginError}</div>}

                                <div style={styles.buttonGroup}>
                                    <Button
                                        type="submit"
                                        fullWidth
                                        size="lg"
                                        disabled={isLoggingIn}
                                    >
                                        {isLoggingIn ? '접속 중...' : '로그인'}
                                    </Button>
                                </div>

                                <div style={styles.loginFooter}>
                                    <Link to="/register" style={styles.link}>회원가입</Link>
                                    <span style={styles.divider}>|</span>
                                    <Link to="#" style={{ ...styles.link, color: 'var(--text-muted)', cursor: 'not-allowed' }}>비밀번호 찾기</Link>
                                </div>
                            </form>
                        )}
                    </Card>

                    <div style={{ marginTop: '20px', padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', borderLeft: '4px solid var(--primary-color)' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: 'var(--primary-color)', fontSize: '0.95rem' }}>ℹ️ 이용 안내 및 주의사항</h4>
                        <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                            • <strong>해당 연도의 ANA 회원만 가입 시 VM 사용 권한이 승인됩니다.</strong> 가입 후 ANA 회장에게 카카오톡이나 전화번호로 직접 문의하여 사용 목적 승인을 요청해 주세요.
                        </p>
                        <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                            • 웬만한 악의적이지 않은 모든 경우(단순 오락/게임 서버 대여 포함) 승인이 가능합니다. <strong>단, 제3자에게 피해를 주는 원격 공격이나 해킹 등은 엄격히 금지됩니다.</strong>
                        </p>
                        <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                            • 악의적으로 Database 및 내부 Container Orchestration의 데이터 일관성을 훼손하는 행위는 지양해 주시기 바랍니다.
                        </p>
                        <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                            • 각 회원의 민감한 정보가 보관되고 있으니, <strong>학구열을 핑계로 한 해킹(Hacking) 행위 역시 절대 금지</strong>합니다.
                        </p>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                            • 세세한 네트워크 설정과 L3, L4, L7 계층의 추가적인 네트워크 관리는 <strong>현 ANA 회장에게 문의하여 기술 지원을 받을 수 있습니다.</strong>
                        </p>
                    </div>

                    <div style={styles.footerInfo}>
                        <p>© 2026 ANA Club. All rights reserved.</p>
                        <p>Unauthorized access is prohibited.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    heroBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '40vh',
        background: 'linear-gradient(180deg, rgba(0,120,212,0.15) 0%, rgba(15,17,21,0) 100%)',
        zIndex: 0,
    },
    contentWrapper: {
        display: 'flex',
        flexWrap: 'wrap',
        width: '100%',
        maxWidth: '1200px',
        padding: '20px',
        gap: '40px',
        zIndex: 1,
        justifyContent: 'center',
    },
    leftColumn: {
        flex: '1 1 500px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    rightColumn: {
        flex: '0 1 400px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    brandSection: {
        marginBottom: '20px',
    },
    mainTitle: {
        fontSize: '3rem',
        fontWeight: 800,
        color: 'var(--text-primary)',
        marginBottom: '10px',
        letterSpacing: '-1px',
    },
    subTitle: {
        fontSize: '1.2rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.5,
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
    },
    statCard: {
        height: '100%',
    },
    statusRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: '1px solid var(--border-color)',
    },
    statusLabel: {
        color: 'var(--text-secondary)',
        fontSize: '0.9rem',
    },
    metricContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 0',
    },
    metricValue: {
        fontSize: '3rem',
        fontWeight: 700,
        color: 'var(--primary-color)',
        lineHeight: 1,
    },
    metricLabel: {
        color: 'var(--text-muted)',
        fontSize: '0.9rem',
        marginTop: '8px',
    },
    noticeCard: {
        flex: 1,
    },
    noticeList: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
    },
    noticeItem: {
        display: 'flex',
        gap: '12px',
        padding: '12px 0',
        borderBottom: '1px solid var(--border-color)',
        fontSize: '0.95rem',
        color: 'var(--text-primary)',
    },
    noticeDate: {
        color: 'var(--primary-color)',
        fontWeight: 600,
        minWidth: '80px',
    },
    loginCard: {
        padding: '10px',
        borderTop: '4px solid var(--primary-color)',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
    },
    buttonGroup: {
        marginTop: '10px',
    },
    errorText: {
        color: 'var(--accent-error)',
        fontSize: '0.9rem',
        textAlign: 'center',
    },
    loginFooter: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '10px',
        marginTop: '16px',
        fontSize: '0.9rem',
    },
    link: {
        color: 'var(--text-secondary)',
        textDecoration: 'none',
        transition: 'color 0.2s',
    },
    divider: {
        color: 'var(--border-color)',
    },
    footerInfo: {
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        marginTop: '20px',
    },
    loggedInContainer: {
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 10px',
    }
};

export default HomePage;
