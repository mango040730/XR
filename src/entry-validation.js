const requiredMessages = {
  email: '이메일을 입력해 주세요.', password: '비밀번호를 입력해 주세요.',
  name: '이름을 입력해 주세요.', birth: '생년월일을 입력해 주세요.',
  phone: '전화번호를 입력해 주세요.', code: '인증번호를 입력해 주세요.',
  nickname: '닉네임을 입력해 주세요.', 'location-search': '검색할 동네나 주소를 입력해 주세요.',
};

export function fieldError(input, { required = input.required, today = new Date() } = {}) {
  const value = input.value.trim(), name = input.name;
  if (!value) return required ? requiredMessages[name] ?? '이 항목을 입력해 주세요.' : '';
  if (name === 'email' && (input.validity?.typeMismatch || !/^[^\s@]+@[^\s@]+$/.test(value))) return '올바른 이메일 형식으로 입력해 주세요.';
  if (input.maxLength > 0 && input.value.length > input.maxLength) return `${input.maxLength}자 이내로 입력해 주세요.`;
  if (name === 'birth') {
    if (!/^\d{4}\.\d{2}\.\d{2}$/.test(value)) return '생년월일을 YYYY.MM.DD 형식으로 입력해 주세요.';
    const [y, m, d] = value.split('.').map(Number), date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d || date > today) return '올바른 생년월일을 입력해 주세요.';
  }
  if (name === 'phone' && (!/^\+?[\d\s()-]+$/.test(value) || !/^\d{9,15}$/.test(value.replace(/\D/g, '')))) return '전화번호를 숫자 9~15자리로 입력해 주세요.';
  if (name === 'code' && !/^\d{6}$/.test(value)) return '인증번호를 숫자 6자리로 입력해 주세요.';
  return '';
}

export function showFieldError(input, message) {
  const error = input.closest('.entry-field')?.querySelector('.entry-field-error');
  if (!error) return;
  error.textContent = message; error.hidden = !message;
  input.setAttribute('aria-invalid', String(Boolean(message)));
  if (message) input.setAttribute('aria-describedby', error.id); else input.removeAttribute('aria-describedby');
  const form = input.closest('form');
  form?.classList.toggle('has-field-errors', Boolean(form.querySelector('[data-entry-input][aria-invalid="true"]:not([name="location-search"])')));
}
export function validateField(input, options) {
  const message = fieldError(input, options); showFieldError(input, message); return !message;
}
export function validateEntryForm(form) {
  let first;
  for (const input of form.querySelectorAll('[data-entry-input]:not([name="location-search"])')) {
    if (input.disabled || input.closest('[hidden]')) continue;
    if (!validateField(input)) first ??= input;
  }
  first?.focus({ preventScroll: true });
  first?.scrollIntoView({ block: 'nearest' });
  return !first;
}
