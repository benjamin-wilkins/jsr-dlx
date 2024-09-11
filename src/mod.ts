#! /usr/bin/env node

import { parseArgs } from "jsr:@std/cli/parse-args"
import { args, spawn, exit, execPath } from "jsr:@cross/utils@0.16"
import { colorMe } from "jsr:@vef/color-me@1";

import { Resolver } from "./resolver.ts"
import { log } from "./log.ts"

const { _: [pkg, ...childArgs] } = parseArgs(args(), {
  stopEarly: true,
})

if (!pkg) {
  throw new TypeError("No package selected")
}

const resolver = new Resolver()
await resolver.ready

const entryPoint = await resolver.resolve(String(pkg))
await resolver.writeCache()

log("Running", colorMe.green(entryPoint))

await spawn(
  [execPath(), String(entryPoint), ...childArgs.map(String)],
  {},
  undefined,
  {stdin: "inherit", stdout: "inherit", stderr: "inherit"}
)

exit()
