# @collana-solutions/blueprint-api-kit

Axios and TanStack Query plumbing for an ASP.NET backend that speaks Problem Details: rich
error notifications, a preconfigured QueryClient, and the two Orval client factories.

Part of [csag-blueprint-react](https://github.com/neolution-ch/csag-blueprint-react). All
packages in that repository are released in lockstep — install them at the same version.

## Install

```bash
pnpm add @collana-solutions/blueprint-api-kit
pnpm add react axios @tanstack/react-query @mantine/core @mantine/notifications lucide-react
```

## Quick start

Orval requires its mutator to be a local file path, so keep a thin module that calls the
factory and re-exports the mutator:

```ts
// src/orval-react-query-instance.ts
import { createOrvalQueryClient } from '@collana-solutions/blueprint-api-kit'

const { mutator } = createOrvalQueryClient({
    inlineUnauthorizedPaths: ['/api/auth/login', '/api/auth/mfa/login'],
})

export default mutator
```

## API

| Export                       | Kind     | What it does                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createBlueprintQueryClient` | factory  | A `QueryClient` that toasts query and mutation errors, skips 401s (the interceptor owns those), and does not retry 4xx. Suppress per call with `meta: { suppressToast: true }`.                                                                                                                                                                             |
| `createOrvalQueryClient`     | factory  | Axios instance for the React Query output. 401-only interceptor; the mutator normalizes errors to `ProblemDetails` so the type matches what Orval generates. `inlineUnauthorizedPaths` marks endpoints where a 401 is a domain answer the screen shows inline — a wrong TOTP code must not bounce to the login page and drop the pending two-factor cookie. |
| `createOrvalAxiosClient`     | factory  | Axios instance for the raw axios output. Handles every error, so imperative calls get the same UX as hooks.                                                                                                                                                                                                                                                 |
| `configureGlobalAxios`       | function | CSRF defaults and a response interceptor on the axios module singleton, for direct calls that bypass React Query.                                                                                                                                                                                                                                           |
| `showErrorNotification`      | function | Mantine notification carrying the trace id, with copy-to-clipboard.                                                                                                                                                                                                                                                                                         |
| `useSessionExpiryWatcher`    | hook     | From the `/session` subpath. Detects a server-side expiry when the tab regains focus. Deliberately no polling: a periodic authenticated ping would keep renewing a sliding session and defeat the idle timeout it exists to surface. Takes `checkSession` as an argument, since that request is generated from your own spec.                               |

Importing this package augments the axios request config with `__suppressToast` and
`__suppressAuthRedirect`, and the React Query `Register` interface with the `suppressToast`
meta key.

## License

MIT
