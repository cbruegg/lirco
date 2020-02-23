export function sleep(ms: number): Promise<void> {
  // return Promise.resolve();
  return new Promise<void>(resolve =>
    setTimeout(() => {
      console.log('Finished sleeping');
      resolve();
    }, ms),
  );
}
