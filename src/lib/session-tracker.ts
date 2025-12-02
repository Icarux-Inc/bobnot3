interface RecentPage {
    id: string;
    title: string;
    lastEditedAt: number;
    editCount: number;
}

const STORAGE_KEY = 'bobnot3:recentPages';
const MAX_RECENT_PAGES = 10;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Client-side session tracker for recently edited pages
 * Stores in localStorage for persistence across sessions
 */
export class SessionTracker {
    /**
     * Add or update a page edit
     */
    addPageEdit(pageId: string, title: string): void {
        const recent = this.getAll();
        const existing = recent.find(p => p.id === pageId);

        if (existing) {
            existing.lastEditedAt = Date.now();
            existing.editCount++;
            existing.title = title; // Update title in case it changed
        } else {
            recent.push({
                id: pageId,
                title,
                lastEditedAt: Date.now(),
                editCount: 1
            });
        }

        // Sort by last edited (most recent first)
        recent.sort((a, b) => b.lastEditedAt - a.lastEditedAt);

        // Keep only the most recent N pages
        const trimmed = recent.slice(0, MAX_RECENT_PAGES);

        this.save(trimmed);
    }

    /**
     * Get recent pages (most recent first)
     */
    getRecentPages(limit: number = 5): RecentPage[] {
        this.clearOldEntries();
        const recent = this.getAll();
        return recent.slice(0, limit);
    }

    /**
     * Clear entries older than maxAgeMs
     */
    clearOldEntries(maxAgeMs: number = MAX_AGE_MS): void {
        const recent = this.getAll();
        const now = Date.now();
        const filtered = recent.filter(p => now - p.lastEditedAt < maxAgeMs);

        if (filtered.length !== recent.length) {
            this.save(filtered);
        }
    }

    /**
     * Clear all recent pages
     */
    clear(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    /**
     * Get all recent pages from storage
     */
    private getAll(): RecentPage[] {
        if (typeof window === 'undefined') return [];

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return [];

            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Failed to parse recent pages:', error);
            return [];
        }
    }

    /**
     * Save recent pages to storage
     */
    private save(pages: RecentPage[]): void {
        if (typeof window === 'undefined') return;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
        } catch (error) {
            console.error('Failed to save recent pages:', error);
        }
    }
}

// Export singleton instance
export const sessionTracker = new SessionTracker();
