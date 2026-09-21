"""Cockpit runtime configuration, sourced from the environment with
workshop-friendly defaults that match setup_broker.sh."""

import os
from pathlib import Path

# cockpit/app/config.py -> cockpit/ -> repo root
COCKPIT_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = COCKPIT_DIR.parent
SCENARIOS_DIR = COCKPIT_DIR / "scenarios"
STATIC_DIR = COCKPIT_DIR / "static"

# Where terraform state and other per-scenario runtime files live. Kept out of
# the scenario source dirs so a reset is a directory delete, and so the repo
# stays clean for the next attendee.
STATE_DIR = Path(os.environ.get("COCKPIT_STATE_DIR", COCKPIT_DIR / ".state"))

HOST = os.environ.get("COCKPIT_HOST", "0.0.0.0")
PORT = int(os.environ.get("COCKPIT_PORT", "3000"))

BROKER_HOST = os.environ.get("SOLACE_HOST", "localhost")
SEMP_PORT = int(os.environ.get("SOLACE_SEMP_PORT", "8080"))
SMF_PORT = int(os.environ.get("SOLACE_SMF_PORT", "55555"))
SEMP_USER = os.environ.get("SOLACE_SEMP_USER", "admin")
SEMP_PASSWORD = os.environ.get("SOLACE_SEMP_PASSWORD", "admin")
MSG_VPN = os.environ.get("SOLACE_MSG_VPN", "default")

# One password for every workshop client username. Shared by the Go apps and
# by terraform (as TF_VAR_client_password) so the two can never drift apart
# and leave an attendee with an app that cannot log in.
CLIENT_PASSWORD = os.environ.get("SOLACE_CLIENT_PASSWORD", "solace-workshop")

SEMP_BASE_URL = f"http://{BROKER_HOST}:{SEMP_PORT}/SEMP/v2/config"
# Configuration and monitoring are separate SEMP trees. Objects an attendee
# created live under /config; live counters like queue depth and connected
# clients exist only under /monitor, so a scenario inspect view has to say
# which one it wants.
SEMP_MONITOR_BASE_URL = f"http://{BROKER_HOST}:{SEMP_PORT}/SEMP/v2/monitor"
BROKER_UI_URL = f"http://{BROKER_HOST}:{SEMP_PORT}"

# Lines of output retained per action so a log pane opened late still shows
# recent history. Bounded so a runaway process cannot exhaust container memory.
LOG_RING_SIZE = int(os.environ.get("COCKPIT_LOG_RING_SIZE", "2000"))


def scenario_state_dir(scenario_id: str) -> Path:
    return STATE_DIR / scenario_id


def scenario_env() -> dict:
    """Broker connection details for anything a scenario runs.

    Exported under the same names the cockpit itself reads, so a helper script
    or sample app targets the same broker, VPN and state directory the cockpit
    does rather than falling back to its own defaults.
    """
    env = dict(os.environ)
    env.update(
        {
            "SOLACE_HOST": BROKER_HOST,
            "SOLACE_SEMP_PORT": str(SEMP_PORT),
            # Messaging, not management. Sample apps connect on SMF; only the
            # cockpit itself talks to SEMP.
            "SOLACE_SMF_PORT": str(SMF_PORT),
            "SOLACE_SEMP_USER": SEMP_USER,
            "SOLACE_SEMP_PASSWORD": SEMP_PASSWORD,
            "SOLACE_MSG_VPN": MSG_VPN,
            "SOLACE_SEMP_URL": f"http://{BROKER_HOST}:{SEMP_PORT}",
            "SOLACE_CLIENT_PASSWORD": CLIENT_PASSWORD,
            "COCKPIT_STATE_DIR": str(STATE_DIR),
            # Where apps/build.sh writes the workshop binary and apps/run.sh
            # looks for it.
            "COCKPIT_BIN_DIR": str(STATE_DIR / "bin"),
        }
    )
    return env


def terraform_env() -> dict:
    """Environment for terraform subprocesses. The Solace provider reads these
    TF_VAR_* names; see scenarios/*/tf/variables.tf."""
    env = scenario_env()
    env.update(
        {
            "TF_IN_AUTOMATION": "1",
            "TF_INPUT": "0",
            # The provider wants the broker base URL, not the SEMP config path.
            "TF_VAR_solace_url": f"http://{BROKER_HOST}:{SEMP_PORT}",
            "TF_VAR_solace_username": SEMP_USER,
            "TF_VAR_solace_password": SEMP_PASSWORD,
            "TF_VAR_msg_vpn": MSG_VPN,
            # The same password the apps use, so a client username terraform
            # creates is one the Go apps can actually log in as.
            "TF_VAR_client_password": CLIENT_PASSWORD,
        }
    )
    return env
