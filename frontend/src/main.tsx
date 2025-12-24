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
                    // Configure wallet settings for Movement chain support
                    // Movement is a Tier 2 chain that uses Aptos standards
                    embeddedWallets: {
                        createOnLogin: 'users-without-wallets',
                        requireUserPasswordOnCreate: false,
                        // Enable Movement chain support
                        // Note: Movement wallets need to be created with chain type 'movement'
                        // This is handled via Privy's wallet creation API
                    },
                }}
            >
                <App />
            </PrivyProvider>
        ) : (
            <div className="flex justify-center items-center h-screen flex-col p-5 text-center bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                <h1 className="mb-5 text-2xl font-bold">⚠️ Privy App ID Required</h1>
                <p className="mb-5 max-w-2xl">
                    Please set up your Privy App ID to use wallet authentication.
                </p>
                <ol className="text-left max-w-2xl mb-5 list-decimal list-inside space-y-2">
                    <li>Go to <a href="https://dashboard.privy.io" target="_blank" rel="noopener noreferrer" className="text-white underline">Privy Dashboard</a> and create an app</li>
                    <li>Copy your App ID (starts with 'cl...')</li>
                    <li>Create a <code className="bg-white/20 px-1 py-0.5 rounded">.env</code> file in the frontend directory</li>
                    <li>Add: <code className="bg-white/20 px-1 py-0.5 rounded">VITE_PRIVY_APP_ID=your_app_id_here</code></li>
                    <li>Restart the dev server</li>
                </ol>
                <p className="text-sm opacity-80">
                    See <code className="bg-white/20 px-1 py-0.5 rounded">PRIVY_SETUP.md</code> for detailed instructions
                </p>
            </div>
        )}
    </React.StrictMode>,
)

