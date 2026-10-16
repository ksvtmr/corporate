// Bundles every namespace file of this locale into a single lazily loaded chunk.
import type { Messages } from '@/kit/i18n/core';

const files = import.meta.glob<Messages>('./*.json', { eager: true, import: 'default' });
const catalogue: Messages = {};
for (const [path, messages] of Object.entries(files)) catalogue[path.slice(2, -5)] = messages;

export default catalogue;
