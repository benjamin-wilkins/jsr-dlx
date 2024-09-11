import { colorMe } from "jsr:@vef/color-me"

export function log(...args: unknown[]): void {
  console.log(colorMe.bgBlue("[jsr-dlx]"), ...args)
}