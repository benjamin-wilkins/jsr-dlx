// npx esbuild ./src/main.ts --bundle --platform=node --format=esm --external:@std/* --external:@cross/* | node --input-type=module - [PACKAGE]

import { parseArgs } from "jsr:@std/cli/parse-args"
import { which } from "jsr:@cross/fs"
import { args, spawn, exit } from "jsr:@cross/utils"

import { Resolver } from "./resolver.ts"

const { _: [pkg] } = parseArgs(args())

if (!pkg) {
  throw new TypeError("No package selected")
}

const resolver = new Resolver()
await resolver.ready

const entryPoint = await resolver.resolve(String(pkg))
await resolver.writeCache()

console.log(`Running ${pkg}`)
console.log(`$ node ${entryPoint}`)

const { code } = await spawn(
  [await which("node") ?? "node", String(entryPoint)],
  {},
  undefined,
  {stdin: "inherit", stdout: "inherit", stderr: "inherit"}
)

if (code != 0) throw new Error(`A critical error occured. There is likely more information above.`)

exit()