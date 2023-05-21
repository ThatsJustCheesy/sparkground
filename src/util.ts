export function callEach<Arg>(
  ...fns: ((arg: Arg) => void)[]
): (arg: Arg) => void {
  return (arg: Arg) => {
    fns.forEach((fn) => fn(arg));
  };
}
