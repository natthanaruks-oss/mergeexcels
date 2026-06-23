# Security Notes

## Current controls

- Client-side file processing; application code does not upload user files to an application server.
- CSP restricts default resources and blocks object embedding / framing.
- PDF.js uses `isEvalSupported: false` and a same-origin worker.
- Cloudflare release checks reject internal package registries and invalid asset paths.

## Open dependency item: SheetJS

The project currently uses the public npm package `xlsx@0.18.5` and its committed standalone browser build.
Automated audit reports known High-severity advisories for crafted spreadsheet inputs.

Target remediation: migrate to the official SheetJS CE 0.20.3 vendored build and rerun all Excel regression tests before production sign-off.
Do not replace the library with an unverified third-party republish merely to silence the audit warning.

Until remediation is completed:

- Use files from trusted business sources.
- Avoid opening unknown or unsolicited spreadsheet files.
- Keep browser memory/file-size limits under review for large workbooks.

## Large-file processing controls

- Menu 08 reads and writes spreadsheets in a same-origin Web Worker.
- Source `ArrayBuffer` objects are transferred to the Worker to reduce duplicate memory retention.
- The UI does not render tens of thousands of spreadsheet rows.
- Analysis warns when estimated data cells or input size indicate elevated memory risk.
- Cancellation terminates the Worker; the source file is never modified.
- Integrity Report checks that every source data cell selected for output was copied.
