# @collana-solutions/blueprint-zod-kit

## 0.1.0

### Minor Changes

- [`af515c1`](https://github.com/neolution-ch/csag-blueprint-react/commit/af515c12096b62d016ef6c27c4acb63b0ef7a111) - Initial release of the CSAG Blueprint React packages, extracted from
  [csag-blueprint-web](https://github.com/neolution-ch/csag-blueprint-web).
  
  Six packages, versioned in lockstep:
  
  - **blueprint-core** — RFC 9457 Problem Details vocabulary and the FastEndpoints
    validation-error parser.
  - **blueprint-i18n** — typed translation kit: context factory, client cache and ETag helpers,
    empty-translations recovery guard.
  - **blueprint-form-kit** — TanStack Form + Mantine + Zod form kit.
  - **blueprint-api-kit** — axios and TanStack Query plumbing, plus the Orval client factories.
  - **blueprint-zod-kit** — Zod v4 integration for a .NET backend.
  - **blueprint-theming** — white-label tenant theming.
  
  Everything these packages previously reached for inside the app is now injected by the
  consumer: the form kit takes its eight user-visible strings from a labels provider with
  English defaults, the zod kit declares its message shape structurally rather than importing a
  generated type, theming takes the base Mantine theme as a parameter, and the api kit exposes
  factories instead of module-level singletons.
