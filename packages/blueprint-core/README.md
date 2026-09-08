# @collana-solutions/blueprint-core

RFC 9457 Problem Details vocabulary and the FastEndpoints validation-error parser. No React,
no Mantine — this is the shared kernel the other packages build on, and it exists so the form
kit can understand a 400 body without taking on the query and notification stack.

Part of [csag-blueprint-react](https://github.com/neolution-ch/csag-blueprint-react). All
packages in that repository are released in lockstep — install them at the same version.

## Install

```bash
pnpm add @collana-solutions/blueprint-core
pnpm add axios
```

## API

| Export               | Kind     | What it does                                                                                                                                                                                                                         |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ProblemDetails`     | type     | The RFC 9457 shape ASP.NET Core returns.                                                                                                                                                                                             |
| `isProblemDetails`   | function | Type guard — checks for an object with a numeric `status`.                                                                                                                                                                           |
| `toProblemDetails`   | function | Normalizes an `AxiosError` (network failure or non-ProblemDetails response) into the same shape, so consumers only ever see one type.                                                                                                |
| `ParsedServerErrors` | type     | `{ fieldErrors, formErrors }`.                                                                                                                                                                                                       |
| `parseServerErrors`  | function | Maps a FastEndpoints `errors` array onto field- and form-level errors. Handles any 4xx, not just 400: AddError-driven refusals arrive as 409 or 404 with the same body, and a form that only mapped 400 would swallow them silently. |

## License

MIT
