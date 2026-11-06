export function run(code: string, x: string) {
  eval(code);
  new Function("a", "return a + " + x);
  setTimeout("tick(" + x + ")", 10);
}
