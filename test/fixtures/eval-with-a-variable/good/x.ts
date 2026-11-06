export function run(x: string) {
  eval("1 + 1");
  setTimeout(() => console.log(x), 10);
  setTimeout(handler, 10);
  JSON.parse(x);
}
declare const handler: () => void;
