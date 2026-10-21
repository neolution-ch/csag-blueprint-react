---
'@collana-solutions/blueprint-core': patch
'@collana-solutions/blueprint-form-kit': patch
'@collana-solutions/blueprint-api-kit': patch
---

Title refused requests differently from server failures, and show the server's reasons in the
error toast.

**The form banner no longer calls every refusal a "Server error".** `<form.ServerErrorAlert />`
used one title for everything it showed, so a wrong password, a double booking or an invalid
two-factor code all read "Server error". It now uses the new `requestRejected` label ("Could not
complete the request") for a 4xx, and keeps `serverError` for a 5xx or a request that got no
response. Everything `useSchemaForm` maps onto the form is a 4xx, so those banners change title
with no code change. An app that catches a server answer itself can pass the status beside the
message, `form.setErrorMap({ onServer: { form: message, status: error.status } })`, and gets the
`serverError` title for a 5xx. Add `requestRejected` to the labels you hand
`FormKitLabelsProvider`; until you do, the English default is used.

**The error toast shows why a request was refused.** When FastEndpoints refuses a request with
more than one reason it sends no `detail`, so the toast showed only the title "Bad Request". The
body now falls back from `detail` to the reasons in `errors` — deduplicated, one per line — before
the title, and reads the RFC 9457 `{ field: [messages] }` dictionary as well as the FastEndpoints
array. The copied error details include those reasons. A 4xx toast is titled with the new
`rejectedTitle` label ("Could not complete the request"); 5xx and network failures keep `title`
("Something went wrong"). Pass `rejectedTitle` to `setErrorNotificationLabels` to localize it.

The reason extraction is exported from `blueprint-core` as `collectErrorReasons`, for an app that
builds its own messages from a Problem Details body.
