declare const el: HTMLElement; declare const user: { bio: string };
export function f(name: string) {
  el.innerHTML = `<b>${name}</b>`;
  el.insertAdjacentHTML("beforeend", name);
  document.write(name);
}
