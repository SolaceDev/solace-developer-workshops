# Skill asset templates

A skill's `assets/` directory can ship more than static files. An asset paired
with a sibling `<name>.template.yaml` sidecar becomes a **template**: the agent
fills its `@@KEY@@` placeholders and the `instantiate_skill_asset` tool validates
and saves it, leaving the embeds and Liquid to render live each time the artifact
is downloaded. An asset with no sidecar is copied verbatim. This lets a
hand-authored skill repo ship report and document templates with no generation
code, and it is one of the larger token-efficiency levers in SAM (the model
produces only the data; the template engine renders the document).

The on-disk shape:

```text
skills/
  <name>/
    assets/
      report.html             # the asset (verbatim copy if it has no sidecar)
      report.template.yaml     # sidecar — makes report.html a template
```

The sidecar's three sections (`template`, `substitutions`, `data_inputs`), the
closed-set `@@KEY@@` substitution rules, the `data_inputs` JSON-Schema / CSV
`columns` data contract, the fail-closed validation behavior, and a full
`quarterly_report` worked example are documented once in the customer docs —
**do not restate them here**:

- **Asset templates** — https://solacedev.github.io/solace-agent-mesh-go/documentation/building/skills#asset-templates

Author the `.template.yaml` sidecar and the matching `@@KEY@@` tokens / embeds in
the asset body following that page; everything else about the `skills/<name>/`
bundle is in `references/skill.md`.
