import { SupabaseClient } from '@supabase/supabase-js';
export interface AdrRecord {
    number: string;
    slug: string;
    content: string;
}
export interface EnvFiles {
    frontend: string;
    backend: string;
    example: string;
}
export declare function generateSpecPdf(projectId: string, stages: number[], db: SupabaseClient): Promise<Buffer>;
export declare function generateAppPackageZip(projectId: string, db: SupabaseClient): Promise<Buffer>;
export declare function uploadAndRecord(projectId: string, zipBuffer: Buffer, db: SupabaseClient): Promise<string>;
//# sourceMappingURL=zip-generator.d.ts.map