export function Waiter(timeMS: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, timeMS);
  });
}