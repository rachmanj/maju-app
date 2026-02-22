import { describe, it, expect } from 'vitest';
import { generateAccountNumber } from '../savings-account-number';

describe('generateAccountNumber', () => {
  it('formats POKOK account: SAVP + member_id_6 + urutan_2', () => {
    expect(generateAccountNumber(4, 'POKOK', 1)).toBe('SAVP00000401');
    expect(generateAccountNumber(1, 'POKOK', 1)).toBe('SAVP00000101');
  });

  it('formats WAJIB account: SAVW + member_id_6 + urutan_2', () => {
    expect(generateAccountNumber(4, 'WAJIB', 1)).toBe('SAVW00000401');
  });

  it('formats SUKARELA account: SAVS + member_id_6 + urutan_2', () => {
    expect(generateAccountNumber(4, 'SUKARELA', 1)).toBe('SAVS00000401');
  });

  it('pads member_id to 6 digits', () => {
    expect(generateAccountNumber(123, 'POKOK', 1)).toBe('SAVP00012301');
    expect(generateAccountNumber(123456, 'POKOK', 1)).toBe('SAVP12345601');
  });

  it('pads sequence to 2 digits', () => {
    expect(generateAccountNumber(4, 'POKOK', 1)).toBe('SAVP00000401');
    expect(generateAccountNumber(4, 'POKOK', 10)).toBe('SAVP00000410');
  });

  it('falls back to first char for unknown type', () => {
    expect(generateAccountNumber(4, 'OTHER', 1)).toBe('SAVO00000401');
  });
});
