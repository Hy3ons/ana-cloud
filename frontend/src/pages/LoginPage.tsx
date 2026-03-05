import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

const LoginPage: React.FC = () => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(studentId, password);
      navigate('/dashboard');
    } catch {
      setError('로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <Card style={styles.card} title="ANACLOUD 로그인">
        <form onSubmit={handleSubmit} style={styles.form}>
          <Input 
            label="학번 (Student ID)" 
            value={studentId} 
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="20201234"
            required
            fullWidth
          />
          <Input 
            label="비밀번호 (Password)" 
            type="password"
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            required
            fullWidth
          />
          
          {error && <div style={styles.error}>{error}</div>}
          
          <Button 
            type="submit" 
            fullWidth 
            size="lg" 
            disabled={isLoading}
            style={{ marginTop: '16px' }}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </Button>

          <div style={styles.footer}>
            계정이 없으신가요? <Link to="/register" style={{ marginLeft: '4px' }}>회원가입</Link>
          </div>
        </form>
      </Card>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-primary)',
  },
  card: {
    width: '400px',
    maxWidth: '90%',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  error: {
    color: 'var(--accent-error)',
    fontSize: '0.9rem',
    marginBottom: '8px',
    textAlign: 'center',
  },
  footer: {
    marginTop: '16px',
    textAlign: 'center',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
  }
};

export default LoginPage;
