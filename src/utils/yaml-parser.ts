/**
 * Simple YAML parser for frontmatter extraction
 * Handles basic key-value pairs with improved edge case handling
 */

/**
 * Regex to extract YAML frontmatter from markdown
 */
export const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;

/**
 * Parse a simple YAML string into key-value pairs
 * Handles:
 * - Basic key: value pairs
 * - Quoted values (single and double quotes)
 * - Values containing colons
 * - Multi-line values (literal block scalar |)
 * - Inline arrays [item1, item2]
 *
 * @param yamlString - YAML content to parse
 * @returns Record of key-value pairs
 *
 * @example
 * ```typescript
 * const yaml = `
 * name: my-agent
 * version: "1.0.0"
 * description: 'A sample agent'
 * tools: [Read, Write, Bash]
 * note: "Contains: colon"
 * `;
 * const result = parseSimpleYaml(yaml);
 * // { name: 'my-agent', version: '1.0.0', description: 'A sample agent', tools: 'Read, Write, Bash', note: 'Contains: colon' }
 * ```
 */
export function parseSimpleYaml(yamlString: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = yamlString.split('\n');

  let currentKey: string | null = null;
  let multiLineValue: string[] = [];
  let inMultiLine = false;
  let multiLineIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and comments (unless in multi-line mode)
    if (!inMultiLine && (!trimmed || trimmed.startsWith('#'))) continue;

    // Handle multi-line continuation
    if (inMultiLine) {
      const lineIndent = line.search(/\S|$/);
      if (lineIndent > multiLineIndent || (trimmed === '' && i < lines.length - 1)) {
        // Continue multi-line value
        multiLineValue.push(line.slice(multiLineIndent + 2) || '');
        continue;
      } else {
        // End multi-line value
        if (currentKey) {
          result[currentKey] = multiLineValue.join('\n').trimEnd();
        }
        inMultiLine = false;
        multiLineValue = [];
        currentKey = null;
      }
    }

    // Find the first colon that's not inside quotes
    const colonIndex = findUnquotedColon(trimmed);
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();

    // Check for multi-line indicator (|)
    if (value === '|' || value === '|-' || value === '|+') {
      currentKey = key;
      inMultiLine = true;
      multiLineIndent = line.search(/\S|$/);
      multiLineValue = [];
      continue;
    }

    // Check for folded style (>)
    if (value === '>' || value === '>-' || value === '>+') {
      currentKey = key;
      inMultiLine = true;
      multiLineIndent = line.search(/\S|$/);
      multiLineValue = [];
      continue;
    }

    // Handle inline arrays [item1, item2] - only if contains comma (multiple items)
    // Single items like [placeholder] are kept as-is (common in argument hints)
    if (value.startsWith('[') && value.endsWith(']')) {
      const innerValue = value.slice(1, -1).trim();
      // Only convert to comma-separated string if it actually contains multiple items
      if (innerValue.includes(',')) {
        value = innerValue;
      }
      // Otherwise keep the brackets (e.g., [argument-name] is a placeholder, not an array)
    }

    // Remove surrounding quotes if present
    value = removeQuotes(value);

    result[key] = value;
  }

  // Handle case where multi-line ends at EOF
  if (inMultiLine && currentKey) {
    result[currentKey] = multiLineValue.join('\n').trimEnd();
  }

  return result;
}

/**
 * Find the index of the first colon that's not inside quotes
 */
function findUnquotedColon(str: string): number {
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const prevChar = i > 0 ? str[i - 1] : '';

    // Toggle quote states (ignore escaped quotes)
    if (char === "'" && !inDoubleQuote && prevChar !== '\\') {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && prevChar !== '\\') {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === ':' && !inSingleQuote && !inDoubleQuote) {
      return i;
    }
  }

  return -1;
}

/**
 * Remove surrounding quotes from a value
 */
function removeQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    // Also handle escaped quotes within the string
    return value
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");
  }
  return value;
}

/**
 * Extract frontmatter content from markdown
 *
 * @param content - Full markdown content
 * @returns Extracted YAML string or null if not found
 */
export function extractFrontmatter(content: string): string | null {
  const match = content.match(FRONTMATTER_REGEX);
  return match ? match[1] : null;
}
