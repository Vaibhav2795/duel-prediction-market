import { useState, useEffect, useMemo } from "react";
import type { Market, MarketStatus, MarketCategory, MarketFilters } from "../types/game";
import { MarketCard, MarketCardSkeleton } from "../components/MarketCard";
import { PageContainer } from "../components/Layout";
import { formatCurrency } from "../styles/designTokens";

interface BrowsePageProps {
	markets: Market[];
	stats?: {
		totalMarkets: number;
		activeMarkets: number;
		totalVolume: number;
		volume24h: number;
	};
	isLoading?: boolean;
	onMarketClick: (marketId: string) => void;
	onQuickBet?: (marketId: string, outcome: "white" | "black" | "draw", side: "yes" | "no") => void;
	searchValue?: string;
	onSearchChange?: (value: string) => void;
}

export function BrowsePage({
	markets,
	stats,
	isLoading = false,
	onMarketClick,
	onQuickBet,
	searchValue = "",
	onSearchChange
}: BrowsePageProps) {
	const [filters, setFilters] = useState<MarketFilters>({
		status: "all",
		category: "all",
		sortBy: "volume"
	});
	const [displayCount, setDisplayCount] = useState(12);

	// Filter and sort markets
	const filteredMarkets = useMemo(() => {
		let result = [...markets];

		// Search filter
		if (searchValue) {
			const search = searchValue.toLowerCase();
			result = result.filter(m =>
				m.title.toLowerCase().includes(search) ||
				m.description.toLowerCase().includes(search) ||
				m.playerWhite?.displayName?.toLowerCase().includes(search) ||
				m.playerBlack?.displayName?.toLowerCase().includes(search)
			);
		}

		// Status filter
		if (filters.status && filters.status !== "all") {
			result = result.filter(m => m.status === filters.status);
		}

		// Category filter
		if (filters.category && filters.category !== "all") {
			result = result.filter(m => m.category === filters.category);
		}

		// Sort
		switch (filters.sortBy) {
			case "volume":
				result.sort((a, b) => b.totalVolume - a.totalVolume);
				break;
			case "newest":
				result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
				break;
			case "ending":
				result.sort((a, b) => {
					if (!a.endTime) return 1;
					if (!b.endTime) return -1;
					return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
				});
				break;
		}

		return result;
	}, [markets, filters, searchValue]);

	const displayedMarkets = filteredMarkets.slice(0, displayCount);
	const hasMore = displayCount < filteredMarkets.length;

	// Load more on scroll
	useEffect(() => {
		const handleScroll = () => {
			if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
				if (hasMore && !isLoading) {
					setDisplayCount(prev => prev + 8);
				}
			}
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [hasMore, isLoading]);

	const statusOptions: { value: MarketStatus | "all"; label: string }[] = [
		{ value: "all", label: "All Status" },
		{ value: "active", label: "Active" },
		{ value: "ended", label: "Ending Soon" },
		{ value: "resolved", label: "Resolved" },
	];

	const categoryOptions: { value: MarketCategory | "all"; label: string }[] = [
		{ value: "all", label: "All Categories" },
		{ value: "live", label: "🔴 Live" },
		{ value: "competitive", label: "🏆 Competitive" },
		{ value: "casual", label: "🎮 Casual" },
		{ value: "tournament", label: "👑 Tournament" },
	];

	const sortOptions: { value: "volume" | "newest" | "ending"; label: string }[] = [
		{ value: "volume", label: "Highest Volume" },
		{ value: "newest", label: "Newest" },
		{ value: "ending", label: "Ending Soon" },
	];

	return (
		<PageContainer>
			{/* Stats Banner */}
			{stats && (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
					<div className="bg-dark-200 rounded-xl p-4 border border-border">
						<div className="text-sm text-text-tertiary mb-1">Total Volume</div>
						<div className="text-2xl font-bold text-text-primary">{formatCurrency(stats.totalVolume)}</div>
					</div>
					<div className="bg-dark-200 rounded-xl p-4 border border-border">
						<div className="text-sm text-text-tertiary mb-1">24h Volume</div>
						<div className="text-2xl font-bold text-accent">{formatCurrency(stats.volume24h)}</div>
					</div>
					<div className="bg-dark-200 rounded-xl p-4 border border-border">
						<div className="text-sm text-text-tertiary mb-1">Active Markets</div>
						<div className="text-2xl font-bold text-text-primary">{stats.activeMarkets}</div>
					</div>
					<div className="bg-dark-200 rounded-xl p-4 border border-border">
						<div className="text-sm text-text-tertiary mb-1">Total Markets</div>
						<div className="text-2xl font-bold text-text-primary">{stats.totalMarkets}</div>
					</div>
				</div>
			)}

			{/* Page Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
				<div>
					<h1 className="text-2xl font-bold text-text-primary mb-1">Browse Markets</h1>
					<p className="text-text-secondary">
						{filteredMarkets.length} market{filteredMarkets.length !== 1 ? "s" : ""} available
					</p>
				</div>

				{/* Mobile Search */}
				<div className="md:hidden relative">
					<svg
						className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<input
						type="text"
						placeholder="Search markets..."
						value={searchValue}
						onChange={(e) => onSearchChange?.(e.target.value)}
						className="w-full pl-10 pr-4 py-3 bg-dark-300 border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent"
					/>
				</div>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap gap-3 mb-6">
				{/* Status Filter */}
				<select
					value={filters.status}
					onChange={(e) => setFilters(f => ({ ...f, status: e.target.value as MarketStatus | "all" }))}
					className="px-4 py-2.5 bg-dark-200 border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent cursor-pointer"
				>
					{statusOptions.map(opt => (
						<option key={opt.value} value={opt.value}>{opt.label}</option>
					))}
				</select>

				{/* Category Filter */}
				<select
					value={filters.category}
					onChange={(e) => setFilters(f => ({ ...f, category: e.target.value as MarketCategory | "all" }))}
					className="px-4 py-2.5 bg-dark-200 border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent cursor-pointer"
				>
					{categoryOptions.map(opt => (
						<option key={opt.value} value={opt.value}>{opt.label}</option>
					))}
				</select>

				{/* Sort */}
				<select
					value={filters.sortBy}
					onChange={(e) => setFilters(f => ({ ...f, sortBy: e.target.value as "volume" | "newest" | "ending" }))}
					className="px-4 py-2.5 bg-dark-200 border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent cursor-pointer"
				>
					{sortOptions.map(opt => (
						<option key={opt.value} value={opt.value}>{opt.label}</option>
					))}
				</select>

				{/* Clear Filters */}
				{(filters.status !== "all" || filters.category !== "all" || searchValue) && (
					<button
						onClick={() => {
							setFilters({ status: "all", category: "all", sortBy: "volume" });
							onSearchChange?.("");
						}}
						className="px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
					>
						Clear filters
					</button>
				)}
			</div>

			{/* Category Pills */}
			<div className="flex gap-2 overflow-x-auto pb-4 mb-6 -mx-4 px-4 md:mx-0 md:px-0">
				{categoryOptions.map(cat => (
					<button
						key={cat.value}
						onClick={() => setFilters(f => ({ ...f, category: cat.value }))}
						className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
							filters.category === cat.value
								? "bg-accent text-dark-500"
								: "bg-dark-200 text-text-secondary hover:bg-dark-100 hover:text-text-primary"
						}`}
					>
						{cat.label}
					</button>
				))}
			</div>

			{/* Markets Grid */}
			{isLoading ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{Array.from({ length: 6 }).map((_, i) => (
						<MarketCardSkeleton key={i} />
					))}
				</div>
			) : filteredMarkets.length === 0 ? (
				<div className="text-center py-16">
					<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-200 flex items-center justify-center">
						<svg className="w-8 h-8 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<h3 className="text-lg font-semibold text-text-primary mb-2">No markets found</h3>
					<p className="text-text-tertiary mb-4">Try adjusting your filters or search query</p>
					<button
						onClick={() => {
							setFilters({ status: "all", category: "all", sortBy: "volume" });
							onSearchChange?.("");
						}}
						className="btn btn-secondary"
					>
						Clear all filters
					</button>
				</div>
			) : (
				<>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{displayedMarkets.map((market) => (
							<MarketCard
								key={market.id}
								market={market}
								onClick={() => onMarketClick(market.id)}
								onQuickBet={onQuickBet ? (outcome, side) => onQuickBet(market.id, outcome, side) : undefined}
							/>
						))}
					</div>

					{/* Load More */}
					{hasMore && (
						<div className="text-center mt-8">
							<button
								onClick={() => setDisplayCount(prev => prev + 8)}
								className="btn btn-secondary px-8"
							>
								Load More ({filteredMarkets.length - displayCount} remaining)
							</button>
						</div>
					)}
				</>
			)}
		</PageContainer>
	);
}

