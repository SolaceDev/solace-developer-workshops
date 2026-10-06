# Solace Core Developer Workshop

A hands-on introduction to event-driven architecture on the Solace Broker. A
short practice run on the dashboard itself, then nine sections, each one a
working system you run, break and inspect: a broker configuration tour,
publish and subscribe, the five patterns from the Real-Time Data Deep Dives
series, and two capstones that compose them.

Everything runs in a container. There is nothing to install and no account to
create.

<p align="center">
  <a href="https://codespaces.new/SolaceDev/solace-developer-workshops/tree/core-workshops?quickstart=1">
    <img src="https://github.com/codespaces/badge.svg" alt="Open in GitHub Codespaces" width="600">
  </a>
</p>

## Getting started

Open the repository in a Codespace with the button above, or locally in VS
Code with the Dev Containers extension (**Reopen in Container**). Either way
the container installs Go and Terraform, starts a Solace broker in Docker,
and opens the Solace Workshop Dashboard on port 3000.

First build takes a few minutes, mostly pulling the broker image. When it
finishes, start at [Getting started](guides/00-getting-started.md).

## Sections

| # | Section | What it covers |
| --- | --- | --- |
| 00 | [Getting started](guides/00-getting-started.md) | A practice run: Play, Break it, On the broker and Broker Manager |
| 10 | [Tour the broker](guides/10-broker-tour.md) | Queues, client profiles, ACL profiles |
| 20 | [Publish and subscribe](guides/20-pub-sub.md) | Topic hierarchies, wildcards, access control |
| 30 | [Fan-out](guides/30-fan-out.md) | One event, many independent consumers |
| 40 | [Shock absorber](guides/40-shock-absorber.md) | Absorbing a surge, competing consumers, redelivery, partitions |
| 50 | [Processor](guides/50-processor.md) | Consume, transform, republish |
| 60 | [Command and query](guides/60-cqrs.md) | Read models, and commands that survive a device being offline |
| 70 | [Streaming](guides/70-streaming.md) | A stateful rule applied to data in motion |
| 80 | [Surviving the Arrival](guides/80-capstone-arrival.md) | Capstone: absorber, partitions and fan-out together |
| 90 | [Smart Shelf Pricing](guides/90-capstone-smart-shelf.md) | Capstone: streaming plus a read model that suppresses no-op writes |
| 99 | [Cleanup](guides/99-cleanup.md) | Tearing it down |

## What you get in the container

| Thing | Where |
| --- | --- |
| Solace Workshop Dashboard | Port 3000 (the **Ports** tab in a Codespace, <http://localhost:3000> locally) |
| Solace Broker Manager | Port 8080, `admin` / `admin`, or the link in the dashboard sidebar |
| Broker messaging (SMF) | `localhost:55555` |
| Solace Broker | Docker container `solace_10.8.1` |

Also installed: Go with a C toolchain (the Solace Go API wraps the native
client library), Terraform with the Solace broker provider, Python for the
dashboard, and the Solace Try-Me VS Code extension for poking at topics by
hand.

## How it fits together

```
Browser (port 3000)
     |
FastAPI dashboard ── scenarios/<id>/scenario.yaml   what the section does
     |               scenarios/<id>/tf/*.tf         broker configuration
     |               apps/                          one Go binary, all roles
     v
terraform + Go apps  ──>  Solace broker
```

- **`cockpit/`** is the control surface. Scenarios are data: a folder with a
  `scenario.yaml`, terraform for its broker configuration, and a diagram
  description. Adding a section means adding a folder.
- **`cockpit/apps/`** is one Go module producing one binary, invoked as
  `workshop <scenario> <role>`. The Solace Go API links the native client
  through cgo, so one binary keeps the build to a single link step.
- **`guides/`** is the written material, one file per section.

`cockpit/README.md` has the details, including how to add a scenario of your
own.

## Running an app by hand

The dashboard runs commands you can also run yourself:

```bash
bash cockpit/apps/run.sh pubsub subscribe \
  --role baggage --user svc-acme-air-baggage --sub "acme/air/baggage/>"
```

Connection details come from the environment, with defaults matching
`setup_broker.sh`, so this reaches the same broker the dashboard uses.

To check everything still lines up after editing a scenario:

```bash
python3 cockpit/scripts/check_scenarios.py
```

## Repository layout

```
cockpit/           the Solace Workshop Dashboard
  apps/            Go applications, one module and one binary
  scenarios/       one folder per section: scenario.yaml + tf/
  scripts/         shared reconcile and validation helpers
guides/            the written workshop
samples/           Solace API samples for several languages (submodules)
util/              Codespace registration
setup_broker.sh    starts the broker in Docker
```

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md) explains how the setup works behind the
scenes, how scenarios are defined and run, and how to add, reorder, rename or
remove scenarios for a particular workshop. [CLAUDE.md](CLAUDE.md) gives Claude
Code the same map, so it can modify scenarios or build new ones for you.
