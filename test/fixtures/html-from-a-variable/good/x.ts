declare const el: HTMLElement; declare function esc(s: string): string;
export function f(name: string, items: string[]) {
  el.innerHTML = "<b>static</b>";
  el.innerHTML = `<b>${esc(name)}</b> ${items.length} ${Math.round(2.4)}`;
  el.textContent = name;
}
