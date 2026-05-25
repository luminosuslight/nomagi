If the dev server needs to be refreshed, restart the existing `git-notes-client-dev` systemd service instead of starting another `npm run dev`.

Editable fields (`input`, `textarea`, contenteditable editors, etc.) must use a font size of at least 16px on all breakpoints. Smaller sizes cause iOS Safari to zoom in when the field is focused. Do not use `text-sm`, `text-xs`, or responsive downgrades like `md:text-sm` on editable elements.
