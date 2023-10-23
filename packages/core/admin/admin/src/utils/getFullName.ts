export function getFullName(firstname: string, lastname: string | null = '') {
  return [firstname, lastname].filter((str) => str).join(' ');
}
