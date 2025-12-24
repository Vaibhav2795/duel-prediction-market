// Polymarket-inspired design tokens - Dark theme with bold accents

export const colors = {
	// Core background colors
	bg: {
		primary: "#0d0d0d",
		secondary: "#141414",
		tertiary: "#1a1a1a",
		card: "#1f1f1f",
		cardHover: "#262626",
		elevated: "#2a2a2a",
		input: "#1a1a1a",
		overlay: "rgba(0, 0, 0, 0.8)",
	},
	
	// Text colors
	text: {
		primary: "#ffffff",
		secondary: "#a1a1a1",
		tertiary: "#6b6b6b",
		muted: "#4a4a4a",
		inverse: "#0d0d0d",
	},
	
	// Accent colors
	accent: {
		primary: "#00d26a",
		primaryHover: "#00b85c",
		secondary: "#3b82f6",
		secondaryHover: "#2563eb",
	},
	
	// Outcome colors
	outcome: {
		yes: "#00d26a",
		yesHover: "#00b85c",
		yesBg: "rgba(0, 210, 106, 0.1)",
		no: "#ff4757",
		noHover: "#e84049",
		noBg: "rgba(255, 71, 87, 0.1)",
	},
	
	// Status colors
	status: {
		active: "#00d26a",
		activeBg: "rgba(0, 210, 106, 0.15)",
		ending: "#fbbf24",
		endingBg: "rgba(251, 191, 36, 0.15)",
		resolved: "#3b82f6",
		resolvedBg: "rgba(59, 130, 246, 0.15)",
		live: "#ff4757",
		liveBg: "rgba(255, 71, 87, 0.15)",
	},
	
	// Border colors
	border: {
		primary: "#2a2a2a",
		secondary: "#3a3a3a",
		focus: "#00d26a",
		subtle: "#1f1f1f",
	},
	
	// Gradient presets
	gradients: {
		primaryButton: "linear-gradient(135deg, #00d26a 0%, #00b85c 100%)",
		card: "linear-gradient(180deg, #1f1f1f 0%, #1a1a1a 100%)",
		hero: "linear-gradient(180deg, #141414 0%, #0d0d0d 100%)",
	},
	
	// Semantic colors
	success: "#00d26a",
	warning: "#fbbf24",
	error: "#ff4757",
	info: "#3b82f6",
};

export const typography = {
	// Font families
	fontFamily: {
		sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
		mono: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
	},
	
	// Font sizes
	fontSize: {
		xs: "0.75rem",    // 12px
		sm: "0.875rem",   // 14px
		base: "1rem",     // 16px
		lg: "1.125rem",   // 18px
		xl: "1.25rem",    // 20px
		"2xl": "1.5rem",  // 24px
		"3xl": "1.875rem", // 30px
		"4xl": "2.25rem", // 36px
		"5xl": "3rem",    // 48px
	},
	
	// Font weights
	fontWeight: {
		normal: 400,
		medium: 500,
		semibold: 600,
		bold: 700,
	},
	
	// Line heights
	lineHeight: {
		tight: 1.25,
		base: 1.5,
		relaxed: 1.75,
	},
};

export const spacing = {
	xs: "0.25rem",  // 4px
	sm: "0.5rem",   // 8px
	md: "1rem",     // 16px
	lg: "1.5rem",   // 24px
	xl: "2rem",     // 32px
	"2xl": "3rem",  // 48px
	"3xl": "4rem",  // 64px
};

export const borderRadius = {
	none: "0",
	sm: "0.25rem",  // 4px
	md: "0.5rem",   // 8px
	lg: "0.75rem",  // 12px
	xl: "1rem",     // 16px
	full: "9999px",
};

export const shadows = {
	sm: "0 1px 2px rgba(0, 0, 0, 0.3)",
	md: "0 4px 6px rgba(0, 0, 0, 0.4)",
	lg: "0 10px 15px rgba(0, 0, 0, 0.5)",
	xl: "0 20px 25px rgba(0, 0, 0, 0.6)",
	card: "0 2px 8px rgba(0, 0, 0, 0.3)",
	cardHover: "0 8px 24px rgba(0, 0, 0, 0.5)",
	input: "0 0 0 2px rgba(0, 210, 106, 0.3)",
};

export const transitions = {
	fast: "all 0.15s ease",
	base: "all 0.2s ease",
	slow: "all 0.3s ease",
	spring: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
};

export const breakpoints = {
	sm: "640px",
	md: "768px",
	lg: "1024px",
	xl: "1280px",
	"2xl": "1536px",
};

export const zIndex = {
	dropdown: 100,
	sticky: 200,
	modal: 300,
	popover: 400,
	tooltip: 500,
};

// Utility function to format currency
export const formatCurrency = (amount: number, currency = "USD"): string => {
	if (amount >= 1_000_000) {
		return `$${(amount / 1_000_000).toFixed(1)}M`;
	}
	if (amount >= 1_000) {
		return `$${(amount / 1_000).toFixed(1)}K`;
	}
	return `$${amount.toFixed(2)}`;
};

// Utility function to format probability
export const formatProbability = (prob: number): string => {
	return `${Math.round(prob)}%`;
};

// Utility function to format address
export const formatAddress = (address: string): string => {
	if (address.length <= 10) return address;
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Utility function to format time remaining
export const formatTimeRemaining = (endTime: string | Date): string => {
	const end = new Date(endTime);
	const now = new Date();
	const diff = end.getTime() - now.getTime();
	
	if (diff < 0) return "Ended";
	
	const days = Math.floor(diff / (1000 * 60 * 60 * 24));
	const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
	const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
	
	if (days > 0) return `${days}d ${hours}h`;
	if (hours > 0) return `${hours}h ${minutes}m`;
	return `${minutes}m`;
};

