#! /usr/bin/env node

import { parseArgs } from "jsr:@std/cli/parse-args"
import { which } from "jsr:@cross/fs@^0.1"
import { args, spawn, exit } from "jsr:@cross/utils@^0.15"
import { colorMe } from "jsr:@vef/color-me";

import { Resolver } from "./resolver.ts"
import { log } from "./log.ts"

const { _: [pkg] } = parseArgs(args())

if (!pkg) {
  throw new TypeError("No package selected")
}

const resolver = new Resolver()
await resolver.ready

const entryPoint = await resolver.resolve(String(pkg))
await resolver.writeCache()

log("Running", colorMe.brightCyan(entryPoint), "from", colorMe.brightCyan(String(pkg)))

const { code } = await spawn(
  [await which("node") ?? "node", String(entryPoint)],
  {},
  undefined,
  {stdin: "inherit", stdout: "inherit", stderr: "inherit"}
)

if (code != 0) throw new Error(`A critical error occured. There is likely more information above.`)

exit()
