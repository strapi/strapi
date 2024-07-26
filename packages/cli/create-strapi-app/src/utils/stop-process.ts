export function stopProcess(message?: string): never {
  if (message) {
    console.error(message);
  }

  process.exit(1);
}
