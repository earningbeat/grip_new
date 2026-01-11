import fs from 'fs';
import path from 'path';

interface ProcessingState {
    cycleId: string;
    pending: string[];
    completed: string[];
    lastUpdated: string;
}

const STATE_FILE = path.join(process.cwd(), 'data', 'processing-state.json');

export class ProgressTracker {
    private state: ProcessingState | null = null;

    constructor(private cycleId: string) {
        this.loadState();
    }

    private loadState() {
        if (fs.existsSync(STATE_FILE)) {
            try {
                const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
                // If the cycleId matches, resume. Otherwise, we'll start fresh.
                if (data.cycleId === this.cycleId) {
                    this.state = data;
                }
            } catch (error) {
                console.error('[ProgressTracker] Failed to load state:', error);
            }
        }
    }

    public initialize(allSymbols: string[]) {
        // If we have an existing state for the same cycle, don't re-initialize
        if (this.state && this.state.cycleId === this.cycleId) {
            console.log(`[ProgressTracker] Resuming cycle ${this.cycleId}. ${this.state.pending.length} pending, ${this.state.completed.length} completed.`);
            return;
        }

        this.state = {
            cycleId: this.cycleId,
            pending: allSymbols,
            completed: [],
            lastUpdated: new Date().toISOString()
        };
        this.saveState();
        console.log(`[ProgressTracker] Initialized new cycle ${this.cycleId} with ${allSymbols.length} symbols.`);
    }

    public getNextBatch(batchSize: number): string[] {
        if (!this.state) return [];
        return this.state.pending.slice(0, batchSize);
    }

    public markAsCompleted(symbols: string[]) {
        if (!this.state) return;

        const symbolSet = new Set(symbols);
        this.state.pending = this.state.pending.filter(s => !symbolSet.has(s));
        this.state.completed.push(...symbols);
        this.state.lastUpdated = new Date().toISOString();
        this.saveState();
    }

    public isComplete(): boolean {
        return !this.state || this.state.pending.length === 0;
    }

    public getProgress() {
        if (!this.state) return { pending: 0, completed: 0, total: 0 };
        return {
            pending: this.state.pending.length,
            completed: this.state.completed.length,
            total: this.state.pending.length + this.state.completed.length
        };
    }

    private saveState() {
        if (!this.state) return;
        try {
            const dataDir = path.dirname(STATE_FILE);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
        } catch (error) {
            console.error('[ProgressTracker] Failed to save state:', error);
        }
    }
}
