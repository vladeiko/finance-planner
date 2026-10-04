import { expect, test } from 'vitest';
import { emptyDocument, SCHEMA_VERSION } from './document';
import { validateDocument } from './validate';

test('пустой документ текущей версии проходит проверку', () => {
  const doc = emptyDocument();
  expect(doc.schemaVersion).toBe(SCHEMA_VERSION);
  expect(validateDocument(doc)).toEqual(doc);
});

test('каждый вызов — новый объект', () => {
  const a = emptyDocument();
  a.accounts.push({
    id: 'x',
    updatedAt: 't',
    name: 'X',
    kind: 'simple',
    role: 'regular',
    order: 0,
  });
  expect(emptyDocument().accounts).toEqual([]);
});
