import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import App from './App.tsx';
import './index.css';

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID;

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        {PRIVY_APP_ID ? (
            <PrivyProvider
                appId={PRIVY_APP_ID}
                config={{
                    loginMethods: ['wallet', 'email', 'sms'],
                    appearance: {
                        theme: 'light',
                        accentColor: '#667eea',
                    },
                }}
            >
                <App />
            </PrivyProvider>
        ) : (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column',
                padding: '20px',
                textAlign: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
            }}>
                <h1 style={{ marginBottom: '20px' }}>⚠️ Privy App ID Required</h1>
                <p style={{ marginBottom: '20px', maxWidth: '600px' }}>
                    Please set up your Privy App ID to use wallet authentication.
                </p>
                <ol style={{ textAlign: 'left', maxWidth: '600px', marginBottom: '20px' }}>
                    <li>Go to <a href="https://dashboard.privy.io" target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'underline' }}>Privy Dashboard</a> and create an app</li>
                    <li>Copy your App ID (starts with 'cl...')</li>
                    <li>Create a <code>.env</code> file in the frontend directory</li>
                    <li>Add: <code>VITE_PRIVY_APP_ID=your_app_id_here</code></li>
                    <li>Restart the dev server</li>
                </ol>
                <p style={{ fontSize: '14px', opacity: 0.8 }}>
                    See <code>PRIVY_SETUP.md</code> for detailed instructions
                </p>
            </div>
        )}
    </React.StrictMode>,
)

