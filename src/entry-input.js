export function formatBirthDate(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join('.');
}

export function formatBirthInput(input) {
  const before = input.value;
  const digitsBeforeCaret = before.slice(0, input.selectionStart ?? before.length).replace(/\D/g, '').length;
  input.value = formatBirthDate(before);
  let caret = 0, digits = 0;
  while (caret < input.value.length && digits < digitsBeforeCaret) {
    if (/\d/.test(input.value[caret])) digits++;
    caret++;
  }
  input.setSelectionRange(caret, caret);
}
