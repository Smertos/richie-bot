import { randomInt } from "./number";

export function getRandomElement<T>(array: Array<T>): T {
    const randomIndex = randomInt(0, array.length - 1);
    return array[randomIndex];
}
