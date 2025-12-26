import { useState } from 'react';
import { createUser, type User } from '../services/userService';

interface UserRegistrationProps {
	walletAddress: string;
	onUserCreated: (user: User) => void;
	onError?: (error: string) => void;
}

export default function UserRegistration({ walletAddress, onUserCreated, onError }: UserRegistrationProps) {
	const [userName, setUserName] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!userName.trim()) {
			onError?.('Please enter a user name');
			return;
		}

		setLoading(true);
		try {
			const user = await createUser({
				walletAddress,
				userName: userName.trim(),
			});
			onUserCreated(user);
		} catch (error: any) {
			// Handle 409 (user already exists) gracefully
			if (error.message.includes('409') || error.message.includes('already exists')) {
				// User already exists, try to fetch their info
				try {
					const { getUserByWallet } = await import('../services/userService');
					const existingUser = await getUserByWallet(walletAddress);
					if (existingUser) {
						onUserCreated(existingUser);
						return;
					}
				} catch (fetchError) {
					// If we can't fetch, show error
					onError?.('User already exists. Please refresh the page.');
				}
			} else {
				onError?.(error.message || 'Failed to create user');
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="bg-dark-300 border border-border rounded-xl p-6 max-w-md mx-auto">
			<h2 className="text-xl font-bold text-text-primary mb-4">Register Your Account</h2>
			<p className="text-text-secondary text-sm mb-6">
				Create your profile to start playing chess matches and betting on prediction markets.
			</p>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label className="block mb-2 text-sm font-medium text-text-secondary">
						Wallet Address
					</label>
					<input
						type="text"
						value={walletAddress}
						disabled
						className="w-full px-4 py-2 bg-dark-200 border border-border rounded-lg text-text-tertiary cursor-not-allowed"
					/>
				</div>
				<div>
					<label className="block mb-2 text-sm font-medium text-text-secondary">
						User Name *
					</label>
					<input
						type="text"
						value={userName}
						onChange={(e) => setUserName(e.target.value)}
						placeholder="Enter your display name"
						required
						maxLength={50}
						className="w-full px-4 py-3 bg-dark-300 border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent focus:shadow-input"
					/>
				</div>
				<button
					type="submit"
					disabled={loading || !userName.trim()}
					className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
						loading || !userName.trim()
							? 'bg-gray-600 cursor-not-allowed text-gray-400'
							: 'bg-accent hover:bg-accent-hover text-white cursor-pointer'
					}`}
				>
					{loading ? 'Creating Account...' : 'Create Account'}
				</button>
			</form>
		</div>
	);
}

