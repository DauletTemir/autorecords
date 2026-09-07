# Security

## Vulnerability log

Dependency vulnerabilities found via `npm audit`, and how they were fixed.
Each entry is recorded here before the fix is applied.

### 2026-09-06 — backend transitive dependencies (5 vulnerabilities)

Found via `npm audit` in `backend/` while adding an unrelated dependency
(`heic-convert` for HEIC/HEIF photo support) — these were pre-existing,
not introduced by that change.

| Package | Introduced via | Severity | Advisory | Vulnerable range | Fixed version |
|---|---|---|---|---|---|
| brace-expansion | `googleapis` → `gaxios` → `rimraf` → `glob` → `minimatch` | High | [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) (CVE-2026-69152) | `>=2.0.0 <2.1.4` | 2.1.4 |
| ip-address | `express-rate-limit` | High | [GHSA-mwp4-54f8-5fhr](https://github.com/advisories/GHSA-mwp4-54f8-5fhr) + 2 related (CVE-2026-69192) | `<=10.3.0` | 10.3.1 |
| nanoid | `vitest` → `vite` → `postcss` (dev only) | High | [GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) (CVE-2026-67214) | `<3.3.16` | 3.3.16 |
| postcss | `vitest` → `vite` (dev only) | High | [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) (CVE-2026-73646) | `<=8.5.17` | 8.5.18 |
| qs | `express`, `supertest` (dev) | Moderate | [GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g) (CVE-2026-82417) | `>=2.2.5 <6.16.0` | 6.16.0 |

**What each is:**
- `brace-expansion` — DoS: unbounded intermediate arrays could crash the
  process or freeze the event loop on crafted input. Not attacker-reachable
  in our usage (only touched by `googleapis`' internal tooling deps), but
  fixed regardless since it's a no-op upgrade.
- `ip-address` — SSRF/trust-boundary bypass via zero-padded IP octets
  (`010.010.010.010` parsed as decimal instead of octal). Used internally
  by `express-rate-limit`'s IPv6-safe key generator (`ipKeyGenerator`) —
  low real-world exposure here since we don't parse untrusted IP strings
  ourselves, but fixed since it's the library doing the parsing on our
  behalf on every request.
- `nanoid` / `postcss` — dev-only (`vitest`'s Vite dependency chain), not
  present in the production bundle or `dist/`. Fixed for hygiene.
- `qs` — DoS via a crafted query string causing `qs.stringify()` to throw.
  Only reachable via `express`/`supertest`'s own internal use, not our
  routes directly (we don't accept complex nested query objects anywhere).

**Fix:** `npm audit fix` in `backend/` — all five have a fix available
without needing `--force` or a major version bump of any direct dependency.

**Breaking change check:** `ip-address` 10.3.1 rejects zero-padded IP
octets that older versions accepted. We don't feed IP strings into it
ourselves (only `express-rate-limit` does, internally, from `req.ip`,
which Express normalizes and never zero-pads) — no behavior change
expected for this app.

**Fixed:** 2026-09-06, backend only. Verified with `npm audit` (0 vulnerabilities
of these severities afterward) and the full backend test suite (46/46 passing).
