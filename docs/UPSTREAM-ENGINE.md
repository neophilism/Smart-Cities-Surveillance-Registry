# Upstream Engine

This repository was bootstrapped from the clean, domain-neutral
[Civic Registry & Transparency Engine](https://github.com/neophilism/Civic-Registry-Transparency-Engine).

Initial upstream commit:

```text
49bd3248dc976c6a56fbd2db949ad579579787dd
```

That commit includes the core-purity cleanup which removed named downstream
applications from the engine repository.

## Sync policy

The Smart Cities application does not depend on the upstream repository at
runtime. It carries the engine packages locally so releases remain
self-contained and reproducible.

Future upstream changes should be reviewed deliberately:

1. identify a generic upstream change worth adopting;
2. port or merge it without overwriting Smart Cities application code;
3. run the complete local CI suite;
4. update `UPSTREAM_ENGINE_COMMIT` when the downstream snapshot is advanced;
5. document any intentionally divergent engine behavior.

Application-specific features should not be pushed upstream unless they are
first generalized into reusable civic infrastructure.
