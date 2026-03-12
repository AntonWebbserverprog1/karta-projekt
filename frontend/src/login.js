import React, { useState } from 'react';
import api from '../api'; // Importera din förkonfigurerade api-klient

const Auth = ({ onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const endpoint = isLogin ? '/auth/login' : '/auth/register';

        try {
            const res = await api.post(endpoint, formData);
            
            if (isLogin) {
                // Spara token i webbläsaren
                localStorage.setItem('token', res.data.token);
                // Berätta för App.js att vi är klara!
                onLoginSuccess();
            } else {
                setMessage("Konto skapat! Du kan nu logga in.");
                setIsLogin(true);
            }
        } catch (err) {
            setMessage(err.response?.data?.error || "Ett fel uppstod");
        }
    };

    return (
        <div style={{ maxWidth: '350px', margin: '100px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h2>{isLogin ? 'Logga in' : 'Registrera dig'}</h2>
            <form onSubmit={handleSubmit}>
                <input 
                    type="text" 
                    placeholder="Användarnamn" 
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
                    required
                />
                <input 
                    type="password" 
                    placeholder="Lösenord" 
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
                    required
                />
                <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}>
                    {isLogin ? 'Logga in' : 'Skapa konto'}
                </button>
            </form>
            
            {message && <p style={{ color: 'blue', marginTop: '10px' }}>{message}</p>}
            
            <button 
                onClick={() => setIsLogin(!isLogin)} 
                style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', marginTop: '15px' }}
            >
                {isLogin ? 'Inget konto? Registrera här' : 'Har du redan ett konto? Logga in'}
            </button>
        </div>
    );
};

export default Auth;