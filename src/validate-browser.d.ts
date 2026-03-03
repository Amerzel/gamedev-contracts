/**
 * Validate data against a named contract schema.
 * @param schemaName - Schema name, e.g. "resolved_map.v1"
 * @param data - The data to validate
 * @returns Validation result with boolean `valid` and `errors` array
 */
export declare function validate(schemaName: string, data: unknown): {
  valid: boolean;
  errors: string[];
};

/**
 * List all available schema names.
 * @returns Array of schema names (e.g. ["resolved_map.v1", "level_intent.v1", ...])
 */
export declare function listSchemas(): string[];

/**
 * Get the raw JSON Schema object for a given schema name.
 * @param schemaName - Schema name, e.g. "resolved_map.v1"
 * @returns The JSON Schema object, or undefined if not found
 */
export declare function getSchema(schemaName: string): object | undefined;
