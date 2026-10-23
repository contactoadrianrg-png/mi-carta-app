import { createImportHandler } from './handler.mjs'

// The provider key is read only from Edge Function secrets, never from frontend env.
Deno.serve(createImportHandler({ env: name => Deno.env.get(name), fetchImpl: fetch }))
