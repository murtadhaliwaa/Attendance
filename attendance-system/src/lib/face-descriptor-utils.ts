const SEED_EMPLOYEE_COUNT = 88;

function generateSeedFaceDescriptor(seed: number): number[] {
  const descriptor: number[] = [];
  for (let i = 0; i < 128; i++) {
    descriptor.push(Math.sin(seed * (i + 1) * 0.13) * 0.5);
  }
  const magnitude = Math.sqrt(
    descriptor.reduce((sum, value) => sum + value * value, 0)
  );
  return descriptor.map((value) => value / magnitude);
}

export function isSeedFakeDescriptor(descriptor: number[]): boolean {
  if (descriptor.length !== 128) return false;

  for (let seed = 1; seed <= SEED_EMPLOYEE_COUNT; seed++) {
    const fake = generateSeedFaceDescriptor(seed);
    let matches = true;
    for (let i = 0; i < 128; i++) {
      if (Math.abs(descriptor[i] - fake[i]) > 0.0001) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }

  return false;
}

export function hasRealFaceDescriptor(descriptor: number[]): boolean {
  return descriptor.length === 128 && !isSeedFakeDescriptor(descriptor);
}
