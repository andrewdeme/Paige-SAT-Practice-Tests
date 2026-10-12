# Working agreements

Tickets are GitHub Issues. The full flow is in [docs/TICKETS.md](docs/TICKETS.md).

- Work starts from a ticket. For anything beyond a trivial fix, if the request
  has no ticket, open one with the matching form (`type:` and `area:` labels)
  and tell the user its number.
- Use the branch the session assigns; otherwise `<type>/<issue#>-<slug>`.
- Open a PR only when asked. Its base is `dev`, and its body has `Closes #N`.
- Never close tickets or delete branches by hand. Merging into `dev` does both
  (`.github/workflows/close-tickets-on-dev.yml`).
- Before pushing code, run `npm run lint` and `npm run build`.
