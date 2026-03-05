import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    studentId: '',
    password: '',
    name: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await register(formData);
      alert('회원가입이 완료되었습니다! 로그인해주세요.');
      navigate('/login');
    } catch (err: unknown) {
      console.error(err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorMessage = (err as any)?.response?.data?.message || '회원가입에 실패했습니다.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
     <div style={styles.container}>
      <Card style={styles.card} title="ANACLOUD 회원가입">
        <form onSubmit={handleSubmit} style={styles.form}>
           <Input 
            label="학번 (Student ID)" 
            name="studentId"
            value={formData.studentId} 
            onChange={handleChange}
            placeholder="20201234"
            required
            fullWidth
          />
          <Input 
            label="이름 (Name)" 
            name="name"
            value={formData.name} 
            onChange={handleChange}
            placeholder="홍길동"
            required
            fullWidth
          />
          <Input 
            label="이메일 (Email)" 
            name="email"
            type="email"
            value={formData.email} 
            onChange={handleChange}
            placeholder="example@univ.ac.kr"
            required
            fullWidth
          />
          <Input 
            label="비밀번호 (Password)" 
            name="password"
            type="password"
            value={formData.password} 
            onChange={handleChange}
            placeholder="비밀번호 입력"
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
            {isLoading ? '가입 중...' : '가입하기'}
          </Button>

          <div style={styles.footer}>
            이미 계정이 있으신가요? <Link to="/login" style={{ marginLeft: '4px' }}>로그인</Link>
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
    width: '450px',
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

export default RegisterPage;
