import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchVMs, stopVM, startVM, deleteVM } from '../api/vm';
import type { VM } from '../api/vm';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import StatusBadge from '../components/common/StatusBadge';

// Helper for deep comparison of VM lists
const areVMListsEqual = (prev: VM[], next: VM[]) => {
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    const p = prev[i];
    const n = next[i];
    if (
      p.Name !== n.Name ||
      p.Status !== n.Status ||
      p.Namespace !== n.Namespace ||
      p.UserID !== n.UserID
    ) {
      return false;
    }
  }
  return true;
};

interface VMItemProps {
  vm: VM;
  onStart: (name: string) => void;
  onStop: (name: string) => void;
  onDelete: (name: string) => void;
  onShowHelp: (vm: VM) => void;
  isActionLoading: boolean;
}

const VMItem = React.memo(({ vm, onStart, onStop, onDelete, onShowHelp, isActionLoading }: VMItemProps) => {
  return (
    <Card
      title={vm.Name}
      action={
        <button
          style={styles.helpIcon}
          onClick={(e) => {
            e.stopPropagation();
            onShowHelp(vm);
          }}
          title="SSH 접속 방법"
        >
          ?
        </button>
      }
      style={styles.vmCard}
    >
      <div style={styles.cardContent}>
        <div style={styles.infoRow}>
          <span style={styles.label}>상태 (Status)</span>
          <StatusBadge status={vm.Status} />
        </div>
        <div style={styles.infoRow}>
          <span style={styles.label}>네임스페이스</span>
          <span style={styles.value}>{vm.Namespace}</span>
        </div>

        {/* Add more details here like IP, CPU, RAM if available in VM object */}
      </div>

      <div style={styles.actions}>
        {vm.Status === 'Stopped' ? (
          <Button
            size="sm"
            onClick={() => onStart(vm.Name)}
            disabled={isActionLoading}
          >
            시작 (Start)
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onStop(vm.Name)}
            disabled={isActionLoading || vm.Status !== 'Running'}
          >
            중지 (Stop)
          </Button>
        )}

        <Button
          variant="danger"
          size="sm"
          onClick={() => onDelete(vm.Name)}
          disabled={isActionLoading}
        >
          삭제 (Delete)
        </Button>
      </div>
    </Card>
  );
}, (prev, next) => {
  return (
    prev.isActionLoading === next.isActionLoading &&
    prev.vm.Name === next.vm.Name &&
    prev.vm.Status === next.vm.Status &&
    prev.vm.Namespace === next.vm.Namespace
  );
});

const DashboardPage: React.FC = () => {
  const [vms, setVms] = useState<VM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'guide'>('list');
  const [helpModalVm, setHelpModalVm] = useState<VM | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Ref to track if it's the first load to manage loading state appropriately
  const isFirstLoad = useRef(true);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(id);
      setTimeout(() => setCopyFeedback(null), 2000);
    }).catch(err => {
      console.error('Copy failed', err);
    });
  }, []);

  const loadVMs = useCallback(async () => {
    try {
      // Don't set loading to true on refresh to avoid flickering if already loaded
      if (isFirstLoad.current) setLoading(true);

      const data = await fetchVMs();

      // Deep compare to prevent unnecessary re-renders
      setVms(prev => {
        const newVms = data.vms || [];
        if (areVMListsEqual(prev, newVms)) return prev;
        return newVms;
      });
      setError('');
    } catch (err) {
      setError('VM 목록을 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      if (isFirstLoad.current) {
        setLoading(false);
        isFirstLoad.current = false;
      }
    }
  }, []);

  useEffect(() => {
    loadVMs();
    // Poll every 10 seconds to update status
    const interval = setInterval(loadVMs, 10000);
    return () => clearInterval(interval);
  }, [loadVMs]);

  const handleStop = useCallback(async (vmName: string) => {
    if (!confirm(`${vmName}을(를) 중지하시겠습니까?`)) return;
    setActionLoading(vmName);
    try {
      await stopVM(vmName);
      loadVMs();
    } catch {
      alert('VM 중지 실패');
    } finally {
      setActionLoading(null);
    }
  }, [loadVMs]);

  const handleStart = useCallback(async (vmName: string) => {
    if (!confirm(`${vmName}을(를) 시작하시겠습니까?`)) return;
    setActionLoading(vmName);
    try {
      await startVM(vmName);
      loadVMs();
    } catch {
      alert('VM 시작 실패');
    } finally {
      setActionLoading(null);
    }
  }, [loadVMs]);

  const handleDelete = useCallback(async (vmName: string) => {
    if (!confirm(`${vmName}을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    setActionLoading(vmName);
    try {
      await deleteVM(vmName);
      loadVMs();
    } catch {
      alert('VM 삭제 실패');
    } finally {
      setActionLoading(null);
    }
  }, [loadVMs]);

  if (loading && vms.length === 0) return <div style={{ color: 'var(--text-secondary)' }}>Loading resources...</div>;
  if (error) return <div style={{ color: 'var(--accent-error)' }}>{error}</div>;

  return (
    <div>
      <div style={styles.headerRow}>
        <div>
          <h2 style={{ marginBottom: '4px' }}>실행 중인 VM들</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>클라우드 리소스를 관리합니다.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={loadVMs} variant="secondary">새로고침</Button>
          <Link to="/create-vm" style={{ textDecoration: 'none' }}>
            <Button>+ VM 생성</Button>
          </Link>
        </div>
      </div>

      <div style={styles.tabsContainer}>
        <button
          style={activeTab === 'list' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
          onClick={() => setActiveTab('list')}
        >
          VM 목록
        </button>
        <button
          style={activeTab === 'guide' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
          onClick={() => setActiveTab('guide')}
        >
          VM 접속하는 방법
        </button>
      </div>

      {activeTab === 'list' && (
        <>
          {vms.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>생성된 가상 머신이 없습니다.</p>
              <Link to="/create-vm" style={{ textDecoration: 'none' }}>
                <Button>첫 VM 생성하기</Button>
              </Link>
            </Card>
          ) : (
            <div style={styles.grid}>
              {vms.map((vm) => (
                <VMItem
                  key={vm.Name}
                  vm={vm}
                  onStart={handleStart}
                  onStop={handleStop}
                  onDelete={handleDelete}
                  onShowHelp={(selectedVm) => setHelpModalVm(selectedVm)}
                  isActionLoading={actionLoading === vm.Name}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'guide' && (
        <Card style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>중계 서버 (Bastion) 설정 가이드</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6' }}>
            현재 내부망의 외부 노출 포트가 부족하여, 모든 VM에 직접 접근하기 위해서는 내부적으로 이중 프록시 방식을 사용하고 있습니다.
            원리는 먼저 외부에 열려있는 Bastion(중계 서버)에 안전하게 접속한 뒤, 그 연결을 터널(ProxyJump)로 활용하여 내부망에 존재하는 각 VM으로 접속하는 방식입니다.
            아래의 SSH 설정을 당신의 <code style={styles.inlineCode}>~/.ssh/config</code> 파일에 추가하여 간편하게 접속하세요.
          </p>

          <pre style={{ backgroundColor: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', overflowX: 'auto', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
            <code>{`# --- 1. 중계 서버 (Bastion) 설정 ---
Host bastion
    HostName anacnu.com
    User proxy-ssh
    Port 22

    # 프록시 전용 계정이므로 불필요한 기능 끄기
    RequestTTY no
    RemoteCommand none

# --- 2. 내부 VM 접속 설정 (예시) ---
# 내부망에 있는 VM들의 IP를 여기에 등록합니다.
Host vm1
    HostName localhost  # VM은 내부 서버에서,bastion을 거쳐서 접속하기 때문에 localhost로 설정
    User root            # VM은 기본적으로 root 계정만 생성됩니다.
    Port {{VM이 할당받은 포트를 적습니다.}}
    ProxyJump bastion    # bastion을 거쳐서 접속함`}</code>
          </pre>

          <div style={{ marginTop: '20px', padding: '16px', backgroundColor: 'var(--bg-light)', borderRadius: '8px', borderLeft: '4px solid var(--accent-primary)' }}>
            <h4 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>💡 접속 방법</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              위 설정을 완료한 후, 터미널에서 <code style={styles.inlineCode}>ssh vm1</code> 명령어를 입력하면 Bastion을 거쳐 자동으로 가상 머신에 접속됩니다.
            </p>
          </div>
        </Card>
      )}

      {/* Help Modal */}
      {helpModalVm && (
        <div style={styles.modalOverlay} onClick={() => setHelpModalVm(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{helpModalVm.Name} 접속 방법</h3>
              <button style={styles.closeButton} onClick={() => setHelpModalVm(null)}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <div style={{ marginBottom: '20px', padding: '12px 16px', backgroundColor: 'rgba(255, 193, 7, 0.1)', borderLeft: '4px solid #ffc107', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 4px 0', color: '#ffc107', fontSize: '0.95rem' }}>⚠️ 중요 안내</h4>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.4' }}>
                  <code>proxy-ssh</code> 계정의 비밀번호는 <strong>현재 ANA 회장에게 Direct로 문의하여</strong> 확인해 주세요.
                </p>
              </div>

              <div style={styles.methodSection}>
                <h4 style={styles.methodTitle}>방법 1. 한 줄 명령어로 바로 접속하기 (가장 간단함)</h4>
                <p style={styles.methodDesc}>Bastion 서버를 `ProxyJump(-J)`로 지정하여 한 번에 접속합니다.</p>
                <div style={styles.codeBlockContainer}>
                  <code style={styles.codeBlock}>
                    ssh -J proxy-ssh@anacnu.com root@localhost -p {helpModalVm.NodePort}
                  </code>
                  <button
                    style={styles.copyBtn}
                    onClick={() => handleCopy(`ssh -J proxy-ssh@anacnu.com root@localhost -p ${helpModalVm.NodePort}`, 'method1')}
                  >
                    {copyFeedback === 'method1' ? '복사됨!' : '📋 복사'}
                  </button>
                </div>
              </div>

              <div style={styles.methodSection}>
                <h4 style={styles.methodTitle}>방법 2. ~/.ssh/config 수정하고 편하게 들어가기</h4>
                <p style={styles.methodDesc}>매번 길게 치기 귀찮다면, 아래 내용을 <code>~/.ssh/config</code>에 추가하세요. (초기 1회 설정)</p>
                <div style={styles.codeBlockContainer}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    <code style={{ fontFamily: 'inherit' }}>{`Host bastion
    HostName anacnu.com
    User proxy-ssh
    Port 22
    RequestTTY no
    RemoteCommand none

Host ${helpModalVm.Name}
    HostName localhost
    User root
    Port ${helpModalVm.NodePort}
    ProxyJump bastion`}</code>
                  </pre>
                  <button
                    style={styles.copyBtn}
                    onClick={() => handleCopy(`Host bastion
    HostName anacnu.com
    User proxy-ssh
    Port 22
    RequestTTY no
    RemoteCommand none

Host ${helpModalVm.Name}
    HostName localhost
    User root
    Port ${helpModalVm.NodePort}
    ProxyJump bastion`, 'method2')}
                  >
                    {copyFeedback === 'method2' ? '복사됨!' : '📋 복사'}
                  </button>
                </div>
                <p style={{ ...styles.methodDesc, marginTop: '8px' }}>
                  이후에는 <code style={styles.inlineCode}>ssh {helpModalVm.Name}</code> 만 입력하면 접속됩니다.
                </p>
              </div>

              <div style={styles.methodSection}>
                <h4 style={styles.methodTitle}>방법 3. (심화) 이중 암호 입력 생략하기</h4>
                <p style={styles.methodDesc}>
                  Bastion(proxy-ssh) 로그인 시 매번 비밀번호를 치기 번거롭다면,
                  본인의 공개키(<code>~/.ssh/id_rsa.pub</code>)를 Bastion 서버의 proxy-ssh 환경에 등록해달라고 관리자에게 요청하세요.
                  등록이 완료되면 바로 타겟 VM 암호만 입력하여 접속할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--spacing-lg)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 'var(--spacing-md)',
  },
  vmCard: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  cardContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.9rem',
  },
  label: {
    color: 'var(--text-secondary)',
  },
  value: {
    color: 'var(--text-primary)',
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '12px',
    marginTop: 'auto',
  },
  tabsContainer: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    borderBottom: '1px solid var(--border-color)',
  },
  tab: {
    padding: '8px 16px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  activeTab: {
    color: 'var(--accent-primary)',
    borderBottomColor: 'var(--accent-primary)',
  },
  inlineCode: {
    backgroundColor: 'var(--bg-light)', // 좀 더 밝은 배경색으로 변경
    color: 'var(--accent-primary)',
    padding: '3px 6px', // 패딩 약간 늘림
    borderRadius: '6px', // 모서리를 더 둥글게
    fontFamily: '"Fira Code", "JetBrains Mono", "Courier New", Courier, monospace',
    fontSize: '0.85em', // 폰트 사이즈 살짝 축소
    fontWeight: 600, // 굵기 조절
    border: '1px solid rgba(255,255,255,0.1)', // 부드러운 테두리
    boxShadow: '0 1px 2px rgba(0,0,0,0.2)', // 약간의 그림자 추가
  },
  helpIcon: {
    background: 'none',
    border: '1px solid var(--border-color)',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // 배경을 더 어둡게(불투명하게) 변경
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'var(--bg-primary)', // 모달 컨텐츠도 불투명한 주 색상으로 변경
    borderRadius: '12px',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '85vh',
    overflowY: 'auto' as const,
    boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid var(--border-color)',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '1.2rem',
    cursor: 'pointer',
    padding: '4px',
  },
  modalBody: {
    padding: '24px',
  },
  methodSection: {
    marginBottom: '24px',
  },
  methodTitle: {
    margin: '0 0 8px 0',
    color: 'var(--accent-primary)',
    fontSize: '1.1rem',
  },
  methodDesc: {
    margin: '0 0 12px 0',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    fontSize: '0.95rem',
  },
  codeBlockContainer: {
    backgroundColor: '#1E1E1E',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #444',
    overflowX: 'auto' as const,
    position: 'relative' as const, // 복사 버튼 위치 기준점
  },
  codeBlock: {
    color: '#D4D4D4',
    fontFamily: '"Fira Code", "JetBrains Mono", monospace',
    fontSize: '0.9rem',
    lineHeight: '1.4',
    display: 'block',
    paddingRight: '60px', // 복사 버튼 공간 확보
  },
  copyBtn: {
    position: 'absolute' as const,
    top: '12px',
    right: '12px',
    background: 'var(--bg-light)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    padding: '6px 10px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'background 0.2s',
  }
};

export default DashboardPage;
