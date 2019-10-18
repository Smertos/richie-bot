export function randomFloat(from: number, to: number): number {
    return Math.random() * (to - from) + from;
}

export function randomInt(from: number, to: number): number {
    return Math.round(randomFloat(from, to));
}
