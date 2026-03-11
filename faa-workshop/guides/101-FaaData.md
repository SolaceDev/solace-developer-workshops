# Introduction to FAA Data and Systems

## Table of Contents

- [FDPS (Flight Data Processing System)](#fdps-flight-data-processing-system)
  - [FDPSFlightPlan — En-Route Flight Plan Messages](#fdpsflightplan--en-route-flight-plan-messages)
  - [FDPSPosition — En-Route Real-Time Position/Surveillance Updates](#fdpsposition--en-route-real-time-positionsurveillance-updates)
- [STDDS (Surface Data Distribution System)](#stdds-surface-data-distribution-system)
  - [STDDSPosition — Surface Movement Event Messages](#stddsposition--surface-movement-event-messages)
- [NAS Aeronautical References](#nas-aeronautical-references)
- [CONOPS Data](#conops-data)
  - [Documents Available](#documents-available)
  - [What Each CONOPS Covers](#what-each-conops-covers)
- [Next Steps](#next-steps)

In this workshop, we'll work with two critical FAA data systems:

---

## FDPS (Flight Data Processing System)

FDPS is the FAA's primary system for managing flight plan data and tracking aircraft through the National Airspace System (NAS). It processes flight plans, monitors aircraft positions, and coordinates handoffs between air traffic control facilities.

FDPS data is sourced from the **SWIM SFDPS (System-Wide Information Management / System-wide Flight Data Processing Service)**, which receives data from **ERAM (En Route Automation Modernization)** systems across 20 ARTCCs via HADDS, consolidates and de-conflicts it, and publishes it to downstream consumers via NEMS JMS topics.

There are two core FDPS collections available in this workshop:

### FDPSFlightPlan — En-Route Flight Plan Messages

Each document represents a flight plan message (e.g., `AH` = Active/Amended, `FH` = Flight Plan, `HU` = Update) published by SFDPS for a flight operating under IFR or VFR+ rules. These messages capture the full flight plan: route of flight, aircraft equipment, assigned altitude, departure/arrival points, and the flight's Globally Unique Flight Identifier (GUFI).

<details>

<summary>Sample FDPSFlightPlan Document (N29ER, Cessna 172, KELM → N23, ZBW Center)</summary>

```json
{
  "_id": "69af058c294e3e050450a0fa",
  "time": "2026-03-09 17:37:19.678000",
  "message": {
    "flight": {
      "centre": "ZBW",
      "source": "AH",
      "system": "SLC",
      "timestamp": "2026-03-09T17:37:19.678Z",
      "agreed": {
        "route": {
          "nasRouteText": "KELM..N23"
        }
      },
      "aircraftDescription": {
        "equipmentQualifier": "T",
        "aircraftType": {
          "icaoModelIdentifier": "C172"
        },
        "capabilities": {
          "communication": { "communicationCode": "V" },
          "surveillance":  { "surveillanceCode": "A" }
        }
      },
      "arrival":   { "arrivalPoint": "N23" },
      "departure": {
        "departurePoint": "KELM",
        "runwayPositionAndTime": {
          "runwayTime": {
            "actual": { "time": "2026-03-09T17:13:00Z" }
          }
        }
      },
      "enRoute": {
        "beaconCodeAssignment": {
          "currentBeaconCode": "2667"
        }
      },
      "flightIdentification": {
        "aircraftIdentification": "N29ER",
        "computerId": "467",
        "siteSpecificPlanId": "495"
      },
      "flightStatus": {
        "fdpsFlightStatus": "ACTIVE"
      },
      "gufi": {
        "codeSpace": "urn:uuid",
        "text": "ab70c7c1-c40e-4f14-a0a7-d80de9a3afde"
      },
      "assignedAltitude": {
        "vfrPlus": { "uom": "FEET", "text": "3500.0" }
      },
      "requestedAirspeed": {
        "nasAirspeed": { "uom": "KNOTS", "text": "140.0" }
      },
      "coordination": {
        "coordinationTime": "2026-03-09T17:44:00Z",
        "coordinationFix": {
          "fix": "HNK",
          "distance": { "uom": "NAUTICAL_MILES", "text": "18.0" },
          "radial":   { "uom": "DEGREES", "text": "329.0" }
        }
      },
      "flightPlan": { "identifier": "KN6202020K" },
      "supplementalData": {
        "additionalFlightInformation": {
          "nameValue": [
            { "name": "MSG_SEQ_NO",         "value": "12387962" },
            { "name": "FDPS_GUFI",          "value": "us.fdps.2026-03-09T17:13:40Z.000/13/20K" },
            { "name": "FLIGHT_PLAN_SEQ_NO", "value": "1" },
            { "name": "FLIGHT_PLAN_REV_NO", "value": "00" }
          ]
        }
      }
    }
  }
}
```

</details>

---

### FDPSPosition — En-Route Real-Time Position/Surveillance Updates

Each document represents a real-time surveillance position update (`TH` = Track Hit, `HP` = Handoff/Position) published by SFDPS as an aircraft progresses en route. These messages capture the aircraft's current lat/lon, altitude, speed, velocity vector, and controlling sector — updated approximately every 12 seconds.

<details>

<summary>Sample FDPSPosition Document (FDX1404, Boeing 777F, KMEM → KLAX, ZAB Center)</summary>

```json
{
  "_id": "69afe6510731223fbde3f211",
  "time": "2026-03-10 09:37:19.737000",
  "message": {
    "flight": {
      "centre": "ZAB",
      "source": "TH",
      "system": "SLC",
      "timestamp": "2026-03-10T09:37:19.737Z",
      "controllingUnit": {
        "sectorIdentifier": "15",
        "unitIdentifier": "ZAB"
      },
      "departure": {
        "departurePoint": "KMEM",
        "runwayPositionAndTime": {
          "runwayTime": { "actual": { "time": "2026-03-10T08:18:00Z" } }
        }
      },
      "arrival": {
        "arrivalPoint": "KLAX",
        "runwayPositionAndTime": {
          "runwayTime": { "estimated": { "time": "2026-03-10T11:49:00Z" } }
        }
      },
      "enRoute": {
        "position": {
          "positionTime": "2026-03-10T09:37:15Z",
          "reportSource": "SURVEILLANCE",
          "altitude":     { "uom": "FEET",  "text": "32000.0" },
          "actualSpeed": {
            "surveillance": { "uom": "KNOTS", "text": "417.0" }
          },
          "position": {
            "location": {
              "srsName": "urn:ogc:def:crs:EPSG::4326",
              "pos": "35.503056 -100.540556"
            }
          },
          "targetAltitude":  { "uom": "FEET", "text": "32000.0" },
          "targetPosition": {
            "srsName": "urn:ogc:def:crs:EPSG::4326",
            "pos": "35.503056 -100.540278"
          },
          "trackVelocity": {
            "x": { "uom": "KNOTS", "text": "-421.0" },
            "y": { "uom": "KNOTS", "text": "19.0" }
          }
        }
      },
      "flightIdentification": {
        "aircraftIdentification": "FDX1404",
        "computerId": "425",
        "siteSpecificPlanId": "92"
      },
      "flightStatus": { "fdpsFlightStatus": "ACTIVE" },
      "gufi": {
        "codeSpace": "urn:uuid",
        "text": "26a5a66e-aa34-4bc1-a98b-a864e355e08f"
      },
      "operator": {
        "operatingOrganization": {
          "organization": { "name": "FDX" }
        }
      },
      "assignedAltitude": {
        "simple": { "uom": "FEET", "text": "32000.0" }
      },
      "supplementalData": {
        "additionalFlightInformation": {
          "nameValue": [
            { "name": "ADSB_POS_174A",  "value": "35.503056/-100.540278" },
            { "name": "ADSB_ALT_175A",  "value": "32000.0" },
            { "name": "ADSB_VEL_176A",  "value": "-421/+19" },
            { "name": "ADSB_TIME_177A", "value": "2026-03-10T09:37:15Z" },
            { "name": "ADSB_02M_52B",   "value": "-A27F7F" }
          ]
        }
      }
    }
  }
}
```

</details>


> **FDPS Cross-Collection Join:** `FDPSFlightPlan` and `FDPSPosition` records for the same flight share the same `message.flight.gufi.text` UUID, enabling a full picture of a flight's plan + trajectory.

---

## STDDS (Surface Data Distribution System)

STDDS provides real-time information about aircraft movements on airport surfaces, including taxiways, runways, and ramps. This system is crucial for ground traffic management and preventing runway incursions.

STDDS data is sourced from the **SWIM STDDS SMES (Surface Movement Event Service)**, which aggregates data from **ASDE-X** (Airport Surface Detection Equipment – Model X) and **ASSC** sensors deployed at major U.S. airports. Sensor types include Surface Movement Radar (SMR), Multilateration (MLAT), Automatic Surveillance Radar (ASR), and ADS-B. The system publishes discrete **surface movement events** — such as spot departures, runway entries/exits, takeoffs, and landings — to downstream consumers via NEMS.

### STDDSPosition — Surface Movement Event Messages

Each document records a specific surface event for an aircraft at an ASDE-X equipped airport. Unlike the FDPS collections which update continuously, STDDS documents are **event-driven** — a new record is created each time a significant surface state change occurs (e.g., aircraft pushes back from gate, enters a runway, or becomes airborne).

<details>

<summary>Sample STDDSPosition Document (FDX1413, Boeing 777F, KMEM departing for PHNL)</summary>

```json
{
  "_id": "69afe6500dd9d77082ab8eb2",
  "time": "2026-03-10 09:37:20.670000",
  "SurfaceMovementEventMessage": {
    "callsign":    "FDX1413",
    "track":       "615",
    "stid":        "292357",
    "airport":     "KMEM",
    "mode3ACode":  "1606",
    "aircraftType": "B77L",
    "acAddress":   "AC01FC",
    "time":        "2026-03-10T09:37:20.670Z",
    "event":       "runwayout",
    "position": {
      "latitude":  "35.02914",
      "longitude": "-89.987"
    },
    "altitude": "450.0",
    "runway":   "18R/36L",
    "status":   "airborne",
    "events": {
      "eventRecord": [
        { "event": "spotout",   "at": "2026-03-10T09:30:31.647Z" },
        { "event": "runwayin",  "runway": "09/27",   "at": "2026-03-10T09:31:54.654Z" },
        { "event": "runwayout", "runway": "09/27",   "at": "2026-03-10T09:32:03.653Z" },
        { "event": "runwayin",  "runway": "18R/36L", "at": "2026-03-10T09:36:02.656Z" }
      ]
    },
    "enhancedData": {
      "eramGufi":           "KM258633Gj",
      "sfdpsGufi":          "us.fdps.2026-03-10T07:11:03Z.000/12/3Gj",
      "departureAirport":   "KMEM",
      "destinationAirport": "PHNL"
    }
  }
}
```

</details>


> **STDDS ↔ FDPS Cross-System Join:** The `enhancedData.sfdpsGufi` field in STDDSPosition can be matched against the `FDPS_GUFI` key-value in `FDPSFlightPlan.message.flight.supplementalData.additionalFlightInformation.nameValue`, enabling a complete gate-to-gate picture of any flight.

---

## NAS Aeronautical References

NAS aeronautical reference data is the **static geospatial and structural backbone** of the National Airspace System. While FDPS and STDDS capture live, dynamic flight operations data, aeronautical reference data defines the fixed navigational infrastructure that those flights operate within — named waypoints, intersections, VORs, jet routes, and their relationships to one another and to the ARTCCs that manage them.

This data is sourced from the **FAA NAS Adaptation** database and is organized into four collections:

| Collection | Contents |
|---|---|
| `FIX_BASE` | Master waypoint/fix records — coordinates, ARTCC assignments, usage codes, and chart categories |
| `FIX_CHRT` | Chart association records — maps each fix to one or more aeronautical charting types |
| `FIX_NAV` | Fix-Radial-Distance (FRD) records — defines each fix by its bearing and distance from a ground-based NAVAID |
| `FIX_DATA_STRUCTURE` | Schema metadata — field definitions, data types, max lengths, and nullability for all fix-related fields |

> **Aeronautical Reference ↔ FDPS Join:** Fix identifiers from `FIX_BASE` (e.g., `ZELBO`, `RBV`, `AIR`) appear directly in FDPS route strings (`message.flight.agreed.route.nasRouteText`), enabling route parsing, geographic enrichment, and spatial analysis of flight trajectories.

---

## CONOPS Data

In a real FAA project, each system comes with extensive CONOPS (Concept of Operations) documentation — often exceeding 200 pages per system. We'll use Agent Mesh's RAG (Retrieval-Augmented Generation) capabilities to extract relevant information.

### Documents Available

The RAG system contains two FAA SWIM Operational Context Documents:

| Document | System | Version |
|---|---|---|
| `SFDPS_Flight_Operational_Context_Document_v1.0_20180828_Final.md` | **SFDPS ERFDP** — En Route Flight Data Publication | v1.0, August 2018 |
| `STDDS_SMES_Operational_Context_Document_v1.1_2019_04_25_RevA.md` | **STDDS SMES** — Surface Movement Event Service | v1.1, April 2019 |

### What Each CONOPS Covers

#### SFDPS ERFDP (En-Route Flight Data)
- **Service architecture:** How SFDPS receives data from ERAM via 20 HADDS systems, consolidates/de-conflicts it, assigns unique flight IDs, and publishes to NEMS via JMS topics
- **Four en-route service categories:** ERFDP (per-flight data), ERADP (airspace data), ERODP (internal FAA), ERGMP (general messages)
- **27 ERFDP message types:** Including flight plan (FH), track data, handoff status, point-out information, ARTS flow messages, and more
- **Message formats:** Simple XML and FIXM 3.0; track message options at 12-second or 1-minute intervals
- **Data element definitions:** Field-by-field reference for ICAO equipment codes, PBN/RVSM/MNPS navigation capabilities, and communication codes
- **Consumer subscription model:** How operators subscribe via the NEMS on-ramping process

#### STDDS SMES (Airport Surface Movement)
- **Service architecture:** How STDDS aggregates data from ASDE-X, ASSC, RVR, EFSTS, TDLS, and STARS/GeNUS, publishing via NEMS
- **Sensor types:** Surface Movement Radar (SMR), Multilateration (MLAT), Automatic Surveillance Radar (ASR), and ADS-B
- **SMES message types:** ASDE-X position/status messages, Surface Movement Events (`spotout`, `runwayin`, `runwayout`, `off`, `on`), Safety Logic Hold Bar messages (RWSL status), and Safety Logic Alert Reports
- **Aircraft location states:** On-Ramp, On-Surface, Airborne
- **Operational applications:** Common Operational Picture (COP) for airlines and FAA/ATC; runway occupancy time measurement; demand-capacity balancing; crash/fire/rescue (CFR) safety support

## Next Steps

Now that you understand the core concepts of FAA Data you're ready to explore more advanced capabilities and what you can do with Solace Agent Mesh.

1. [Understanding Solace Agent Mesh](./102-SAMOverview.md)
1. [Adding your first agent](./200-DatabaseAgent.md)