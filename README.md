# jsr-dlx

[![NPM](https://img.shields.io/npm/v/jsr-dlx)](https://npmjs.com/package/jsr-dlx)

A basic utility for runnning JSR packages under Node or Bun on the command line. Based on both
of `yarn dlx` and `deno run`.

```sh
npx jsr-dlx [PACKAGE] [ARGS?]
bunx --bun jsr-dlx [PACKAGE] [ARGS?]
```

Essentially, `jsr-dlx` calls `npx jsr` or `bunx jsr` to install the package into a temporary
directory, and holds a reference to it in the user's cache directory. After this, it tries to
figure out the entry point of the package and run it using the same runtime it was called with.
When `jsr-dlx` is called again, it checks the cache file and checks if the directory exists. If it
does, `jsr-dlx` skips the install step.