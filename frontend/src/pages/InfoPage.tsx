import React from 'react';
import Card from '../components/common/Card';

const InfoPage: React.FC = () => {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
            <h2 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>서비스 안내 및 기술 스택</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
                ANA 동아리 서버 제공 서비스의 목표와 아키텍처 구조를 안내합니다.
            </p>

            <Card title="VM 아키텍처 및 관리" style={{ marginBottom: '24px' }}>
                <ul style={{ ...styles.list, lineHeight: '1.7' }}>
                    <li style={styles.listItem}>
                        해당 서비스는 기존의 무거운 가상 머신(VM) 하이퍼바이저 대신, <strong>Kubernetes와 결합된 KubeVirt를 사용</strong>하여 컨테이너 기반 오케스트레이션 도구로 VM의 시작과 종료(ON/OFF)를 관리합니다.
                    </li>
                    <li style={styles.listItem}>
                        <strong>virtio 반가상화 기술</strong>을 활용하여 더 높은 성능과 효율로 I/O 시스템을 구성하고 있습니다.
                    </li>
                    <li style={styles.listItem}>
                        각 인스턴스의 스토리지는 <strong>PVC(Persistent Volume Claim)로 유지 보존</strong>됩니다. 즉, 서버가 의도치 않게 꺼지거나 물리적인 정전이 발생하더라도 생성된 파일 및 데이터는 안전하게 유지됩니다.
                    </li>
                </ul>
            </Card>

            <Card title="네트워크 및 보안 정책" style={{ marginBottom: '24px' }}>
                <ul style={{ ...styles.list, lineHeight: '1.7' }}>
                    <li style={styles.listItem}>
                        해당 VM으로 들어오는 모든 네트워크는 기본적으로 <strong>HTTPS 통신만 지원</strong>합니다.
                    </li>
                    <li style={styles.listItem}>
                        외부에서 들어온 요청은 <strong>K3s Ingress에서 안전하게 복호화</strong>되며, 이후 백엔드 서버의 미들웨어를 거쳐 <strong>Proxy 단에서 전부 인터셉트(Intercept)</strong>됩니다.
                    </li>
                    <li style={styles.listItem}>
                        이를 통해 <strong>Rule-Based 방식으로 선제적인 보안 필터링</strong>을 수행하여 악의적인 공격 및 해킹 시도를 감지하고 감사(Audit)에 대응합니다.
                    </li>
                    <li style={{ ...styles.listItem, color: 'var(--text-secondary)' }}>
                        ※ 주의: 들어오는 요청(Ingress)에 대한 1차적인 방어는 수행하지만, 이를 <strong>통과한 정교한 공격이나 VM 내부에서 외부로 나가는(Egress) 이상 트래픽 및 악의적 코드 실행에 대해서는 아직 자동화된 차단 조치가 이루어지지 않습니다.</strong>
                    </li>
                    <li style={{ ...styles.listItem, color: 'var(--accent-error)', fontWeight: '500' }}>
                        따라서 보안에 취약한 상태로 방치되거나 비정상적인 트래픽(DDoS, 스팸 메일 발송 등)이 발생한 VM은 관리자에 의해 선제적으로 <strong>STOP 상태</strong>로 전환될 수 있으며, 고지 후 일주일 내에 소명되지 않으면 강제 삭제 처리됩니다.
                    </li>
                </ul>
            </Card>

            <Card title="서비스 활용 목표 및 권장 사항" style={{ marginBottom: '24px', borderLeft: '4px solid var(--accent-warning)' }}>
                <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent-warning)', fontSize: '1.05rem' }}>동아리 서버 제공 목표</h4>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6' }}>
                        이 서버 대여 서비스는 동아리 부원들의 <strong>간단한 워크로드 운영, 개인 프로젝트, 학업용 테스트베드 구축</strong>을 목표로 하고 있습니다.
                    </p>
                </div>
                <div>
                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent-error)', fontSize: '1.05rem' }}>⚠️ 이용 지양 사항</h4>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6' }}>
                        일시적인 서비스 중단이나 장애가 크리티컬하게 작용하는 <strong>중요한 대규모 서비스나 무결단(ZDD) 프로덕션급 워크로드</strong>를 이 곳에서 구동하는 것은 지양해 주시기 바랍니다.
                    </p>
                </div>
            </Card>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    list: {
        paddingLeft: '20px',
        color: 'var(--text-secondary)',
    },
    listItem: {
        marginBottom: '12px',
        fontSize: '0.95rem',
    }
};

export default InfoPage;
