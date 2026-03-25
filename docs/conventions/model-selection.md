# Model selection & provenance

When calling models (LLMs/VLMs) or external APIs, record enough detail to reproduce:

- model/provider name (and version if applicable),
- purpose (what the call is for),
- inputs/constraints that materially affect outputs,
- and where outputs are stored.

If a result is sensitive to model choice, prefer an empirical check rather than assuming capability.

