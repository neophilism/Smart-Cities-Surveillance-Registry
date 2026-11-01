export const PDF_MAX_BYTES = 25 * 1024 * 1024;
export const PDF_MAX_PAGES = 500;
export const PDF_MAX_TEXT_CHARACTERS = 5_000_000;

export function assertPdfBudget(bytes: number, pages = 0, textCharacters = 0): void {
  if (![bytes, pages, textCharacters].every((value) => Number.isSafeInteger(value) && value >= 0)) {
    throw new Error("PDF extraction resource counts are invalid.");
  }
  if (bytes > PDF_MAX_BYTES) throw new Error("PDF attachment exceeds the 25 MiB extraction limit.");
  if (pages > PDF_MAX_PAGES) throw new Error("PDF attachment exceeds the 500-page extraction limit.");
  if (textCharacters > PDF_MAX_TEXT_CHARACTERS) throw new Error("PDF attachment exceeds the extracted-text limit.");
}
