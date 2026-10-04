import { describe, expect, test } from 'vitest';
import { exportDocument, exportFileName, importDocument } from './exportImport';
import { sampleDocument } from './testFixtures';

describe('экспорт / импорт', () => {
  test('экспортированный документ импортируется обратно', () => {
    expect(importDocument(exportDocument(sampleDocument()))).toEqual(sampleDocument());
  });

  test('экспорт читаем человеком', () => {
    expect(exportDocument(sampleDocument())).toContain('\n  "accounts": [');
  });

  test('имя файла с датой', () => {
    expect(exportFileName('2026-10-04')).toBe('finance-planner-2026-10-04.json');
  });

  test('не JSON — invalid', () => {
    expect(() => importDocument('<html>')).toThrow(expect.objectContaining({ code: 'invalid' }));
  });

  test('чужой JSON — invalid', () => {
    expect(() => importDocument('{"hello":"world"}')).toThrow(
      expect.objectContaining({ code: 'invalid' }),
    );
  });

  test('бэкап от более новой версии — newer-version', () => {
    const text = JSON.stringify({ ...sampleDocument(), schemaVersion: 99 });
    expect(() => importDocument(text)).toThrow(expect.objectContaining({ code: 'newer-version' }));
  });
});
