import {vi} from "vitest";

export function createMockLogger() {

    return {
        log: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        debug: vi.fn(),
        verbose: vi.fn(),
        engineLog: vi.fn(),
        engineDebug: vi.fn(),
        engineVerbose: vi.fn(),
        setDebug: vi.fn(),
        setVerbose: vi.fn()
    }
}