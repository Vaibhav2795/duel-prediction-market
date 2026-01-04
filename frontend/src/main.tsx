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
                        loginMethods: ['email'],
                        appearance: {
                            theme: 'dark',
                            accentColor: '#00d26a',
                        },
                    }}
                >
                <App />
            </PrivyProvider>
        ) : (
            <div className="flex justify-center items-center min-h-screen flex-col p-5 text-center bg-[#0d0d0d]">
                <div className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-2xl p-8 max-w-lg">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#00d26a]/10 flex items-center justify-center">
                        <span className="text-3xl">♟️</span>
                    </div>
                    <h1 className="mb-4 text-2xl font-bold text-white">ChessBet Setup Required</h1>
                    <p className="mb-6 text-[#a1a1a1]">
                        Please set up your Privy App ID to enable user authentication.
                    </p>
                    <ol className="text-left mb-6 list-decimal list-inside space-y-3 text-[#a1a1a1]">
                        <li>Go to <a href="https://dashboard.privy.io" target="_blank" rel="noopener noreferrer" className="text-[#00d26a] underline hover:text-[#00b85c]">Privy Dashboard</a> and create an app</li>
                        <li>Copy your App ID</li>
                        <li>Create a <code className="bg-[#141414] px-2 py-0.5 rounded text-white">.env</code> file in frontend directory</li>
                        <li>Add: <code className="bg-[#141414] px-2 py-0.5 rounded text-[#00d26a]">VITE_PRIVY_APP_ID=your_id</code></li>
                        <li>Restart the dev server</li>
                    </ol>
                </div>
            </div>
        )}
    </React.StrictMode>,
)

