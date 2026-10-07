# [Hands-on] A2A Proxy

Connect WeatherAdvisorAgent, an external agent built with LangChain and running on AWS, to the mesh through an A2A proxy. It provides weather forecasts, packing tips, and activity suggestions.

---

## Step 1: Check the agent is reachable

```bash
curl -s http://ec2-18-189-171-185.us-east-2.compute.amazonaws.com:10000/health
# Expected: {"status":"healthy","agent":"WeatherAdvisorAgent"}
```

> [!NOTE]
> On SAM Desktop, if there is no response, re-run the IP registration from [Launch Solace Agent Mesh](./02_Handson_launch_agent_mesh.md#step-2-register-your-ip-address).

---

## Step 2: Connect the external agent

1. Go to **Builder → Agent Management → Add Agent → Connect External Agent**

1. **Provide Agent Location:** fill in the form

    | Field | Value |
    |---|---|
    | Agent URL | `http://ec2-18-189-171-185.us-east-2.compute.amazonaws.com:10000` |
    | Agent Card Location | `Well-known URI` |
    | Authentication Type | `No Authentication` |

1. Click **Fetch Agent Card**. The wizard shows the agent name `WeatherAdvisorAgent`.

1. Click **Next: Enter Additional Information**

1. **Enter Additional Information:**

    | Field | Value |
    |---|---|
    | Agent Display Name | Keep the default, `WeatherAdvisorAgent`. The TravelOrchestratorAgent refers to it by this name. |
    | Authentication Type | `No Authentication` |

1. Click **Next: Review Agent**

1. **Review Agent:** confirm the agent card shows the skill **Weather Forecast & Activity Advisor**

1. Click **Connect and Deploy**

---

## Verify the agent

1. Go to **Builder → Agent Management**
1. Confirm `WeatherAdvisorAgent` is listed with the status **Deployed**

---
Section complete! Close this file and return to the Workshop Tracker to continue.
