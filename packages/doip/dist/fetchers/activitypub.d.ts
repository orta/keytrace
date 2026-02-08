export interface ActivityPubActor {
    id: string;
    type: string;
    preferredUsername?: string;
    name?: string;
    summary?: string;
    attachment?: Array<{
        type: string;
        name?: string;
        value?: string;
    }>;
    attributedTo?: string;
}
export interface ActivityPubFetchOptions {
    timeout?: number;
}
/**
 * Fetch an ActivityPub actor document
 */
export declare function fetchActor(uri: string, options?: ActivityPubFetchOptions): Promise<ActivityPubActor>;
/**
 * Fetch data from an ActivityPub URL (alias for http fetch with AP headers)
 */
export declare function fetch(uri: string, options?: ActivityPubFetchOptions): Promise<unknown>;
//# sourceMappingURL=activitypub.d.ts.map