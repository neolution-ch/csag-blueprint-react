// Side-effect entry point: `import '@collana-solutions/blueprint-zod-kit/install'` applies
// the Orval stringFormat polyfill and registers the error map, in that order. Import it
// once from the app entry point, before any generated schema module.
import { applyStringFormatPatch } from './string-format-patch'
import { installZodErrorMap } from './error-map'

applyStringFormatPatch()
installZodErrorMap()
