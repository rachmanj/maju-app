const SAVINGS_TYPE_LETTER: Record<string, string> = {
  POKOK: 'P',
  WAJIB: 'W',
  SUKARELA: 'S',
};

export function generateAccountNumber(memberId: number, typeCode: string, sequence: number): string {
  const letter = SAVINGS_TYPE_LETTER[typeCode] ?? typeCode.charAt(0);
  return `SAV${letter}${memberId.toString().padStart(6, '0')}${sequence.toString().padStart(2, '0')}`;
}
