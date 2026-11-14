# POD Production Ready Quality Gate

Branch-only specification. No production change, merge, deploy, publishing or ad-spend authority is granted by this file.

## Separate feature status

Treat these independently:

- **Mockup generation:** keep as its own feature and preserve the current working path while repairs occur elsewhere.
- **Original artwork generation:** requires quality improvement before it can be marked production-ready.

A technically successful API response is not a quality pass.

## Minimum Production Ready gate

Every generated artwork asset must pass all critical checks before receiving `Production Ready` status.

Critical checks:

1. Prompt match
2. Composition / subject placement
3. Product-safe aspect ratio
4. Minimum pixel dimensions for selected product
5. Print resolution suitability
6. No accidental crop or border
7. No obvious generation artefacts
8. No gibberish or malformed text
9. No unwanted watermark or signature
10. Clean enough edges/details for the intended product
11. Usable contrast and colour separation
12. Background suitability for the selected product
13. Product fit / printable safe area

## Pipeline

**Generate → Quality Check → Reject/Regenerate below threshold → Print-Safe Check → Mockup → Final Review**

The generator should automatically regenerate when a critical rule fails rather than returning a green success state solely because an image exists.

## Scoring

Record separate scores for:

- prompt fidelity;
- composition;
- detail;
- print readiness;
- artefacts;
- text quality;
- background suitability;
- product fit.

Critical-rule failure overrides the aggregate score.

## Regression protection

Repairs to original artwork generation must not silently alter the mockup pipeline. Mockup and artwork E2E tests should run separately so a failing artwork model does not obscure a working mockup feature.

## Manager Hub reporting

Expose at least:

- Artwork generation: Pass / Partial / Fail / Blocked
- Quality gate: Pass / Fail
- Print-safe gate: Pass / Fail
- Mockup generation: Pass / Partial / Fail / Blocked
- Final review state

Only the completed gate may display `Production Ready`.
