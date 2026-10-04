export type TemplateVariables = Readonly<Record<string, string>>;

const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

/**
 * Replaces `{name}` placeholders with values. Unknown placeholders are left as written so a
 * typo is visible to the admin instead of silently disappearing. Substitution is single-pass:
 * a value that itself contains `{server}` is not expanded again.
 */
export function renderTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(PLACEHOLDER_PATTERN, (placeholder, name: string) =>
    Object.hasOwn(variables, name) ? (variables[name] ?? placeholder) : placeholder,
  );
}
