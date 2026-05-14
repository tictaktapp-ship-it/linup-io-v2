export interface ValidationResult {
    passed: boolean;
    errors: string[];
}
export declare function validate(memberId: string, content: string): Promise<ValidationResult>;
export declare function registerMemberSections(memberId: string, sections: string[]): void;
//# sourceMappingURL=schema.d.ts.map