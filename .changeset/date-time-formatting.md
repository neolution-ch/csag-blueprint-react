---
'@collana-solutions/blueprint-i18n': minor
'@collana-solutions/blueprint-form-kit': minor
---

Format and edit dates and times by what kind of value they are, in the UI language, with no
shift from the browser's time zone.

**Breaking: `DateTimeInputField` holds a local reading.** The field stores and accepts
`YYYY-MM-DDTHH:mm:ss`, a clock reading with no offset, and the server resolves it against the
place's time zone. It used to append the browser's offset for *today*, so a booking made on
21 October for 26 October 10:00 in Zurich was sent as `+02:00` and stored as 09:00 once the
clocks had changed.

To migrate a `field.DateTimeInput`:

- Change the property behind it to a local reading (a `DateTime` in the C# DTO, declared in
  the OpenAPI document as `format: local-date-time` rather than `date-time`) and resolve it
  against the tenant's zone on the server. Regenerate the client, so the generated zod schema
  stops demanding an offset.
- A value that still arrives with an offset or `Z` is read as the instant it is, shown as the
  viewer's clock reading, and left untouched until the user picks a new value; the next change
  emits a local reading. In development (`setDevMode(true)`) the field warns once.
- If the property must stay an instant, render your own field over `useFieldContext` until it
  can move. Do not add the offset back on the client: the browser cannot know the place's zone.

**Date and time formatters in `blueprint-i18n`.** `formatInstant`, `formatPlaceTime`,
`formatDate`, `formatTimeOfDay`, `formatDuration`, `formatDateRange`, `todayAt` and
`viewerTimeZone`, all on `Intl`, each taking the locale explicitly. `DateTimeFormatProvider`
takes the tenant's zone as the default place zone, and `useDateTimeFormat()` returns the
formatters bound to it and to the language of the nearest `TranslationProvider`, which now
publishes that language for them. The bound `formatPlaceTime` takes an optional `placeZone` for
a place that carries its own zone (a stand at a fair abroad); omitted or `undefined`, the
default applies. A place time is shown as written and labelled with the place zone's short name
only for a viewer in another zone. A value whose date part is `0001-01-01`, the .NET default for an
unassigned date, formats as empty; any other value of the wrong kind is returned unchanged.

**`DateInputField` follows the locale.** The default `valueFormat` is the `DatesProvider`
locale's numeric date (`DD.MM.YYYY` for de-CH, `MM/DD/YYYY` for en-US) instead of a fixed
`DD.MM.YYYY`, and typed input is parsed with whatever format is shown, including one you pass.
The parser no longer accepts an incomplete or impossible date such as `31.02.2026`. The kit
loads dayjs's `customParseFormat` plugin itself, so an app's own `dayjs.extend` call becomes
redundant (keeping it is harmless). `DateTimeInputField` shows its date the same way and uses
the locale's 12- or 24-hour clock.

**New `TimeInputField`**, registered as `field.TimeInput`: a Mantine `TimePicker` holding
`HH:mm:ss`, the format System.Text.Json writes for a `TimeOnly`, on the locale's 12- or
24-hour clock.
