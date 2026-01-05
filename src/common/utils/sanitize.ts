export const Sanitizer = new class {
  public xssContent(input: string): string {
    input = `${input}`.replace(/&/g, "&amp;");
    input = input.replace(/</g, "&lt;");
    input = input.replace(/>/g, "&gt;");
    input = input.replace(/"/g, "&quot;");
    input = input.replace(/'/g, "&#x27;");
    input = input.replace(/\//g, "&#x2F;");
    return input;
  }

  public xssAttribute(input: string, quote: string = '"'): string {
    input = `${input}`;
    if (quote === '"') {
      return input.replace(/"/g, "&quot;");
    }
    return input.replace(/'/g, "&#x27;");
  }
};