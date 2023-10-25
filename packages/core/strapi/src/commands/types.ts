import type { Command } from 'commander';

export type StrapiCommand = (params: { command: Command; argv: string[] }) => void;
