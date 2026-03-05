import React, { useState } from 'react';
import { createVM } from '../api/vm';
import { useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

const CreateVMPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        vm_name: '',
        vm_ssh_password: '',
        vm_image: 'ubuntu-2204-gold-source', // Default
        vm_host: ''
    });

    const [useCustomDomain, setUseCustomDomain] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 도메인 처리 로직: 기본 도메인 사용 시 .anacnu.com 접미사 추가
            const finalHostPrefix = useCustomDomain
                ? formData.vm_host
                : `${formData.vm_host}.anacnu.com`;

            const payload = {
                ...formData,
                vm_host: finalHostPrefix
            };

            await createVM(payload);
            alert("VM 생성이 시작되었습니다! 완료되기까지 몇 분 정도 소요될 수 있습니다.");
            navigate('/dashboard');
        } catch (err: unknown) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errorMessage = (err as any).response?.data?.error || 'VM 생성에 실패했습니다.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '16px' }}>새 가상 머신 생성</h2>
            <Card title="구성 설정 (Configuration)">
                <form onSubmit={handleSubmit}>
                    {error && <div style={{ color: 'var(--accent-error)', marginBottom: '16px' }}>{error}</div>}

                    <Input
                        label="VM 이름 (Name)"
                        name="vm_name"
                        value={formData.vm_name}
                        onChange={handleChange}
                        placeholder="예: my-server-01"
                        pattern="[a-z0-9]([-a-z0-9]*[a-z0-9])?"
                        title="소문자, 숫자, 하이픈(-)만 사용 가능합니다."
                        required
                        fullWidth
                        style={{ marginBottom: '4px' }}
                    />
                    <small style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.8rem' }}>
                        DNS-1123 호환 이름이어야 합니다.
                    </small>

                    <Input
                        label="SSH 비밀번호 (Password)"
                        name="vm_ssh_password"
                        type="password"
                        value={formData.vm_ssh_password}
                        onChange={handleChange}
                        required
                        minLength={8}
                        maxLength={16}
                        fullWidth
                    />

                    {/* 도메인 설정 섹션 */}
                    <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                            도메인 설정 (Domain Settings)
                        </label>
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '12px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                <input
                                    type="radio"
                                    name="domainType"
                                    checked={!useCustomDomain}
                                    onChange={() => setUseCustomDomain(false)}
                                    style={{ accentColor: 'var(--accent-primary)' }}
                                />
                                기본 도메인 (.anacnu.com)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                <input
                                    type="radio"
                                    name="domainType"
                                    checked={useCustomDomain}
                                    onChange={() => setUseCustomDomain(true)}
                                    style={{ accentColor: 'var(--accent-primary)' }}
                                />
                                커스텀 도메인 (Custom Domain)
                            </label>
                        </div>

                        <Input
                            label={useCustomDomain ? "전체 도메인 (Full Domain)" : "서브도메인 (Subdomain Prefix)"}
                            name="vm_host"
                            value={formData.vm_host}
                            onChange={handleChange}
                            placeholder={useCustomDomain ? "예: my.custom.domain.com" : "예: mysvc"}
                            required
                            fullWidth
                            style={{ marginBottom: '4px' }}
                        />
                        <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {useCustomDomain
                                ? "사용할 전체 도메인을 입력하세요. (CNAME 레코드가 설정되어 있어야 합니다)"
                                : `접속 주소: ${formData.vm_host || 'example'}.anacnu.com (자동 생성됨)`}
                        </small>

                        {useCustomDomain && (
                            <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--accent-warning)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                <strong>기술 지원 필요 (Technical Support Required)</strong><br />
                                커스텀 도메인 적용 및 HTTPS 인증서 설정을 위해서는 관리자의 수동 작업이 필요합니다.<br />
                                <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>010-3154-0982</span>로 문의하여 도메인과 인증서를 전달해 주시면,<br />
                                Traefik 및 Ingress Controller 설정을 지원해 드립니다.
                            </div>
                        )}
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                            OS 이미지 (OS Image)
                        </label>
                        <select
                            name="vm_image"
                            value={formData.vm_image}
                            onChange={handleChange}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)',
                                fontSize: '0.95rem'
                            }}
                        >
                            <option value="ubuntu-2204-gold-source">Ubuntu 22.04 LTS</option>
                            <option value="archlinux-latest">Arch Linux</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')} disabled={loading}>
                            취소
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? '생성 중...' : '프로비저닝 시작 (Provision)'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default CreateVMPage;
