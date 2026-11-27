// Exercise the actual forms rather than bypassing the entry gate in tests.
export async function finishEntryPreview(evaluate, { nickname = '공간 확인', avatar = 0 } = {}) {
  if (!(await evaluate('Boolean(document.getElementById("entry-root"))'))) return;
  await evaluate(`(() => {
    const form = document.querySelector('.entry-card');
    form.elements.email.value = 'preview@example.com';
    form.elements.password.value = 'ui-preview-only';
    form.requestSubmit();
    return true;
  })()`);
  await evaluate(`(() => {
    const form = document.querySelector('.entry-card');
    form.elements.name.value = '미리보기'; form.elements.birth.value = '2000.01.01'; form.elements.phone.value = '01012345678'; form.elements.code.value = '123456';
    form.requestSubmit(); return true;
  })()`);
  const deadline = Date.now() + 30000;
  while (!(await evaluate('document.querySelector(".entry-card")?.dataset.step === "avatar"'))) {
    if (Date.now() > deadline) throw new Error('아바타 준비 시간 초과');
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  await evaluate(`(() => {
    for (let i = 0; i < ${avatar}; i++) document.querySelector('[data-action="next-avatar"]').click();
    document.querySelector('.entry-card').requestSubmit(); return true;
  })()`);
  await evaluate(`(() => {
    const form = document.querySelector('.entry-card'); form.elements.nickname.value = ${JSON.stringify(nickname)};
    form.requestSubmit(); document.querySelector('.entry-card').requestSubmit(); return true;
  })()`);
}
