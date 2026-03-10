System Wide Information Management (SWIM)

**SWIM Flight Data Publication Service (SFDPS) En Route Flight Data
Publication (ERFDP)\
Operational Context Document**

![](media/image1.png){width="1.59375in" height="1.5416666666666667in"}

Version 1.0

August 31, 2018

**SIGNATURE PAGE**

Name Date

SWIM Implementation Lead

Name Date

SWIM Program Manager

Federal Aviation Administration

800 Independence Avenue, SW

Washington, D.C. 20591

**DOCUMENT CHANGE HISTORY**

  ------------------------------------------------------------------------
  **Version**     **Date**      **Description of Changes**
  --------------- ------------- ------------------------------------------
  0.2             7/1/18        Initial Draft document

  0.3             7/25/18       Updated Draft document

  1.0             8/31/18       Draft delivered to SWIFT team,
                                incorporates comments received to date
  ------------------------------------------------------------------------

  : []{#_Toc523206125 .anchor}Table 1. ERAM Flight Data Messages
  Published by ERFDP

**TABLE OF CONTENTS**

[1 Introduction [1](#introduction)](#introduction)

[2 En Route Flight Data Overview
[2](#en-route-flight-data-overview)](#en-route-flight-data-overview)

[2.1 En Route Automation Modernization (ERAM)
[2](#en-route-automation-modernization-eram)](#en-route-automation-modernization-eram)

[2.2 References [4](#references)](#references)

[3 SFDPS ERFDP [5](#sfdps-erfdp)](#sfdps-erfdp)

[3.1 Service Overview [5](#service-overview)](#service-overview)

[3.2 Flight Plan Information
[6](#flight-plan-information)](#flight-plan-information)

[3.3 Flight Amendment Information
[7](#flight-amendment-information)](#flight-amendment-information)

[3.4 Converted Route Information
[7](#converted-route-information)](#converted-route-information)

[3.5 Cancellation Information
[7](#cancellation-information)](#cancellation-information)

[3.6 Departure Information
[7](#departure-information)](#departure-information)

[3.7 Aircraft Identification Amendment Information
[7](#aircraft-identification-amendment-information)](#aircraft-identification-amendment-information)

[3.8 Hold Information [7](#hold-information)](#hold-information)

[3.9 Progress Report Information
[7](#progress-report-information)](#progress-report-information)

[3.10 Flight Arrival Information
[7](#flight-arrival-information)](#flight-arrival-information)

[3.11 Flight Plan Update Information
[8](#flight-plan-update-information)](#flight-plan-update-information)

[3.12 Expected Departure Time Information
[8](#expected-departure-time-information)](#expected-departure-time-information)

[3.13 Position Update Information
[8](#position-update-information)](#position-update-information)

[3.14 Tentative Flight Plan Information
[8](#tentative-flight-plan-information)](#tentative-flight-plan-information)

[3.15 Tentative Aircraft Identification Amendment Information
[8](#tentative-aircraft-identification-amendment-information)](#tentative-aircraft-identification-amendment-information)

[3.16 Tentative Flight Plan Removal
[9](#tentative-flight-plan-removal)](#tentative-flight-plan-removal)

[3.17 Tentative Flight Plan Amendment Information
[9](#tentative-flight-plan-amendment-information)](#tentative-flight-plan-amendment-information)

[3.18 Batch Track Information
[9](#batch-track-information)](#batch-track-information)

[3.19 Drop Track Information
[9](#drop-track-information)](#drop-track-information)

[3.20 Interim Altitude Information
[9](#interim-altitude-information)](#interim-altitude-information)

[3.21 Automated Radar Terminal System (ARTS) Flow Control Track/Full
Data Block Information
[10](#automated-radar-terminal-system-arts-flow-control-trackfull-data-block-information)](#automated-radar-terminal-system-arts-flow-control-trackfull-data-block-information)

[3.22 Beacon Code Reassignment
[10](#beacon-code-reassignment)](#beacon-code-reassignment)

[3.23 Beacon Code Restricted
[10](#beacon-code-restricted)](#beacon-code-restricted)

[3.24 FDB Fourth Line Information
[11](#fdb-fourth-line-information)](#fdb-fourth-line-information)

[3.25 Point Out Information
[11](#point-out-information)](#point-out-information)

[3.26 Inbound Point Out Information
[11](#inbound-point-out-information)](#inbound-point-out-information)

[3.27 Handoff Status [11](#handoff-status)](#handoff-status)

[3.28 Flight Plan Reconstitution Message
[11](#flight-plan-reconstitution-message)](#flight-plan-reconstitution-message)

[4 SFDPS ERFDP Message Types
[12](#sfdps-erfdp-message-types)](#sfdps-erfdp-message-types)

[4.1 Flight Plan Information - FH
[14](#flight-plan-information---fh)](#flight-plan-information---fh)

[4.2 Flight Amendment Information -- AH
[32](#flight-amendment-information-ah)](#flight-amendment-information-ah)

[4.3 Converted Route Information -- HX
[33](#converted-route-information-hx)](#converted-route-information-hx)

[4.4 Cancellation Information -- CL
[35](#cancellation-information-cl)](#cancellation-information-cl)

[4.5 Departure Information -- DH
[37](#departure-information-dh)](#departure-information-dh)

[4.6 Aircraft Identification Amendment Information -- IH
[40](#aircraft-identification-amendment-information-ih)](#aircraft-identification-amendment-information-ih)

[4.7 Hold Information -- HH
[42](#hold-information-hh)](#hold-information-hh)

[4.8 Progress Report -- PH
[44](#progress-report-ph)](#progress-report-ph)

[4.9 Flight Arrival Information -- HV
[45](#flight-arrival-information-hv)](#flight-arrival-information-hv)

[4.10 Flight Plan Update Information -- HU
[47](#flight-plan-update-information-hu)](#flight-plan-update-information-hu)

[4.11 Expected Departure Time Information -- ET
[47](#expected-departure-time-information-et)](#expected-departure-time-information-et)

[4.12 Position Update -- HP
[49](#position-update-hp)](#position-update-hp)

[4.13 Tentative Flight Plan Information -- NI
[51](#tentative-flight-plan-information-ni)](#tentative-flight-plan-information-ni)

[4.14 Tentative Flight Plan Removal -- NL
[53](#tentative-flight-plan-removal-nl)](#tentative-flight-plan-removal-nl)

[4.15 Tentative Flight Plan Amendment Information -- NU
[55](#tentative-flight-plan-amendment-information-nu)](#tentative-flight-plan-amendment-information-nu)

[4.16 Batch Track Information -- BATCH_TH
[60](#batch-track-information-batch_th)](#batch-track-information-batch_th)

[4.17 Drop Track Information -- RH
[71](#drop-track-information-rh)](#drop-track-information-rh)

[4.18 Interim Altitude -- LH
[72](#interim-altitude-lh)](#interim-altitude-lh)

[4.19 Automated Radar Terminal System (ARTS) Flow Control Track/Full
Data Block Information -- HZ
[74](#automated-radar-terminal-system-arts-flow-control-trackfull-data-block-information-hz)](#automated-radar-terminal-system-arts-flow-control-trackfull-data-block-information-hz)

[4.20 Beacon Code Reassignment -- BA
[77](#beacon-code-reassignment-ba)](#beacon-code-reassignment-ba)

[4.21 Beacon Code Restricted -- RE
[79](#beacon-code-restricted-re)](#beacon-code-restricted-re)

[4.22 FDB Fourth Line -- HF
[81](#fdb-fourth-line-hf)](#fdb-fourth-line-hf)

[4.23 Point Out Information -- HR
[83](#point-out-information-hr)](#point-out-information-hr)

[4.24 Inbound Point Out Information -- PT
[84](#inbound-point-out-information-pt)](#inbound-point-out-information-pt)

[4.25 Handoff Status -- OH [86](#handoff-status-oh)](#handoff-status-oh)

[4.26 Flight Plan Reconstitution Message -- DBRTFPI
[89](#flight-plan-reconstitution-message-dbrtfpi)](#flight-plan-reconstitution-message-dbrtfpi)

[Appendix A: Acronyms [114](#appendix-a-acronyms)](#appendix-a-acronyms)

[Appendix B: Flight Data Properties
[119](#appendix-b-flight-data-properties)](#appendix-b-flight-data-properties)

**LIST OF FIGURES**

[Figure 1. SFDPS Information Flows [6](#_Ref516134150)](#_Ref516134150)

[Figure 2. FH Structure 1/2 [14](#_Toc523206086)](#_Toc523206086)

[Figure 3. FH Structure 2/2 [15](#_Toc523206087)](#_Toc523206087)

[Figure 4. HX Structure [33](#_Toc523206088)](#_Toc523206088)

[Figure 5. fixTimes Structure [34](#_Toc523206089)](#_Toc523206089)

[Figure 6. fixAndTime Structure [35](#_Toc523206090)](#_Toc523206090)

[Figure 7. CL Structure [35](#_Toc523206091)](#_Toc523206091)

[Figure 8. DH Structure [37](#_Toc523206092)](#_Toc523206092)

[Figure 9. IH Structure [40](#_Toc523206093)](#_Toc523206093)

[Figure 10. HH Structure [42](#_Toc523206094)](#_Toc523206094)

[Figure 11. PH Structure [44](#_Toc523206095)](#_Toc523206095)

[Figure 12. HV Structure [45](#_Toc523206096)](#_Toc523206096)

[Figure 13. ET Structure [47](#_Toc523206097)](#_Toc523206097)

[Figure 14. HP Structure [49](#_Toc523206098)](#_Toc523206098)

[Figure 15. NI Structure [51](#_Toc523206099)](#_Toc523206099)

[Figure 16. NL Structure [53](#_Toc523206100)](#_Toc523206100)

[Figure 17. NU Structure [55](#_Toc523206101)](#_Toc523206101)

[Figure 18. Batch TH Structure [60](#_Toc523206102)](#_Toc523206102)

[Figure 19. singleTH Structure [61](#_Toc523206103)](#_Toc523206103)

[Figure 20. THmetadata Structure [61](#_Toc523206104)](#_Toc523206104)

[Figure 21. msgTimes Structure [63](#_Toc523206105)](#_Toc523206105)

[Figure 22. TH Structure [65](#_Toc523206106)](#_Toc523206106)

[Figure 23. RH Structure [71](#_Toc523206107)](#_Toc523206107)

[Figure 24. LH Structure [72](#_Toc523206108)](#_Toc523206108)

[Figure 25. HZ Structure [74](#_Toc523206109)](#_Toc523206109)

[Figure 26. BA Structure [77](#_Toc523206110)](#_Toc523206110)

[Figure 27. RE Structure [79](#_Toc523206111)](#_Toc523206111)

[Figure 28. HF Structure [81](#_Toc523206112)](#_Toc523206112)

[Figure 29. HR Structure [83](#_Toc523206113)](#_Toc523206113)

[Figure 30. routeStatus Structure [83](#_Toc523206114)](#_Toc523206114)

[Figure 31. PT Structure [84](#_Toc523206115)](#_Toc523206115)

[Figure 32. OH Structure [86](#_Toc523206116)](#_Toc523206116)

[Figure 33. DBRTFPI Structure 1/3 [89](#_Toc523206117)](#_Toc523206117)

[Figure 34. DBRTFPI Structure 2/3 [90](#_Toc523206118)](#_Toc523206118)

[Figure 35. DBRTFPI Structure 3/3 [91](#_Toc523206119)](#_Toc523206119)

[Figure 36. fixTimes Structure [102](#_Toc523206120)](#_Toc523206120)

[Figure 37. adjacentCenterRouting Structure
[103](#_Toc523206121)](#_Toc523206121)

**LIST OF TABLES**

[Table 1. ERAM Flight Data Messages Published by ERFDP
[3](#_Toc523206125)](#_Toc523206125)

[Table 2. SFDPS ERFDP Message Types
[12](#_Toc523206126)](#_Toc523206126)

[Table 3. Acronym Listing [114](#_Toc523206127)](#_Toc523206127)

# Introduction

The purpose of this document is to provide users of the System Wide
Information Management (SWIM) Flight Data Publication (SFDPS) En Route
Flight Data Publication (ERFDP) products provided through Federal
Aviation Administration (FAA) SWIM infrastructure background information
on how the data is generated, what the data means, and how the data can
be used. The beginning of this document provides details on the systems
and sensors which are the source of the SFDPS ERFDP data. Next, is a
brief discussion on how the data can be utilized by aviation
stakeholders to improve their operation using the SFDPS ERFDP data.
Finally, a detailed breakdown of the individual data elements, their
definition, and their context is provided.

SFDPS publishes four different categories of data, defined as four En
Route Data Services. The four services are:

-   En Route Flight Data Publication (ERFDP) -- Includes any data
    specific to an individual flight.

-   En Route Airspace Data Publication (ERADP) -- Includes airspace data
    that is of general interest.

-   En Route Operational Data Publication (ERODP) -- Includes data sent
    by En Route Automation Modernization (ERAM) to support specific FAA
    monitoring functions (this is an internal FAA service and as such,
    no Operational Context Document will be developed).

-   En Route General Message Publication (ERGMP) -- The ability to send
    general, free-form text messages and other messages to one or more
    clients or classes of clients.

Due to the scope of information provided by SFDPS, the capabilities of
ERFDP, ERADP, and ERGMP will be covered in three separate Operational
Context documents. This document will cover the ERFDP. For information
on ERADP and ERGMP, please refer to those specific Operational Context
Documents.

# En Route Flight Data Overview

## En Route Automation Modernization (ERAM)

In this section, an overview of En Route Flight Data and the systems
used to obtain it are discussed. SFDPS is the SWIM program developed to
provide en route flight information services to a wide variety of
consumers in a SWIM-compliant manner. The purpose of SFDPS is to make En
Route Automation Modernization (ERAM) data from the 20 Contiguous US
(CONUS) Air Route Traffic Control Centers (ARTCCs) easily accessible.

ERAM is the computer system the FAA uses at its high altitude en route
ARTCCs and is considered the backbone of the National Airspace System
(NAS). ERAM processes flight and surveillance data, provides
communications, and generates display data to air traffic controllers
(ATC). The system provides core functionality for ATC, and supports
satellite-based systems such as Automatic Dependent
Surveillance-Broadcast (ADS-B) and data communication technologies.

ERAM increases capacity and improves efficiency in the nation's skies.
It enables en route controllers at each center to track 1,900 aircraft
at a time, while the legacy system could track up to 1,100 aircraft).
Coverage extends beyond facility boundaries, enabling controllers to
handle additional traffic more efficiently.

The system allows controllers to share and coordinate information
seamlessly between centers, enabling the use of three-mile (rather than
five-mile) separation. ERAM improves flight plan processing and enables
automatic transitions between sectors and centers, even when planes
divert from their planned course. This improves operational efficiency
during bad weather and congestion.

The ERAM program replaces four legacy systems previously used in ARTCCs,
reducing the hardware operating and support costs, as well as the total
number of software code lines and the cost of software maintenance.

The ERAM tracking function processes target reports from multiple
radars, replacing the single radar tracker in the legacy system. This
provides more reliable tracking in areas of partial radar coverage. 

The ERAM system significantly improves on flight plan processing. ERAM
creates a 4-dimensional trajectory (3D plus time) of every flight from
takeoff to landing. The system uses this information to improve a
controller's situational awareness in his or her airspace as well as the
surrounding airspace, enabling better decision-making and safer, more
efficient routing of aircraft along their flight path. The system can
warn controllers when aircraft are unexpectedly entering their airspace
and provides improved capabilities for handling military aircraft to
ensure their training exercises and military missions do not interfere
with civilian flights. Improvements in the automation function that
transfers control of a flight from one controller to the next allow ERAM
to control flights on fuel-efficient, direct routes in the sky.

ERAM takes advantage of the improved tracking accuracy and flight plan
processing to create more accurate controller tools. ERAM detects
conflicts between two aircraft, but is more accurate than legacy
systems, reducing the number of missed alerts false conflicts. It also
adds new capabilities to operate with variable separation standards,
allowing the controller to separate aircraft in the most efficient
manner possible, increasing airspace capacity.

  -------------------------------------------------------------------------
  **Message Name**                                  **Message   **Message
                                                    Type**      Class**
  ------------------------------------------------- ----------- -----------
  Flight Plan Information                           FH          Flight Data

  Flight Amendment Information                      AH          Flight Data

  Converted Route Information                       HX          Flight Data

  Cancellation Information                          CL          Flight Data

  Departure Information                             DH          Flight Data

  Aircraft ID Amendment Information                 IH          Flight Data

  Hold Information                                  HH          Flight Data

  Progress Report Information                       PH          Flight Data

  Flight Arrival Information                        HV          Flight Data

  Flight Plan Update Information                    HU          Flight Data

  Expected Departure Time Information               ET          Flight Data

  Position Update Information                       HP          Flight Data

  Tentative Flight Plan Information                 NP          Flight Data

  Tentative Flight Plan Amendment Information       NU          Flight Data

  Tentative Aircraft Identification Amendment       NI          Flight Data
  Information                                                   

  Tentative Flight Plan Removal                     NL          Track Data

  Track Information                                 TH          Track Data

  Drop Track Information                            RH          Track Data

  Interim Altitude Information                      LH          Track Data

  Full Data Block (FDB) Fourth Line Information     HF          Track Data

  Point Out Information                             HT          Track Data

  Automated Radar Terminal System (ARTS) Flow       HZ          Track Data
  Control Track/Full Data Block Information                     

  Handoff Status Information                        OH          Track Data

  Inbound Point Out Information                     PT          Track Data
  -------------------------------------------------------------------------

  : []{#_Toc523206126 .anchor}Table 2. SFDPS ERFDP Message Types

## References

Additional information pertaining to SFDPS and its capabilities can be
found at:

-   https://nsrr.faa.gov/services/enroute-fd-pub-v2/documents[^1]

    -   SFDPS Java Messaging Service Description Document (JMSDD)

-   [https://nsrr.faa.gov/services/enroute-fd-pub-v2/references^1^](https://nsrr.faa.gov/services/enroute-fd-pub-v2/references1)

    -   SFDPS Schema

    -   SFDPS Data Consumer Reference Manual

        -   Provides similar information to that provided in this
            Operational Context Document

    -   SFDPS Connect

        -   SFDP Connect software sample client to consume and request
            data from SFDPS

        -   SFDPS Connect Tutorial Videos

        -   SFDPS Connect Documentation

        -   SFDPS Connect source code

    -   FIXM Core v3.0 Schema

    -   FIXM US Extension v3.0 Schema

#  SFDPS ERFDP 

## Service Overview

The major functionality of SFDPS is to publish data derived from Common
Message Set (CMS) messages received from the Host Air Traffic Management
Data Distribution Systems (HADDS) to consumers, via the NAS Enterprise
Messaging System (NEMS). HADDS receives this data from ERAM. The general
behavior is that an incoming CMS message from HADDS will trigger the
publication of a message from SFDPS to NEMS. 

ERFDP is the SFDPS service that publishes flight plan, track, and other
flight-related messages derived from messages received from HADDS. Data
received from each of the 20 HADDS systems is consolidated and
de-conflicted, and unique flight identifiers are assigned before the
messages are published in Simple eXtensible Markup Language (XML) and
Flight Information eXchange Model (FIXM) version 3.0 formats. Consumers
subscribe to this publication via the NEMS on-ramping process, and
receive messages over a Java Message Service (JMS) topic assigned to
them. Consumers can elect to receive all or a subset of the messages
available in one of the two formats. Figure 1 describes the information
flows originating from ERAM being published to consumers of SFDPS.

![](media/image2.png){width="5.996229221347331in" height="4.01875in"}

[]{#_Ref516134150 .anchor}Figure 1. SFDPS Information Flows

The current version of the SFDPS service batches flight track messages
before publishing them to NEMS to reduce bandwidth usage. Consumers have
the ability to receive 12-second interval track messages if they choose,
in either Simple XML or FIXM formats. Consumers continue to have the
ability to request only one-minute tracks (which are also batched). With
previous versions, consumers were restricted to one-minute track
messages in FIXM format only, due to high message rates and bandwidth
usage exceeding infrastructure capacity. 

The ERFDP publishes twenty-seven (27) different message types:

## Flight Plan Information 

The Flight Plan Message is sent to transfer active and proposed flight
plan data. It is generally sent when an ERAM at an ARTCC first creates a
new flight record for a flight. Multiple ARTCCs send copies of the same
flight plan. A single ARTCC may have multiple flight plans for one
flight, although only one should ever be active. This message includes
FH ERAM message.

## Flight Amendment Information

The Flight Amendment Message is used to resend all data/fields in the
Flight Plan Information message when an amendment has been made to one
or more of those fields. This message includes the AH ERAM message.

## Converted Route Information 

The Converted Route Message is sent to provide the fixes along the route
and calculated time of arrival at each fix, as computed by ERAM. It
should be re-sent whenever an FH, AH, DH, or HU is sent. This message
includes the HX ERAM message.

## Cancellation Information 

The Cancellation Message is sent when a flight plan record is canceled
within a particular ARTCC's ERAM. This means that no more data is sent
from that center for that flight plan. This message includes the CL ERAM
message.

## Departure Information 

Departure Message -- Provides departure related data for a flight plan.
If the flight plan was proposed, the DH indicates the flight is now
active. This message includes the DH ERAM message.

## Aircraft Identification Amendment Information 

The Aircraft Identifier Amendment Message is sent to indicate a change
to the flight identification field (flightId_02a) or assignment of
computer identification (computerId_02d) for a flight. This message
includes the IH ERAM message.

## Hold Information 

The Hold Message indicates a hold of a definite duration, an indefinite
hold, or hold release for a specified flight. This message includes the
HH ERAM message.

## Progress Report Information 

The Progress Report Message is sent from ERAM to update the position for
an active flight, or to release it from a prior hold status. This
message includes the PH ERAM message.

## Flight Arrival Information 

The Flight Arrival Message provides arrival data from ERAM for any
arriving flight. This message includes the HV ERAM message.

## Flight Plan Update Information 

The Flight Plan Update Message is sent to provide the latest flight plan
data on an active flight when a new ARTCC assumes control of that
flight. This message includes the HU ERAM message.

## Expected Departure Time Information

The Expected Departure Time Message provides Estimated Departure
Clearance Time (EDCT) information; that is, the assigned departure time
for a proposed flight plan inbound to a controlled airport with a ground
delay in effect and is used to cancel a previously issued EDCT. The
original source of this data is TFMS. This message includes the ET ERAM
message.

## Position Update Information 

The Position Update Message is sent to update the coordination time on
an active flight when the present position fix time is updated. This
message includes the HP ERAM message.

## Tentative Flight Plan Information 

The Tentative Flight Plan Message is sent when ATC creates a temporary,
partial set of flight plan data and associates it with a flight. It
includes the source, flight identification, and may include optional
Unique Flight Plan Identifier (UFPI) \[ERAM-Globally Unique Flight
Identifier (GUFI)\], aircraft data, type of aircraft, airborne equipment
qualifier, beacon code, speed, assigned altitude, reported altitude, and
interim altitude. Often, many of these fields are missing. A tentative
flight plan may be either canceled or merged with a real flight plan
(FH). Flight plan merging is done when a tentative flight plan is filed
and later an active flight plan is also filed. The system identifies
that the two plans are for the same flight and updates the flight plan
so the system doesn't track multiple flight plans for the same flight.
When flight plans are merged, the FH might have the same Site-Specific
Plan Identifier (sspId_167a) and Computer ID (computerId_02d) as the NP,
or it may be different. An NP can be issued only for an active flight.
This message includes the NP ERAM message.

## Tentative Aircraft Identification Amendment Information 

The Tentative Aircraft Identifier Amendment Message is sent from ERAM to
indicate a change to the flight identification field (flightId_02a) of a
tentative flight plan. This message includes the NI ERAM message.

## Tentative Flight Plan Removal 

The Tentative Flight Plan Removal Message is sent to indicate the
removal of a tentative flight plan; may indicate that the tentative
flight plan has been merged with a normal flight plan. This message
includes the NL ERAM message.

## Tentative Flight Plan Amendment Information 

The Tentative Flight Amendment Message is used to update tentative
flight plan data. This message includes the NU ERAM message.

## Batch Track Information 

SFDPS groups all track messages into batches before publishing them to
NEMS.

The message type is BATCH_TH for a batch in the SimpleXML format and
BATCH_TH_FIXM for a batch in FIXM format. A batch can contain up to 100
individual track messages.

SFDPS uses the following properties assigned to each individual track
message to construct the batches:

-   Source Facility

-   Sensitivity

-   Authoritative

-   One-minute Frequency

All track messages within a batch have the same values for all of the
above properties. For example, a batch might contain track messages
issued by ZBW Center that are authoritative, one-minute frequency, and
not sensitive.

The Batch Track Message includes multiple individual Track Messages. The
single Track message provides track data/target information, such as
aircraft track/target position, altitude, and speed. It is normally sent
every 12 seconds for an active flight. This message includes the TH ERAM
message.

## Drop Track Information 

The Drop Track Message indicates that an ARTCC has discontinued tracking
of a particular flight. This message includes the RH ERAM message.

## Interim Altitude Information 

The Interim Altitude Message provides an Air Traffic Management (ATM)
Intermediate Point of Presence (IPOP) with interim altitude data for a
flight. This message includes the LH ERAM message.

## Automated Radar Terminal System (ARTS) Flow Control Track/Full Data Block Information 

The ARTS TZ Flow Control Track/Full Data Block Message provides a
position update from an ARTS; this is a data pass-through. This message
includes the HZ ERAM message.

## Beacon Code Reassignment 

An aircraft's beacon code a refers to an eight-digit octal number
assigned by a computer to a flight plan according to a specific
procedure. The Beacon Code Reassignment Message provides an updated
beacon code for a flight plan when ERAM determines that an automatic
beacon code reassignment occurred because the requested beacon code was
already in use by another aircraft. This occurs because due to the
limited number of beacon codes available, occasionally two different
active flights will be assigned the same code.

This message is shared with authorized users based on the current status
of the flight. If the flight is either "canceled" or "proposed", this
message is only shared with a limited subset of users. If the flight is
"active", this message is shared with all users as long as the flight
itself is not listed as "sensitive". The FDPS_Restricted property on
this type of message has a value of 'R' when the flightState element has
a value of 'Canceled' or 'Proposed' (BA), or the
flight/flightStatus/@fdpsFlightStatus attribute has a value of 'CANCELED
or 'PROPOSED (BA_FIXM), indicating that for non-active flights, this
type of message can only be shared with users authorized to receive
beacon code data. If the flight associated with this type of message is
active, the FDPS_Restricted property has a value of 'A' and can be
shared with all consumers otherwise authorized to receive this message
based on the FDPS_Sensitive flag. This message includes the BA ERAM
message.

## Beacon Code Restricted 

The Beacon Code Restricted Message provides an updated beacon code for a
flight when ERAM determines that a beacon code reassignment occurred
because the requested beacon code is adapted as restricted. The
FDPS_Restricted property on this type of message has a value of 'R' when
the flightState element has a value of 'Canceled' or 'Proposed' (RE), or
the flight/flightStatus/@fdpsFlightStatus attribute has a value of
'CANCELED or 'PROPOSED (RE_FIXM), indicating that for non-active
flights, this type of message can only be shared with users authorized
to receive beacon code data. If the flight associated with this type of
message is active, the FDPS_Restricted property has a value of 'A' and
can be shared with all consumers otherwise authorized to receive this
message based on the FDPS_Sensitive flag. This message includes the RE
ERAM message.

## FDB Fourth Line Information 

The FDB Fourth Line Message is used to send the displayable,
user-specified FDB fourth line data stored in ERAM; this can be heading,
speed, or free-form text. This message includes the HF ERAM message.

## Point Out Information 

The Point Out Message provides inter-facility and intra-facility point
out information when these actions occur. This message includes the HT
ERAM message.

## Inbound Point Out Information 

The Inbound Point Out Message is sent by ERAM upon receipt of an
inter-facility point out message from another center. This message
includes the PT ERAM message.

## Handoff Status 

The Handoff Status Message is sent when a handoff is initiated,
accepted, control is taken away (assert control), or retracted, or when
the failure of handoff is detected. It includes field
**handoffEventIndicator_336a**, a single letter value, where the letter
stands for: **I** = Initiation; **A** = Acceptance; **R** = Retraction;
**T** = Take Control (Assert Control); **U** = Update; **F** = Failure.
This message includes the OH ERAM message.

## Flight Plan Reconstitution Message 

The Flight Plan Reconstitution Message is sent when a client first
connects to a HADDS or when it reconnects to a HADDS after communication
between the client and HADDS is disrupted.

# SFDPS ERFDP Message Types

The SFDPS ERFDP republishes the CMS from ERAM, and as such, labels many
messages and data elements according to CMS naming conventions. The CMS
denotes messages by a combination of letters (e.g., **FH** -- Flight
Plan Information, **AH** -- Flight Plan Amendment, etc.). The CMS
denotes specific data elements by a combination of numbers and letters
as relates to the field reference number (e.g., **04a** -- Beacon Code,
**05a** -- Speed, etc.). Many of the messages SFDPS publishes contain a
large amount of data elements and may be shown in the following sections
in multiple figures comprising the same message. While SFDPS publishes
messages in both simple XML as well as FIXM formats, the messages in the
following sections show only the simple XML messages for brevity.

  -----------------------------------------------------------------------
  **Message Name**                               **Message Code**
  ---------------------------------------------- ------------------------
  Flight Plan Information                        FH/FH_FIXM

  Flight Amendment Information                   AH/AH_FIXM

  Converted Route Information                    HX/HX_FIXM

  Cancellation Information                       CL/CL_FIXM

  Departure Information                          DH/DH_FIXM

  Aircraft Identification Amendment Information  IH/IH_FIXM

  Hold Information                               HH/HH_FIXM

  Progress Report Information                    PH/PH_FIXM

  Flight Arrival Information                     HV/HV_FIXM

  Flight Plan Update Information                 HU/HU_FIXM

  Expected Departure Time Information1           ET/ET_FIXM

  Position Update Information                    HP/HP_FIXM

  Tentative Flight Plan Information              NP/NP_FIXM

  Tentative Aircraft Identification Amendment    NI/NI_FIXM
  Information                                    

  Tentative Flight Plan Removal                  NL/NL_FIXM

  Tentative Flight Plan Amendment Information    NU/NU_FIXM

  Batch Track Information                        BATCH_TH/ BATCH_TH_FIXM

  Drop Track Information                         RH/RH_FIXM

  Interim Altitude Information                   LH/LH_FIXM

  Automated Radar Terminal System (ARTS) Flow    HZ/HZ_FIXM
  Control Track/Full Data Block Information      

  Beacon Code Reassignment                       BA/BA_FIXM

  Beacon Code Restricted                         RE/RE_FIXM

  FDB Fourth Line Information                    HF/HF_FIXM

  Point Out Information                          HT/HT_FIXM

  Inbound Point Out Information                  PT/PT_FIXM

  Handoff Status                                 OH/OH_FIXM

  Flight Plan Reconstitution Message             DBRTFPI/ DBRTFPI_FIXM
  -----------------------------------------------------------------------

  : []{#_Toc523206127 .anchor}Table 3. Acronym Listing

## Flight Plan Information - FH

![](media/image3.png){width="6.0in" height="5.192621391076115in"}

[]{#_Toc523206086 .anchor}Figure 2. FH Structure 1/2

![](media/image4.png){width="6.0in" height="5.23351924759405in"}

[]{#_Toc523206087 .anchor}Figure 3. FH Structure 2/2

### sourceId_00e

Source identification that includes a Universal Time Coordinated (UTC)
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last
four-digits, represent the message sequence number in the range
\[0000-9999\].

### sourceTime_00e1 

This element consists in the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss,* where: *hh* stands for the
two-digit hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and *ss* stands for the two-digit seconds in the
range 00-59.

### sourceSeqNo_00e2

The message sequence number component of the sourceId_00e element.
Four-digit number in the range \[0000-9999\].

### flightId_02a 

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.

### computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**, such as *ddd, ddL, dLd, dLL*.

### eramGufi_316a

GUFI that uniquely identifies each flight plan in the system. This
element includes 10 alphanumeric characters: International Civil
Aviation Organization (ICAO) country code (one letter); en route
facility ID (one letter); time in seconds of current day (five digits in
the range 00000-86400); sequence number (two digits).

### sspId_167a

Site Specific Plan Identifier (SSPID). It is assigned by Instrument
Flight Procedures Automation (IFPA) to uniquely identify a flight plan
in each ERAM facility. One to four digits.

### numberOfAircraft_03a

This element includes the number of aircraft for the flight followed
optionally by the Special Aircraft Indicator. The element consists of
zero to two digits optionally followed by one uppercase letter to
represent the Special Aircraft Indicator. The indicator can also appear
on its own (without the leading digits).

### typeOfAircraft_03c

Type of aircraft. The element consists of one letter followed by one to
three alphanumeric characters. Examples: **B52**, **B747**.

###  airborneEquip_03e

Airborne equipment qualifier. It consists of one alphanumeric character.
The element consists of one alphanumeric character, that can have one of
the following values: **A** -- Transponder with no Mode C, **B** --
Transponder with Mode C, **E** -- Flight Management System (FMS) with
Distance Measuring Equipment (DME)/DME and Inertial Reference Unit (IRU)
position updating, **G** -- Global Navigation Satellite System (GNSS),
including Global Positioning System (GPS) or Wide Area Augmentation
System (WAAS), with en route and terminal capability, **X** -- No
transponder, **W** -- Reduced Vertical Separation Minimums (RVSM)

###  beaconCode_04a

Beacon code. ***Note*:** As of SFDPS 1.3.1, if the flightState element
has a value of 'Canceled' or 'Proposed,' this element is only present in
the version of a message with FDPS_Restricted='R.' The element includes
four octal digits (i.e. 0-7). When the last two of the four digits are
zero, the beacon code is a non-discrete code. A discrete code is any
code not ending in 00.

###  externalBeaconCode_04b

External beacon. It contains the requested beacon code when the flight
plan is inbound from an adjacent Center or an adjacent Non-U.S.
Automated Facility, the requested beacon code is different from the
assigned beacon code, and the aircraft is not established on the
assigned beacon code. Then, if the facility is adapted to receive Field
(04b), Field 04b is be transmitted. ***Note:*** As of SFDPS 1.3.1, if
the flightState element has a value of 'Canceled' or 'Proposed', this
element is only present in the version of a message with
FDPS_Restricted='R'. It has the same format as element beaconCode_04a.

###  trueAirSpeed_05a

True airspeed expressed in knots. The format is two to four digits, in
the range 01 -- 3700 knots. Aircraft speed is required to be specified
by using one of the three possible elements: trueAirSpeed_05a,
machSpeed_05c or classifiedSpeed_05d.

###  machSpeed_05c

Mach speed. The letter **M** followed by three digits. The maximum value
is M500.

###  classifiedSpeed_05d

Adapted classified speed. It is not printed on flight strips. This
element may only include the string character **SC**.

###  coordFix_06a

> The Coordination fix represents the starting point to begin processing
> the flight plan route from one of the following points: The departure
> airport, the airfile fix or the adjacent center inbound coordination
> fix. For ARTS III flight plans, the coordination fix Field 06 is used
> as the inbound coordination fix or the outbound coordination fix or,
> for an ARTS internal flight, it can be the departure or destination
> airport. This element can have one of the following formats: Two to
> five alphanumeric characters for a fix name; the fix name as above
> followed by six digits, for a fix radial distance; four-digits
> followed by an optional alphabetic character, followed by a virgule
> ('/'), followed by four to five digits followed by an optional
> alphanumeric character for a lat/long; or three to four alphanumeric
> characters for a location identifier (LOCID).

###  coordStatusTime_07d

Coordination time that represents the starting time in hours and minutes
at the coordination fix. The element includes one letter followed by
four digits that represent time as *hhmm*. Possible values are **A** --
Aircraft arrived at destination airport, **D** -- Aircraft has departed
from the departure airport, **E** -- Active aircraft, **P** -- Proposed
flight plan, or **F** - Flush flight plan. In the case of F, the
adjacent Host Center is performing a shutdown. The adjacent center
activates a pending Proposed flight plans with an 'F' Flush time and
sends the flight plans to the adjacent ERAM. Flush times are only used
Host to ERAM. The receiving ERAM processes the 'F' Flush time as a 'P'
Proposed time.)

###  coordStatus_07d1

The coordStatus field is the single letter **A**, **D**, **E**, **F**,
or **P**. **A** -- Aircraft arrived at destination airport, **D** --
Aircraft has departed from the departure airport, **E** -- Active
aircraft, **P** -- Proposed flight plan, or **F** - Flush flight plan.
In the case of F, the adjacent Host Center is performing a shutdown. The
adjacent center activates a pending Proposed flight plans with an 'F'
Flush time and sends the flight plans to the adjacent ERAM. Flush times
are only used Host to ERAM. The receiving ERAM processes the 'F' Flush
time as a 'P' Proposed time.

###  coordTime_07d2

Starting time at the coordination fix.

###  delayTime_07e

Delay time in expressed in minutes. Three digits.

###  assignedAlt_08a

Assigned altitude or flight level expressed in hundreds of feet. Only
one of the altitude elements assignedAlt_08a, assignedAlt_08b,
assignedAlt_08c, assignedAlt_08d, assignedAlt_08e, assignedAlt_08f,
assignedAlt_08g, assignedAlt_08h may be included in the message. The
format consists of either two to three digits, or the constant string
**VFR** (Visual Flight Rules). Three digits are required for ARTS III,
thus a leading zero needs to be used when necessary.

###  assignedAlt_08b 

Fixed value of **OTP** which indicates VFR-ON-Top. It specifies that the
aircraft is flying above the clouds in VFR conditions.

###  assignedAlt_08c 

VFR-ON-Top with altitude. It represents an Instrument Flight Rules (IFR)
flight operating above the clouds in VFR conditions at the specified
assigned altitude. The format is the constant string **OTP/** followed
by two to three digits that represent the assigned altitude in hundreds
of feet. The sample value **OTP/250** means the aircraft is flying
VFR-On-Top at 25,000 feet.

###  assignedAlt_08d 

The assigned block of altitudes for the flight to fly at. The format
consists of the string **ABV/** followed by two to three digits that
represent the altitude in hundreds of feet above which the flight is
flying. ABV is an abbreviation for "above." The lowest altitude is
listed first. An example: **80B140**, meaning the flight is assigned an
altitude block of 8,000 feet to 14,000 feet.

###  assignedAlt_08e 

Element used for IFR flights operating above a specified altitude. The
format consists of the string **ABV/** followed by two to three digits
that represent the altitude in hundreds of feet above which the flight
is flying. An example: **ABV/600**, meaning the flight is flying above
60,000 feet.

###  assignedAlt_08f 

Assigned Altitude/FIX/Altitude element specifies the altitudes to and
from a fix for the flight to fly at. The altitudes are specified in
hundreds of feet in a two to three digit format. The fix is specified
using the same format as the coordination fix element *coordFix_06a* in
4.1.16. The fix cannot be the departure or arrival point. For example,
**240/DAL350010/220** means to fly at 24,000 feet until reaching the fix
radial distance represented by DAL350010, and then descend to 22,000
feet. The fix cannot be the arrival or departure point.

###  assignedAlt_08g 

It is used to specify that the flight is flying Visual Flight Rules
(VFR). It can only have the value **VFR**.

###  assignedAlt_08h 

It is used to specify that the flight is flying VFR at a specified
altitude. The format consists of the string **VFR/** followed by two to
three digits that represent an altitude in hundreds of feet.

###  requestedAlt_09a 

The element is used to specify requested altitude or flight level in
hundreds of feet. Only one of the seven requested altitude elements
(requestedAlt_09a to requestedAlt_08g) may be included in a proposed
flight message. The format consists of two to three digits. ARTS III
requires three characters, with a leading **0** when required (such as
090). For example, an assigned altitude of **340** means that the
aircraft is requesting to fly at 34,000 feet. At most, only one of the
Requested Altitude fields (09a -- 09g) will be included in a proposed
flight message.

###  requestedAlt_09b 

The element Requested Altitude format OTP represents an IFR flight
requesting to operate above the clouds in VFR conditions. OTP stands for
VFR-ON-Top. The element has a fixed value of OTP.

###  requestedAlt_09c 

The element "Requested Altitude format OTP with altitude" represents a
flight requesting to operate VFR-ON-Top at the requested altitude. The
format consists of the string OTP/ followed by two to three digits that
represent the requested altitude in hundreds of feet. ERAM only sends
ARTS III the requested altitude with a format of three digits (leading
zeroes used when necessary, as in 090) and places a special altitude
indicator (U if Heavy Jet) in element numberOfAircraft_03a. The sample
value **OTP/250** means the aircraft is requesting VFR-On-Top at 25,000
feet.

###  requestedAlt_09d 

Element used for an IFR flight requesting to operate above a specified
altitude. The format consists of the string **ABV/** followed by two to
three digits that represent the requested altitude in hundreds of feet.
An example: **ABV/600**, meaning the flight is requesting to fly above
60,000 feet.

###  requestedAlt_09e 

Element used to specify a requested block of altitudes or flight levels
for the flight to fly at. The altitudes are specified in hundreds of
feet. The format consists of two to three digits for the lowest
altitude, followed by the letter **B**, followed by two to three digits
for the highest altitude. An example: **80B140.**

###  requestedAlt_09f 

This element is used when the aircraft is requesting to fly VFR. It can
only include the fixed string "VFR." ERAM sends ARTS III the three
characters and also places a special altitude indicator **V** (not a
Heavy Jet) or **W** (if a Heavy Jet) in element numberOfAircraft_03a.

###  requestedAlt_09g 

The element used to represent a flight requesting to fly VFR at a
specified altitude. The format consists of the constant string **VFR/**
followed by two to three digits that specify the requested altitude in
hundreds of feet.

###  flightPlanRoute_10a 

The purpose of this field is to show how the flight will fly from the
departure airport to the arrival airport. The route field 10 filed by
the pilot can be very complex, considering that some flights fly half
way around the world. Therefore, the route field contains several
elements and sub-elements to describe the pilot's intentions as the
flight progresses from the departure airport to the arrival airport. It
is specified as a string field, which is made up of a chain of fixes and
routes in the FIX.ROUTE.FIX format. Elements in the sequence can be
implied, such as FIX..FIX, or ROUTE..ROUTE. A complete description of
all the possible subfield formats is beyond the scope of this document.
For example: **OKC.V14S.TUL.TUL090..FYV270.FYV**.

###  departurePoint_26a

It is used to specify the point at which to start processing the flight
plan route as follows: The departure airport or the airfile point. Any
of the standard ways to represent a fix can be used for this element
(fix name, lat/long, or fix-radial-distance), including the standard
airport designators. Some examples are: **AB, DFW, KDFW, SHP090015,
3500N/04000W**.

###  destination_27a

It is used to specify the point at which to end processing the flight
plan route. Any of the standard ways to represent a fix can be used for
this element (fix name, lat/long, or fix-radial-distance), including the
standard airport designators. Some examples are: **AB**, **DFW**,
**KDFW**, **SHP090015**, **3500N/04000W**.

###  FAV_143b0

The element specifies the Fixed Airspace Volume (FAV) number containing
the first fix where the route alteration occurs due to an Adapted
Arrival Route\
(AAR) application. The format is four digits.

###  FAV_143b1

The element specifies the FAV number containing the second fix where the
route alteration occurs due to an AAR application. The format is four
digits.

###  FAV_143b2

The element specifies the FAV number containing the third fix where the
route alteration occurs due to an AAR application. The format is four
digits.

###  FAV_143b3

The element specifies the FAV number containing the fourth fix where the
route alteration occurs due to an AAR application. The format is four
digits.

###  ADARId_141a

If required for the flight, this element specifies the Adapted Departure
and Arrival Route (ADAR) name. The format consists of five alphanumeric
characters.

###  ADRId_141b

If required for the flight, the Adapted Route indicator format specifies
the Adapted Departure Route (ADR) name. The format consists of five
alphanumeric characters.

###  AARId_141c

If required for the flight, this element specifies the AAR name. The
format consists of five alphanumeric characters.

###  ADARFld10_142a

This element contains the adapted ADAR preferential route in Field 10
format. The Preferential Route alphanumerics are used to control the
flow and separation of traffic departing and arriving at designated
airports. An ADAR has the complete preferential routing from the
departure airport to the arrival airport. Either this element or the
element ADARNonFld10_142b may be included in the message. For example:
.**PSX2.PSX.V20.CRP**.

###  ADARNonFld10_142b

This element contains the adapted ADAR preferential route in non-Field
10 format. If required for the flight and if the element ADARFld10_142a
is not included in the message, the FH message contains this element for
the ADAR adapted route. Either this element or the element
ADARFld10_142a may be included in the message. A "+" delimiter precedes
and follows the non-Field10 elements. For example: **+TS1 MEM270
LIT050+**.

###  ADRFld10_142c

Adapted ADR preferential route in Field 10 format. Either this element
or the element ADRNonFld10_142d may be included in the message. For
example: **./.WOTRO.MAIER4**

###  ADRNonFld10_142d

Adapted ADR preferential route in non-Field 10 format. Either this
element or the element ADRFld10_142c may be included in the message. A
"+" delimiter precedes and follows the non-Field10 elements. For
example: **+RV SACO58065+FMG.J32**.

###  AARFld10_142e

This element includes the AAR preferential route in Field 10 format.
Either this element or the element AARNonFld10_142f may be included in
the message. For example: **./.BLEUZ.RYTHM3**.

###  AARNonFld10_142f

This element includes the AAR preferential route in non-Field 10 format.
Either this element or the element AARFld10_142e may be included in the
message. A "+" delimiter precedes and follows the non-Field10 elements.
For example: **J25.CRP+LISSE6+**.

###  remarks_11c

Flight plan remarks text. The string is from 1 to 400 characters in
length. It has an attribute called *remarktype* with the possible values
of interfacility (between facilities) or intrafacility (within one
facility). For example:

-   \|ECON DESCENT

-   \|FRC

-   \|TCAS UNITED LIVERY

###  flightRules_908a

This element specifies the flight rules as one character as follows:
**I** = IFR, **V** = VFR, **Y** = IFR First, **Z** = VFR First. If **Y**
or **Z** is used, the point(s) at which a change of flight rules is
planned should be shown in the route.

###  typeOfFlight_908b

This element specifies the type of flight specified using one of the
following characters: **S** = Scheduled air transport, **N** =
Non-scheduled air transport, **G** = General Aviation, **M**= Military,
**O** = Other flights.

###  wakeTurbulenceCat_909c

Wake turbulence category specified using one of the following
characters: **H** = Heavy, **M** = Medium, **L** = Light

###  comNavApproachEquip_910a

Pre-2012 ICAO format Airborne Equipment Qualifier: Radio Communication,
Navigation, and Approach AID Equipment. This element has one required
plus 24 optional letters. The 25 possible letters are the letters **A**
through **Z** and each letter can only be used once. If the letter **N**
is present, it must be the only letter present. If the AH message is
sent using ICAO2012 format, then it will include Field 910c. If the AH
message is sent using Indeterminate ICAO format, then it will include
Field 910c and will also include Field 910a with the same value. Legacy
ICAO format letter codes correspond to: **N** -- No equipment is
carried, or equipment is unserviceable, **S** -- Standard equipment is
carried and is serviceable, **C** -- Long Range Navigation (LORAN C),
**D** -- DME, **F** -- Automatic Direction Finder (ADF), **G** -- GNSS,
**H** -- High Frequency (HF) RTF, **I** -- Inertial Navigation, **J**
--Data link, **K** -- MLS, **L** -- ILS, **M** -- Omega, **O** -- Very
High Frequency Omnidirectional Range (VOR), **R** -- Performance Based
Navigation (PBN) approved, **T** -- Tactical Air Navigation System
(TACAN), **U** -- Ultra High Frequency (UHF) RTF, **V** -- Very High
Frequency (VHF) RTF, **W** -- RVSM approved, **X** -- Minimum Navigation
Performance Specifications (MNPS) approved, **Y** -- VHF with 8.33 kHz
spacing capacity, **Z** -- Other equipment carried. For example:
**SCHJ**.

###  survEquip_910b

This element represents the ICAO airborne equipment qualifier. The
format consists of up to two letters. The first letter must be one of
the Secondary Surveillance Radar (SSR) equipment letters and the second
letter, if used, must be the Automated Dependent Surveillance (ADS)
capability letter **"D."** The valid values for the first letter and
their significance are: **N**: Nil, **A**: Transponder Mode A, **C**:
Transponder Mode A and C, **X**: Transponder Mode S without both
aircraft ID and pressure-altitude transmission, **P**: Transponder Mode
S, with pressure- altitude transmission but aircraft ID transmission,
**I**: Transponder Mode S with aircraft ID transmission but no
pressure-altitude transmission, **S**: Transponder Mode S with both
pressure-altitude and aircraft ID transmission, **D**: ADS capability.

###  comNavApproachEquipICAO2012_910c 

This element is the ICAO 2012 version of the element
comNavApproachEquip_910a. The valid values are: **N** -- No equipment is
carried, or equipment is unserviceable, **S** -- Standard equipment is
carried and is serviceable, **A** -- Ground Based Augmentation System
(GBAS) landing system **B** -- Localizer Performance with Vertical
Guidance (LPV) (Approach Procedures with Vertical Guidance (APV) with
Satellite Based Augmentation System (SBAS)), **C** -- Long Range
Navigation (LORAN C), **D** -- DME, **E1** -- Flight Management Computer
(FMC) Waypoint Position Reporting (WPR) Aircraft Communications
Addressing, and Reporting System (ACARS), **E2** -- Digital Flight
Information Service (D-FIS) ACARS, **E3** -- Pre Departure Clearance
(PDC) ACARS, **F** -- Automatic Direction Finder (ADF), **G** -- GNSS,
**H** -- High Frequency (HF) RTF, **I** -- Inertial Navigation, **J1**
-- Controller Pilot Data Link Communication (CPDLC) Aeronautical
Telecommunication Network (ATN) Very High Frequency Data Link (VDL) Mode
2, **J2** -- CPDLC Future Air Navigation System (FANS) 1/A High
Frequency Data Link (HFDL), **J3** - CPDLC FANS 1/A VDL Mode A, **J4** -
CPDLC FANS 1/A VDL Mode 2, **J5** - CPDLC FANS 1/A Satellite
Communications (SATCOM) (INMARSAT), **J6** - CPDLC FANS 1/A SATCOM
\[Multifunction Transport Satellite (MTSAT)\], **J7** - CPDLC FANS 1/A
SATCOM (Iridium), **K** -- MLS, **L** -- ILS, **M1** -- ATC
Radiotelephony (RTF) SATCOM (INMARSAT), **M2** - ATC RTF SATCOM
\[Multifunction Transport Satellite (MTSAT)\], **M3** -- ATC RTF
(Iridium), **O** -- Very High Frequency Omnidirectional Range (VOR),
**P1-P9** -- Reserved for Required Communications Performance (RCP),
**R** -- Performance Based Navigation (PBN) approved, **T** -- Tactical
Air Navigation System (TACAN), **U** -- Ultra High Frequency (UHF) RTF,
**V** -- Very High Frequency (VHF) RTF, **W** -- RVSM approved, **X** --
Minimum Navigation Performance Specifications (MNPS) approved, **Y** --
VHF with 8.33 kHz spacing capacity, **Z** -- Other equipment carried.
For example: **ADE3RV**

###  survEquipICAO2012_910d

This element is the ICAO 2012 equivalent of the element survEquip_910b.
Minimum element length = 1, Maximum element length = 20. The valid
values are the following: **N** *-- No surveillance equipment or*
equipment unserviceable, **A** -- Transponder Mode A, **C** --
Transponder Mode A and C, **E** -- Transponder -- Mode S, including
aircraft identification, pressure-altitude and extended squitter
Automated Dependent Surveillance-Broadcast (ADS- B) capability, **H** --
Transponder -- Mode S, including aircraft identification,
pressure-altitude and enhanced surveillance capability, **I** -
Transponder -- Mode S, including aircraft identification, but no
pressure- altitude capability, **L** -- Transponder -- Mode S, including
aircraft identification, pressure-altitude, extended squitter (ADS-B)
and enhanced surveillance capability, **P** -- Transponder -- Mode S,
including pressure-altitude, but no aircraft identification, **S** --
Transponder -- Mode S, including both pressure-altitude and aircraft
identification capability, **X** -- Transponder - Mode S with neither
aircraft identification nor pressure- altitude capability, **B1** --
ADS-B with dedicated 1090 megaHertz (mHz), ADS-B "out" capability,
**B2** -- ADS-B with dedicated 1090 mHz ADS-B "out" and "in" capability,
**U1** -- ADS-B "out" capability using Universal Access Transceiver
(UAT), **U2** -- ADS-B "out" AND "IN" capability using UAT, **V1** --
ADS-B "out" capability using VDL Mode 4, **V2** -- ADS-B "out" and "in"
capability using VDL Mode 4, D1 -- Automatic Dependent
Surveillance-Contract (ADS-C) with FANS 1/A capabilities, **G1** --
ADS-C with ATN capabilities. For example: **HB2U2V2G1**.

###  altAero_916c

This element contains Alternate Arrival Point(s) or Aerodrome(s), if
any. More than one alternate arrival points of aerodromes may be
specified. The aerodrome is specified using the four-letter ICAO name or
ZZZZ if no ICAO location indicator has been allocated. The arrival point
format must be one of the fix formats described above (see in 4.1.16
coordFix_06a). If two or more alternatives are included, they may have
any of the valid formats and they have to be separated by blanks.

###  ICAOStoredFormat_918a

This element may only have the value zero, to indicate that none of the
Other Information elements (with suffixes 918b -- 918x) is present in
the message.

###  EETIndicator_918b

This element specifies Significant Points or Flight Information Region
(FIR) Boundary designators and accumulated estimated elapsed times to
such points or boundaries, when so prescribed on the basis of regional
air navigation agreements, or by the appropriate Air Traffic Service
(ATS) authority. **EET** stands for Estimated Elapsed Time. Freeform
text up to a total of 3,000 characters. The element consists of one or
more Significant Points with appended estimated flying time from
departure in *hhmm* format with a blank separating each occurrence of
Significant Point and time.

###  RIFIndicator_918c

This element specifies the route to a revised destination aerodrome,
followed by the aerodrome location code. The revised route is subject to
re-clearance in flight. **RIF** stands for Revised in Flight. Free-form
string of up to 3,000 characters. The destination aerodrome has to be
specified using the four-letter ICAO location code. For example: **DTA
HEC KLAX**.

###  REGIndicator_918d

This element specifies Aircraft Registration (tail number), if different
from the aircraft identification specified in element flightId-\_02a.
Free-form string of up to 3000 characters.

###  SELIndicator_918e

This element specifies the SELCAL code. SELCAL is a selective-calling
radio system that alerts aircraft crew to incoming radio communications.
Free-form string of up to 3000 characters.

###  OPRIndicator_918f

This field specifies the Aircraft Operator, if not obvious from the
aircraft identification in flightId_02a. Free-form string of up to 3000
characters.

###  STSIndicator_918g

This element specifies the Reason for Special Handling by ATS, such as
hospital aircraft. Free-form string of up to 3000 characters. The
following are the only valid special handling indicators:
**ALTRV**(Altitude Reservation), **ATFMX** (Exempt from Air Traffic Flow
Management), **FFR** (Fire Fighting), **FLTCK** (Flight Check),
**HAZMAT** (Hazardous Materials), **HEAD** (Head of State), **HOSP**
(Medical Flight), **HUM** (Humanitarian Flight), **MARSA** (Military
Assumes Responsibility for Separation), **MEDEVAC** (Life-critical
Medical Flight), **NONRVSM** (Non-Reduced Vertical Separation Minima
Operations in RVSM airspace), **SAR** (Search and Rescue), **STATE**
(Military, Customs, or Police), **NONRNP10** (Non-Required Navigation
Performance 10 NM Flight Operations in RNP10 airspace), **NONRPN10**,
**PROTECTED**, **CARGO**, **CARGO FLT.**

###  TYPIndicator_918h

Type(s) of Aircraft, preceded if necessary by number of aircraft, if
ZZZZ is specified in the element numberOfAircraft_03a. Free-form string
of up to 3000 characters.

###  PERIndicator_918i

This element specifies the aircraft performance data. Single valid
letter specified in PAN-OPS 8168 Volume 1: **A** -- Indicated airspeed
(IAS) less than 169 km/h (91kt), **B** -- IAS between 169 km/h (91kt)
and 224 km/h (121 kt), **C** -- IAS between 224 km/h (121 kt) and 261
km/h ( 141 kt), **D** -- IAS between 261 km/h ( 141 kt) and 307 km/h
(166 kt), **E** -- IAS between 307 km/h (166 kt) and 391 km/h (211 kt),
**H** -- Helicopters.

###  COMIndicator_918j

This element contains Communication Equipment Data. It is used for
additional Communication Equipment on board not specified in the
flightPlanRoute_10a element. Free-form string of up to 3000 characters.
For example: **UHF only**.

###  DATIndicator_918k

This element specifies data related to data link capability. Free-form
string of up to 3000 characters. Valid values are: **S** -- satellite
data link, **H** -- HF data link, **V** -- VHF data link, **M** --
Secondary Surveillance Radar (SSR) Mode S data link. One or more of the
valid letters may be specified in this element. For example: **SV**.

###  NAVIndicator_918l

This element contains Navigation Equipment Data. It is used for
additional Navigation Equipment not specified in the flightPlanRoute_10a
element. Free-form string of up to 3000 characters.

###  DEPIndicator_918m

This element contains the name of the Departure Aerodrome. Free-form
string of up to 3000 characters. If ZZZZ is inserted in Field 13, or the
ICAO four-letter location indicator of the location of the ATS unit from
which supplementary flight plan data can be obtained, if AFIL is
inserted in Field 13. **Note:** Field 13 does not appear in AH, FH, and
HU messages. For example: **NORTON FIELD**.

###  DESTIndicator_918n

This element includes the name of the destination aerodrome, if ZZZZ is
inserted in field 16. Free-form string of up to 3000 characters.
**Note:** Field 16 does not appear in AH, FH, and HU messages. Example:
**MILLSPAW FARM**.

###  ALTNIndicator_918o

This element includes the name of the alternate destination aerodrome(s)
, if ZZZZ is inserted in field 16. Free-form string of up to 3000
characters. **Note:** Field 16 does not appear in AH, FH, and HU
messages. Example: **MILLSPAW FARM**.

###  RALTIndicator_918p

This element contains the en route alternate aerodrome(s). Free-form
string of up to 3000 characters. For example: **JB RANCH**.

###  CODEIndicator_918q

This element specifies the aircraft CPDLC address. Free-form string of
up to 3000 characters. For example: **45FA16**.

###  RACEIndicator_918r

This element specifies the requested altitude and speed en route.
Free-form string of up to 3000 characters. For example:
**KRAFT/M080F380**.

###  SURIndicator_918s

This element specifies the surveillance applications or capabilities not
specified in localIntendedRoute_10b. Free-form string of up to 3000
characters. For example: **282B**.

###  DLEIndicator_918t

This element specifies significant en route delay or holding point(s),
followed by length of delay. Free-form string of up to 3000 characters.
The length of delay is specified in the format *hhmm*. For example:
**MDG0030**.

###  TALTIndicator_918u

This element specifies the take-off alternate aerodrome. Free-form
string of up to 3000 characters. Valid formats include aerodrome name or
any of the fix formats (i.e., lat/long, fix-radial-distance, or name).

###  DOFIndicator_918v

This element specifies the date of flight. Six-digit date in the format
*yymmdd*.

###  ORGNIndicator_918w

This element specifies the originator's eight-letter Aeronautical Fixed
Telecommunication Network (AFTN) address or other appropriate contact
details, in cases where the originator of the flight plan may not be
readily identified, as required by the appropriate ATS authority.
Eight-letter character string.

###  PBNIndicator_918x

This element specifies the Area Navigation (RNAV) or Required Navigation
Performance (RNP) capability. Up to eight two-character specifications
may be included, for a total of 16 characters. RNAV and RNP capabilities
are two characters each, as follows. **RNAV specifications**: **A1** -
RNAV10 (RNP 10), **B1** - RNAV 5 all permitted sensors, **B2** - RNAV 5
GNSS, **B3** - RNAV 5 DME/DME, **B4** - RNAV 5 VOR/DME, **B5** - RNAV 5
INS or IRS, **B6** - RNAV 5 LORANC, **C1** - RNAV 2 all permitted
sensors, **C2** - RNAV 2 GNSS, **C3** - RNAV 2 DME/DME, **C4** - RNAV 2
DME/DME/IRU, **D1** - RNAV 1 all permitted sensors, **D2** - RNAV 1
GNSS, **D3** - RNAV 1 DME/DME, **D4** - RNAV 1 DME/DME/IRU. **RNP
specifications**: **L1** - RNP 4, **O1** - Basic RNP 1 all permitted
sensors, **O2** - Basic RNP 1 GNSS, **O3** - Basic RNP 1 DME/DME,
**O4** - Basic RNP 1 DME/DME/IRU, **S1** - RNP Approach (APCH), **S2** -
RNP APCH with Barometic Vertical Navigation (BAR-VNAV), **T1** - RNP AR
APCH with RF (special authorization required), **T2** - RNP AR APCH
without RF (special authorization required).

###  RNVArrival_925a

This element specifies the RNAV accuracy value for the arrival phase of
the flight expressed in hundredths (.01) nm. The allowable range is
0001-9999. If the value is 0 then the field is not included. For
example: **0030**.

###  RNVEnroute_925b

This element specifies the RNAV accuracy value for the en route phase of
the flight expressed in hundredths (.01) nm. The allowable range is
0001-9999. If the value is 0 then the field is not included. For
example: **0030**.

###  RNVOceanic_925c

This element specifies the RNAV accuracy value for the oceanic phase of
the flight expressed in hundredths (.01) nm. The allowable range is
0001-9999. If the value is 0 then the field is not included. For
example: **0030**.

###  RNVDeparture_925d

This element specifies the RNAV accuracy value for the departure phase
of the flight expressed in hundredths (.01) nm. The allowable range is
0001-9999. If the value is 0 then the field is not included. For
example: **0030**.

###  RNVSpare1_925e

This is a spare element.

###  RNVSpare2_925f

This is a spare element.

###  RNPArrival_925g

This element specifies the RNP accuracy value for the arrival phase of
the flight expressed in hundredths (.01) nm. The allowable range is
0001-9999. If the value is 0 then the field is not included. For
example: **0030**.

###  RNPEnroute_925h

This element specifies the RNP accuracy value for the en route phase of
the flight expressed in hundredths (.01) nm. The allowable range is
0001-9999. If the value is 0 then the field is not included. For
example: **0030**.

###  RNPOceanic_925i

This element specifies the RNP accuracy value for the oceanic phase of
the flight expressed in hundredths (.01) nm. The allowable range is
0001-9999. If the value is 0 then the field is not included. For
example: **0030**.

###  RNPDeparture_925j

This element specifies the RNP accuracy value for the departure phase of
the flight expressed in hundredths (.01) nm. The allowable range is
0001-9999. If the value is 0 then the field is not included. For
example: **0030**.

###  RNPSpare1_925k

This is a spare element.

###  RNPSpare2_925l

This is a spare element.

###  ICAO1stAdaptedField18_999a through ICAO1stAdaptedField18_999y

Elements having the suffix of \_999a through \_999y contain the data
that is that is present for the optionally adapted element 918
indicators that are transmitted to CMS, when applicable, using a Field
Reference Number of 999, with elements a through y. They are formatted
as free-form text. Free-form string of up to 3,000 characters.

###  localIntendedRoute_10b

The Local Intended Route element contains the flight plan route that is
coordinated to penetrated facilities. It consists of the flight plan
route with any expected-to-be-applied-by-the-controlling- center ADRs,
ADARs or AARs already applied. It is intended for the clients that wish
to know the expected state of the flight plan when the current facility
releases control of the flight. Element localIntendedRoute_10b contains
the filed route (field 10a) merged with any locally applicable adapted
routes (preferential routes, transition fixes and A-line fixes).
Optional Field 10b is sent to ATM-IPOP, when Field 10b is not the same
as Field 10a. Minimum length = 3, Maximum length = 1000.

###  ATCIntendedRoute_10c

The ATC Intended Route element contains the current cleared flight plan
route with any unacknowledged auto routes already applied. The ATC
Intended Route includes to-be-applied AARs that are not to be notified
in the current center. It is intended for clients that wish to know the
currently expected route of the flight across contiguous ERAM airspace.
Field 10c contains the filed route (field 10a) merged with any adapted
routes (preferential routes, transition fixes and A-line fixes).
Optional Field 10c is sent to ATM-IPOP, when parameter Merged ATC
Intended Route Switch (MARS) is ON and if either one of the following is
true: If Field 10b exists and Field 10c is not the same as Field 10b or
if Field 10b does not exist and Field 10c is not the same as Field 10a.
Minimum length = 3, Maximum length = 1000.

## Flight Amendment Information -- AH

The structural diagram and data elements for Flight Amendment are
identical to those of the Flight Plan and Flight Plan Update. Refer to
**4.1 Flight Plan Information - FH** for specific information.

## Converted Route Information -- HX

![SFDPSSchema_v1.3.8_p165.png](media/image5.png){width="2.8541666666666665in"
height="2.9270833333333335in"}

[]{#_Toc523206088 .anchor}Figure 4. HX Structure

### sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last four
digits, represent the message sequence number in the range
\[0000-9999\].

### sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss,* where: *hh* stands for the
two-digit hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and *ss* stands for the two-digit seconds in the
range 00-59.

### sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

### flightId_02a

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.

### computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O.** One special all-alphabetic code may be used,
literally **XXX**. This special code is only used in DA (Data Accept)
messages in response to an ARTS VFR flight plan input.

### sspId_167a

Site Specific Plan Identifier. It is assigned by IFPA to uniquely
identify a flight plan in each ERAM facility. One to four digits.

### fixTimes

This element specifies the fix and calculated time of arrival at each
fix that describes the aircraft's ERAM converted route of flight.
Sequence of *fixTime_68c* elements. Minimum number of elements = 3,
Maximum number of elements = 326.

![SFDPSSchema_v1.3.8_p166.png](media/image6.png){width="2.7395833333333335in"
height="0.5208333333333334in"}

[]{#_Toc523206089 .anchor}Figure 5. fixTimes Structure

1.  

2.  

3.  

4.  1.  

    2.  

    3.  1.  
        2.  
        3.  
        4.  
        5.  
        6.  
        7.  

### fixTime_68c

This element contains a fix and the expected time of arrival at the fix
in hours and minutes. The format consists of a valid representation of a
fix (see element 4.1.16 coordFix_06a), followed by a virgule, and is
followed by time in *hhmm* format. Minimum length = 7, Maximum length =
17. Examples: **LFT/1800, JIMIE004034/1320**

### fixAndTime

If it is included in the message, this element specifies the fix and
calculated time of arrival at each fix that describes the aircraft's
ERAM converted route of flight. The fix and time of arrival at the fix
are specified in a format that breaks down the fix and the time in
separate elements: fix_68c1 and crossingTime_68c2. Sequence of elements
*fix_68c1* and *crossingTime_68c2*, specified between 3 and 326 times.

![SFDPSSchema_v1.3.8_p167.png](media/image7.png){width="3.40625in"
height="0.7083333333333334in"}

[]{#_Toc523206090 .anchor}Figure 6. fixAndTime Structure

#### fix_68c1

This element specifies the fix component of the element *fixTime_68c*.
The format consists of a valid representation of a fix (see element in
4.1.16 coordFix_06a in the FH message table).

#### crossingTime_68c2

This element specifies the time component of the element *fixTime_68c*.
The format is *dateTime*, and not *hhmm* as it is in the *fixTime_68c*
element.

## Cancellation Information -- CL

![SFDPSSchema_v1.3.8_p46.png](media/image8.png){width="2.8958333333333335in"
height="2.7708333333333335in"}

[]{#_Toc523206091 .anchor}Figure 7. CL Structure

### sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last four-
igits, represent the message sequence number in the range \[0000-9999\].

### sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss,* where: *hh* stands for the
two-digit hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and *ss* stands for the two-digit seconds in the
range 00-59

### sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

### flightId_02a

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.

### computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**.

### sspId_167a

Site Specific Plan Identifier. It is assigned by IFPA to uniquely
identify a flight plan in each ERAM facility. One to four digits.

### departurePoint_26a

The departure point is the point at which to start processing a flight
plan as follows: The departure airport, or the airfile point. When the
flight plan represents an airfile, originating within this center area,
this element contains the airfile point. Any of the allowed ways to
represent a fix can be used in this field, including the standard
airport designators. A fix name, lat/long or fix-radial-distance can
also be used. Some examples are: AB, DFW, KDFW, SHP090015, 3500N/04000W.

### destination_27a

The destination is the point at which to end processing the flight plan.
Any of the allowed ways to represent a fix can be used in this field,
including the standard airport designators. A fix name, lat/long or
fix-radial-distance can also be used. Some examples are: **AB**,
**DFW**, **KDFW**, **SHP090015**, **3500N/04000W**.

## Departure Information -- DH

![SFDPSSchema_v1.3.8_p91.png](media/image9.png){width="3.0208333333333335in"
height="5.177083333333333in"}

[]{#_Toc523206092 .anchor}Figure 8. DH Structure

### sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last four
digits, represent the message sequence number in the range
\[0000-9999\].

### sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss,* where: *hh* stands for the
two-digit hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and *ss* stands for the two-digit seconds in the
range 00-59.

### sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

### flightId_02a

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.

### computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**. One special all-alphabetic code may be used,
literally **XXX**. This special code is only used in DA (Data Accept)
messages in response to an ARTS VFR flight plan input. This field is
optional.

### sspId_167a

Site Specific Plan Identifier. It is assigned by IFPA to uniquely
identify a flight plan in each ERAM facility. One to four digits.

### numberOfAircraft_03a

This element includes the number of aircraft for the flight followed
optionally by the Special Aircraft Indicator. The element consists of
zero to two digits optionally followed by one uppercase letter to
represent the Special Aircraft Indicator. The indicator can also appear
on its own (without the leading digits). If no such designator has been
assigned, or in case of formation flights comprising more than one type,
**ZZZZ** is entered and the (numbers and) type(s) of aircraft are
entered in the **TYPIndicator_918h** field. An example of the number of
aircraft is a formation of military aircraft flying under one flight
plan. An example Special Aircraft Indicator is **H** for Heavy Jet.

### typeOfAircraft_03c

Type of aircraft. The element consists of one letter followed by one to
three alphanumeric characters. Some examples: **B52**, **B747**.

### airborneEquip_03e

Airborne equipment qualifier. It consists of one alphanumeric character.
The element consists of one alphanumeric character, that can have one of
the following values: **A** -- Transponder with no Mode C, **B** --
Transponder with Mode C, **E** -- FMS with DME/DME and IRU position
updating, **G** -- GNSS, including GPS or WAAS, with en route and
terminal capability, **X** -- No transponder, **W** -- RVSM.

###  departurePoint_26a

The departure point is the point at which to start processing a flight
plan as follows: The departure airport, or the airfile point. When the
flight plan represents an airfile, originating within this center area,
this element contains the airfile point. Any of the allowed ways to
represent a fix can be used in this field, including the standard
airport designators. A fix name, lat/long or fix-radial-distance can
also be used. Some examples are: **AB, DFW, KDFW, SHP090015,
3500N/04000W**.

###  coordStatusTime_07d

Coordination time that represents the starting time in hours and minutes
at the coordination fix. The element includes one letter followed by
four digits that represent time as *hhmm*. Possible values are **A** --
Aircraft arrived at destination airport, **D** -- Aircraft has departed
from the departure airport, **E** -- Active aircraft, **P** -- Proposed
flight plan, or **F** - Flush flight plan. In the case of F, the
adjacent Host Center is performing a shutdown. The adjacent center
activates a pending Proposed flight plans with an 'F' Flush time and
sends the flight plans to the adjacent ERAM. Flush times are only used
Host to ERAM. The receiving ERAM processes the 'F' Flush time as a 'P'
Proposed time.

###  coordStatus_07d1

The coordStatus field is the single letter **A**, **D**, **E**, **F**,
or **P**. Possible values are **A** -- Aircraft arrived at destination
airport, **D** -- Aircraft has departed from the departure airport,
**E** -- Active aircraft, **P** -- Proposed flight plan, or **F** -
Flush flight plan. In the case of F, the adjacent Host Center is
performing a shutdown. The adjacent center activates a pending Proposed
flight plans with an 'F' Flush time and sends the flight plans to the
adjacent ERAM. Flush times are only used Host to ERAM. The receiving
ERAM processes the 'F' Flush time as a 'P' Proposed time.

###  coordTime_07d2

Starting time at the coordination fix.

###  destination_27a

The destination is the point at which to end processing the flight plan.
Any of the allowed ways to represent a fix can be used in this field,
including the standard airport designators. A fix name, lat/long or
fix-radial-distance can also be used. Some examples are: **AB**,
**DFW**, **KDFW**, **SHP090015**, **3500N/04000W**.

###  ETA_28a

Estimated Time of Arrival (ETA) at destination in hours and minutes. ETA
supplied only if the ETE was filed with the flight plan. Four digits
representing time in format hhmm.

## Aircraft Identification Amendment Information -- IH

![SFDPSSchema_v1.3.8_p196.png](media/image10.png){width="3.0520833333333335in"
height="3.8020833333333335in"}

[]{#_Toc523206093 .anchor}Figure 9. IH Structure

### sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last four
digits, represent the message sequence number in the range
\[0000-9999\].

### sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss*, where: *hh* stands for the
two-digit hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and *ss* stands for the two-digit seconds in the
range 00-59.

### sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

### flightId_02a

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.

### computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**. One special all-alphabetic code may be used,
literally **XXX**. This special code is only used in DA (Data Accept)
messages in response to an ARTS VFR flight plan input.

### sspId_167a

Site Specific Plan Identifier. It is assigned by IFPA to uniquely
identify a flight plan in each ERAM facility. One to four digits.

### newFlightId_02aN

The new Aircraft ID, or flight ID (also called Call Sign), that has been
changed by the IH message. It has a variable format, starting with one
uppercase alphabetic character, followed by one to six alphanumeric
characters. When it is only two characters long, the format must be one
letter followed by one digit, such as **A1** for Air Force One.

### newComputerId_02dN

This element contains the new Computer ID that has been changed by the
IH message. The computer ID is represented by three alphanumeric
characters, as specified by the pattern in 4.6.5. The letters **I** and
**O** are prohibited. One special all alphabetic code may be used,
literally, XXX. This is only used in Data Accept (DA) messages in
response to an ARTS VFR flight plan input.

### newSspId_167aN

This element contains the new Site Specific Plan Identifier that has
been changed by the IH message. The format consists of one to fourdigit
string in a range from 0 -- 4000.

### departurePoint_26a

The departure point is the point at which to start processing a flight
plan as follows: The departure airport, or the airfile point. When the
flight plan represents an airfile, originating within this center area,
this element contains the airfile point. Any of the allowed ways to
represent a fix can be used in this field, including the standard
airport designators. A fix name, lat/long or fix-radial-distance can
also be used. Some examples are: **AB, DFW, KDFW, SHP090015,
3500N/04000W**.

### destination_27a

The destination is the point at which to end processing the flight plan.
Any of the allowed ways to represent a fix can be used in this field,
including the standard airport designators. A fix name, lat/long or
fix-radial-distance can also be used. Some examples are: **AB**,
**DFW**, **KDFW**, **SHP090015**, **3500N/04000W**.

## Hold Information -- HH

![SFDPSSchema_v1.3.8_p153.png](media/image11.png){width="4.28125in"
height="3.1145833333333335in"}

[]{#_Toc523206094 .anchor}Figure 10. HH Structure

### sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last four
digits, represent the message sequence number in the range
\[0000-9999\].

### sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss*, where: *hh* stands for the
two-digithour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and *ss* stands for the two-digit seconds in the
range 00-59.

### sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

### flightId_02a

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.

### computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**, as specified by the pattern above. One special
all-alphabetic code may be used, literally **XXX**. This special code is
only used in DA (Data Accept) messages in response to an ARTS VFR flight
plan input.

### sspId_167a

Site Specific Plan Identifier. It is assigned by IFPA to uniquely
identify a flight plan in each ERAM facility. One to four digits.

### holdDataFix_21a

This element specifies the position location for the flight to hold
along the filed route of flight. If the message does not include the
optional *holdDataTime_21d* element, the flight goes into an indefinite
hold status when the flight arrives at the hold fix. Any of the valid
fix formats can be used, as described for *coordFix_06a* element in
4.1.16.

### holdDataTime_21d

This element specifies the time the flight can expect further clearance
at the holding location specified in the element *holdDataFix_21a*. This
element can only be included in the HH messages if the element
*holdDataFix_21a* is also included.

### holdDataAction_21e

This element is used in a Hold message to terminate an existing stored
hold. It can only be included in a Hold message if the element
*holdDataFix_21a* is not included. This element can only specify the
letter **C**.

## Progress Report -- PH

![SFDPSSchema_v1.3.8_p247.png](media/image12.png){width="3.1770833333333335in"
height="2.7708333333333335in"}

[]{#_Toc523206095 .anchor}Figure 11. PH Structure

### sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last
four-digits, represent the message sequence number in the range
\[0000-9999\].

### sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss*, where: *hh* stands for the
two-digit hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and ss stands for the two-digit seconds in the range
00-59.

### sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

### flightId_02a

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.
When it is only two characters long, the format is one letter followed
by one digit, such as A1 for Air Force One.

### computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**. One special all-alphabetic code may be used,
literally **XXX**. This special code is only used in DA (Data Accept)
messages in response to an ARTS VFR flight plan input.

### sspId_167a

Site Specific Plan Identifier. It is assigned by IFPA to uniquely
identify a flight plan in each ERAM facility. One to four digits.

### progressReportFix_18a

This element specifies the position location report of the flight along
the filed route of flight. It uses the standard fix formats, as
specified for the element *coordFix_06a* in 4.1.16*.*

### progressReportTime_18d

This element specifies the time of the flight arriving at the fix
specified in element *progressReportFix_18a*, above.

## Flight Arrival Information -- HV

![SFDPSSchema_v1.3.8_p164.png](media/image13.png){width="2.8958333333333335in"
height="3.1145833333333335in"}

[]{#_Toc523206096 .anchor}Figure 12. HV Structure

### sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last four
digits, represent the message sequence number in the range
\[0000-9999\].

### sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss*, where: *hh* stands for the
two-digit hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and ss stands for the two-digit seconds in the range
00-59.

### sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

### flightId_02a

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.
When it is only two characters long, the format is one letter followed
by one digit, such as A1 for Air Force One.

### computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**. One special all-alphabetic code may be used,
literally **XXX**. This special code is only used in DA (Data Accept)
messages in response to an ARTS VFR flight plan input.

### sspId_167a

Site Specific Plan Identifier. It is assigned by IFPA to uniquely
identify a flight plan in each ERAM facility. One to four digits.

### departurePoint_26 a

This element specifies the point at which to start processing the flight
plan. It uses the standard fix formats, as specified for the element
*coordFix_06a* in 4.1.16. Any of the allowed ways to represent a fix can
be used in this field, including the standard airport designators. A fix
name, lat/long, or fix-radial-distance can also be used. Some examples
are: **AB, DFW, KDFW, SHP090015, 3500N/04000W**.

### destination_27a

This element specifies the destination, which is the point at which to
end processing the flight plan. It uses the standard fix formats, as
specified for the element *coordFix_06a* in 4.1.16. Any of the allowed
ways to represent a fix can be used in this field, including the
standard airport designators. A fix name, lat/long, or
fix-radial-distance can also be used. Some examples are: **AB, DFW,
KDFW, SHP090015, 3500N/04000W**.

### arrivalTime_28b

This element specifies the reported time of arrival. Where the first
letter can be **A** or **E**, as follows: **A:** if time received in
field 00 of Terminate Beacon Code (TB) message caused flight to be
dropped, **E:** if flight dropped by application of Arrival Fix Drop
Interval (AFDI) or Expire Fix Drop Interval (EFDI). The four digits
specify time in *hhmm* format.

## Flight Plan Update Information -- HU

The structural diagram and data elements for Flight Plan Update are
identical to those of the Flight Plan and Flight Amendment Information.
Refer to **4.1 Flight Plan Information - FH** for specific information.

## Expected Departure Time Information -- ET

![SFDPSSchema_v1.3.8_p107.png](media/image14.png){width="3.9270833333333335in"
height="2.7708333333333335in"}

[]{#_Toc523206097 .anchor}Figure 13. ET Structure

###  sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last
four-digits, represent the message sequence number in the range
\[0000-9999\].

###  sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss*, where: *hh* stands for the
two-digit hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and ss stands for the two-digit seconds in the range
00-59.

###  sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

###  flightId_02a

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.

###  computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**. One special all-alphabetic code may be used,
literally **XXX**. This special code is only used in DA (Data Accept)
messages in response to an ARTS VFR flight plan input.

###  sspId_167a

Site Specific Plan Identifier. It is assigned by IFPA to uniquely
identify a flight plan in each ERAM facility. One to four digits.

###  EDCT_92a

This element specifies the Estimated Departure Clearance Time. Time
expressed in *hhmm* format.

###  cancellationIndicator_92 b

This element is used to cancel the Expect Departure Clearance Time
(EDCT) for an aircraft. This element can only specify the letter **C**.

## Position Update -- HP

![SFDPSSchema_v1.3.8_p158.png](media/image15.png){width="2.9895833333333335in"
height="3.8020833333333335in"}

[]{#_Toc523206098 .anchor}Figure 14. HP Structure

###  sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last
four-digits, represent the message sequence number in the range
\[0000-9999\].

###  sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss*, where: *hh* stands for the
two-digit hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and ss stands for the two-digit seconds in the range
00-59.

###  sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

###  flightId_02a

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.

###  computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**. One special all-alphabetic code may be used,
literally **XXX**. This special code is only used in DA (Data Accept)
messages in response to an ARTS VFR flight plan input.

###  sspId_167a

Site Specific Plan Identifier. It is assigned by IFPA to uniquely
identify a flight plan in each ERAM facility. One to four digits.

###  coordFix_06a

The Coordination fix represents the starting point to begin processing
the flight plan route from one of the following points: The departure
airport, the airfile fix or the adjacent center inbound coordination
fix. For ARTS III flight plans the coordination fix Field 06 is used as
the inbound coordination fix or the outbound coordination fix or, for an
ARTS internal flight, it can be the departure or destination airport.
This element can have one of the following formats: Two to five
alphanumeric characters for a fix name; The fix name as above followed
by six digits, for a fix radial distance; four digits followed by an
optional alphabetic character, followed by a virgule ('/'), followed by
four to five digits followed by an optional alphanumeric character for a
lat/long; or three to four alphanumeric characters for a location
identifier (LOCID).

###  coordStatusTime_07d

Coordination time that represents the starting time in hours and minutes
at the coordination fix. The element includes one letter (possible
values are **A**, **D, E**, **P**, or **F**) followed by fourdigits that
represent time as *hhmm*. Possible values are **A** -- Aircraft arrived
at destination airport, **D** -- Aircraft has departed from the
departure airport, **E** -- Active aircraft, **P** -- Proposed flight
plan, or **F** - Flush flight plan. In the case of F, the adjacent Host
Center is performing a shutdown. The adjacent center activates a pending
Proposed flight plans with an 'F' Flush time and sends the flight plans
to the adjacent ERAM. Flush times are only used Host to ERAM. The
receiving ERAM processes the 'F' Flush time as a 'P' Proposed time.

###  coordStatus_07d1

The coordStatus field is the single letter **A**, **D**, **E**, **F**,
or **P**, as described for element coordStatusTime_07d. Possible values
are **A** -- Aircraft arrived at destination airport, **D** -- Aircraft
has departed from the departure airport, **E** -- Active aircraft, **P**
-- Proposed flight plan, or **F** - Flush flight plan. In the case of F,
the adjacent Host Center is performing a shutdown. The adjacent center
activates a pending Proposed flight plans with an 'F' Flush time and
sends the flight plans to the adjacent ERAM. Flush times are only used
Host to ERAM. The receiving ERAM processes the 'F' Flush time as a 'P'
Proposed time.

### coordTime_07d2

Starting time at the coordination fix.

### delayTime_07e

This element is used to provide an optional delay time. Three digits
representing time in minutes.

## Tentative Flight Plan Information -- NI

![SFDPSSchema_v1.3.8_p230.png](media/image16.png){width="3.0520833333333335in"
height="3.1145833333333335in"}

[]{#_Toc523206099 .anchor}Figure 15. NI Structure

###  sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last four
digits, represent the message sequence number in the range
\[0000-9999\].

###  sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss*, where: *hh* stands for the
two-digit hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and ss stands for the two-digit seconds in the range
00-59.

###  sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

###  flightId_02a

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.
When it is only two characters long, the format is one letter followed
by one digit, such as A1 for Air Force One

###  computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**. One special all-alphabetic code may be used,
literally **XXX**. This special code is only used in DA (Data Accept)
messages in response to an ARTS VFR flight plan input.

###  sspId_167a

Site Specific Plan Identifier. It is assigned by IFPA to uniquely
identify a flight plan in each ERAM facility. One to four digits.

###  newFlightId_02aN

The new Aircraft ID, or flight ID (also called Call Sign), that has been
changed by the NI message. It has a variable format, starting with one
uppercase alphabetic character, followed by one to six alphanumeric
characters. When it is only two characters long, the format must be one
letter followed by one digit, such as **A1** for Air Force One.

###  newComputerId_02dN

This element contains the new Computer ID that has been changed by the
NI message. The computer ID is represented by three alphanumeric
characters, as specified by the pattern above. The letters **I** and
**O** are prohibited. One special all alphabetic code may be used,
literally, XXX. This is only used in DA messages in response to an ARTS
VFR flight plan input.

###  newSspId_167aN

This element contains the new Site Specific Plan Identifier that has
been changed by the NI message. The format consists of oneto fourdigit
string in a range from 0 -- 4000.

## Tentative Flight Plan Removal -- NL

![SFDPSSchema_v1.3.8_p231.png](media/image17.png){width="3.3333333333333335in"
height="3.1145833333333335in"}

[]{#_Toc523206100 .anchor}Figure 16. NL Structure

###  sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last
four-digits, represent the message sequence number in the range
\[0000-9999\].

###  sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss*, where: *hh* stands for the
two-digit hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and ss stands for the two-digit seconds in the range
\[00-59\].

###  sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

###  flightId_02a

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.

###  computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**.

###  sspId_167a

Site Specific Plan Identifier. It is assigned by IFPA to uniquely
identify a flight plan in each ERAM facility. One to four digits.

###  mergedFPStatus_339a

This field contains the tentative flight plan merge status. The merge
status must be one of the following: **N** -- deletion without merge --
the tentative plan is deleted without merge; **S**\* -- merge -- an
active plan is merged into the tentative flight plan; the flight has the
same Computer Identification (CID) and Site Specific Plan Identifier as
the tentative plan; **D**\* -- merge -- a proposed plan is activated and
the tentative flight plan is merged into the activated plan; the flight
has the CID and Site Specific Plan Identifier of the activated plan
which are different from the tentative plan. \* Note: For field value
**S**, an FH is sent for the merged flight plan. For value **D**, an AH
or DH message is sent for the activated flight plan.

###  mergedFPComputerId_341a

This element specifies the merged flight plan computer ID. The format
consists of one digit followed by two alphanumeric characters.

###  mergedFPSspId_342a

This element contains the merged flight plan site-specific identifier.
If the merge is of an active flight into the tentative flight,
(*mergedFPStatus_339a*=S), the SSPID is the same as the tentative. If
the merge is due to activation of a proposed flight plan,
(*mergedFPStatus_339a*=D), the SSPID is that of the activated flight
plan.

## Tentative Flight Plan Amendment Information -- NU

![SFDPSSchema_v1.3.8_p235.png](media/image18.png){width="3.485171697287839in"
height="8.285714129483814in"}

[]{#_Toc523206101 .anchor}Figure 17. NU Structure

###  sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last four
digits, represent the message sequence number in the range
\[0000-9999\].

###  sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss*, where: *hh* stands for the
two-digit hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and ss stands for the two-digit seconds in the range
00-59.

###  sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

###  flightId_02a

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.

###  computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**.

###  sspId_167a

Site Specific Plan Identifier. It is assigned by IFPA to uniquely
identify a flight plan in each ERAM facility. One to four digits.

###  numberOfAircraft_03a

This element includes the number of aircraft for the flight followed
optionally by the Special Aircraft Indicator. The element consists of
zero to two digits optionally followed by one uppercase letter to
represent the Special Aircraft Indicator. The indicator can also appear
on its own (without the leading digits).

###  airborneEquip_03e

Airborne equipment qualifier. It consists of one alphanumeric character.
The element consists of one alphanumeric character, that can have one of
the following values: **A** -- Transponder with no Mode C, **B** --
Transponder with Mode C, **E** -- FMS with DME/DME and IRU position
updating, **G** -- GNSS, including GPS or WAAS, with en-route and
terminal capability, **X** -- No transponder, **W** -- RVSM.

###  beaconCode_04a

Beacon code. ***Note*:** As of SFDPS 1.3.1, if the flightState element
has a value of 'Canceled' or 'Proposed,' this element is only present in
the version of a message with FDPS_Restricted='R.' The element includes
four octal digits (i.e. 0-7). When the last two of the four digits are
zero, the beacon code is a non-discrete code. A discrete code is any
code not ending in 00.

### trueAirSpeed_05a

True airspeed expressed in knots. The format is two to four digits, in
the range 01 -- 3700 knots. Aircraft speed is required to be specified
by using one of the three possible elements: trueAirSpeed_05a,
machSpeed_05c or classifiedSpeed_05d.

### machSpeed_05c

Mach speed. The letter **M** followed by three digits. The maximum value
is M500.

### classifiedSpeed_05d

Adapted classified speed. It is not printed on flight strips. This
element may only include the string character **SC**.

### assignedAlt_08a

Assigned altitude or flight level expressed in hundreds of feet. Only
one of the altitude elements assignedAlt_08a, assignedAlt_08b,
assignedAlt_08c, assignedAlt_08d, assignedAlt_08e, assignedAlt_08f,
assignedAlt_08g, assignedAlt_08h may be included in the message. The
format consists of either two to three digits, or the constant string
**VFR**. Three digits are required for ARTS III, thus a leading zero
needs to be used when necessary.

### assignedAlt_08b 

Fixed value of **OTP** which indicates VFR-ON-Top. It specifies that the
aircraft is flying above the clouds in VFR conditions.

### assignedAlt_08c 

VFR-ON-Top with altitude. It represents an Instrument Flight Rules (IFR)
flight operating above the clouds in VFR conditions at the specified
assigned altitude. The format is the constant string **OTP/** followed
by two to three digits that represent the assigned altitude in hundreds
of feet.

### assignedAlt_08d 

The assigned block of altitudes for the flight to fly at. The format
consists of the string **ABV/** followed by two to three digits that
represent the altitude in hundreds of feet above which the flight is
flying.

### assignedAlt_08e 

Element used for IFR flights operating above a specified altitude. The
format consists of the string **ABV/** followed by two to three digits
that represent the altitude in hundreds of feet above which the flight
is flying.

### assignedAlt_08f 

Assigned Altitude/FIX/Altitude element specifies the altitudes to and
from a fix for the flight to fly at. The altitudes are specified in
hundreds of feet in a two to three digit format. The fix is specified
using the same format as the coordination fix element *coordFix_06a* in
4.1.16. The fix cannot be the departure or arrival point.

### assignedAlt_08g 

It is used to specify that the flight is flying VFR. It can only have
the value **VFR**.

### assignedAlt_08h 

It is used to specify that the flight is flying VFR at a specified
altitude. The format consists of the string **VFR/** followed by two to
three digits that represent an altitude in hundreds of feet.

### reportedAlt_54a

The element is used to specify the reported altitude. For aircraft with
operative Mode C capability, this element contains the Mode C altitude.
For aircraft without Mode C capability or with non-operative Mode C
capability, this element may contain the controller reported altitude.
If there is no Mode C or controller reported altitude, or the reported
altitude is negative, this element contains "0" or \"000\" or is
optional. The format consists of one to three digits that represent the
reported aircraft altitude in hundreds of feet. Leading zeros may be
inserted for altitudes of less than three digits.

### reportedAlt_54b

This field is the reported altitude B4 indicator. The ERAM controllers'
full data block used for tracking an aircraft has a special indicator
for the B4 character of the full data block. The format of this element
is one character as follows: **A** -- Reported altitude (controller
entered) equals single assigned altitude; **B** -- Beacon reported
altitude is in conformance or controller entered reported altitude is in
the block for an aircraft which has been assigned an altitude block (B1
to B3 - low altitude limit of block and C1 to C3=high altitude limit of
block); **C** -- Beacon reported altitude is within Altitude Conformance
Limits feet; **F** -- Reported altitude (controller entered) equals
first altitude or (beacon reported) is within Altitude Conformance
Limits of first altitude when assigned altitude is (d)dd/fix/(d)dd and
the first altitude is displayed in Field B; **N** -- No beacon reported
altitude has been received for the aircraft; no controller entered
reported altitude exists for the aircraft; or the aircraft's rate of
change is questionable and Computed Rate of Change is being used to make
further conformance checks; **T** -- Interim altitude is currently being
displayed in the assigned altitude field (B1 through B3); **V** --
Beacon reported or controller entered reported altitude, when no
assigned altitude exists for the aircraft; **X** -- Beacon reported
altitude becomes disestablished. (C1-C3 also contains \`X\' character.).
**\^** - Beacon reported or controller entered reported altitude is
below assigned altitude when flight is climbing; **v** -- Beacon
reported or controller entered reported altitude is above assigned
altitude when flight is descending; **+** - Beacon reported altitude
exceeds upper conformance limit for an aircraft which has reached it
assigned altitude or the controller entered reported altitude exceeds
the assigned altitude for a non-Mode C aircraft which has previously
been reported at the assigned altitude; **-** - Beacon reported altitude
is less than lower conformance limit for an aircraft which has reached
its assigned altitude or the controller entered reported altitude is
less than the assigned altitude for a non-Mode C aircraft which has
previously been reported at the assigned altitude; **/** - Flight type
is \`OTP\' or \`VFR.'

### reportedAlt_54c

The element specifies the reported altitude C4 indicator. The ERAM
controllers full data block used for tracking an aircraft has a special
indicator for the C4 character of the full data block as follows: If the
aircraft is not responding with the Mode C altitude, the controller
entered reported altitude is displayed in *reportedAlt_54c* with a pound
sign (#) or X in position C4 whenever (1) the controller entered
reported altitude does not equal the assigned altitude or is not within
the assigned altitude block, (2) no assigned altitude has been entered,
or (3) the assigned altitude is VFR, VFR/(d)dd, OTP, or OTP/(d)dd. In
either case for a Mode C reported altitude or a controller reported
altitude, when an interim altitude is displayed in *reportedAlt_54b* the
B4 character position contains the letter "T" and the reported altitude,
or either the lower or upper altitude of an assigned block altitude is
displayed in *reportedAlt_54c*. In the case where a controller entered
reported altitude exists, a pound sign (#) or X is displayed in the C4
position

### interimAlt_76b

This element specifies the interim altitude for the flight in hundreds
of feet. It is included in the message if an interim altitude is
assigned.

## Batch Track Information -- BATCH_TH

![SFDPSSchema_v1.3.8_p38.png](media/image19.png){width="3.0694444444444446in"
height="0.8604166666666667in"}

[]{#_Toc523206102 .anchor}Figure 18. Batch TH Structure

###  numberOfMsgs

This element specifies the number of individual Track Information
messages (TH) contained in the message.

###  singleTH

![SFDPSSchema_v1.3.8_p40.png](media/image20.png){width="3.232638888888889in"
height="0.7090277777777778in"}

[]{#_Toc523206103 .anchor}Figure 19. singleTH Structure

#### THmetadata

![SFDPSSchema_v1.3.8_p41.png](media/image21.png){width="3.9770833333333333in"
height="6.5465277777777775in"}

[]{#_Toc523206104 .anchor}Figure 20. THmetadata Structure

##### propFlightId

This element specifies the flight identification (aircraft id, call
sign) of the flight to which the message pertains. It represents a
property of the individual TH message within the BATCH_TH message. One
uppercase alphabetic character followed by one to six alphanumeric
characters.

##### propFlightOperator

This element specifies the Aircraft Operator, if not obvious from the
aircraft identification in propFlightId. It represents a property of the
individual TH message within the BATCH_TH message. Free-form string of
up to 3000 characters.

##### propOrigin

This element specifies the origin of the flight to which the message
pertains. It represents a property of the individual TH message within
the BATCH_TH message. Any of the standard ways to represent a fix can be
used for this element (fix name, lat/long, or fix-radial-distance),
including the standard airport designators.

##### propDestination

This element specifies the destination of the flight to which the
message pertains. It represents a property of the individual TH message
within the BATCH_TH message. Any of the standard ways to represent a fix
can be used for this element (fix name, lat/long, or
fix-radial-distance), including the standard airport.

##### propRcvdTime 

This element specifies the time at which the message was received by
SFDPS, in XML dateTime format. It represents a property of the
individual TH message within the BATCH_TH message.

##### propRcvdTimeEpoch

This element specifies the time at which the message was received by
SFDPS, in the form of number of seconds since January 1, 1970. It
represents a property of the individual TH message within the BATCH_TH
message.

##### propSentTime

This element specifies the time at which the message was sent from SFDPS
to NEMS, in XML dateTime format.It represents a property of the
individual TH message within the BATCH_TH message.

##### propSentTimeEpoch

This element specifies the time at which the message was sent from SFDPS
to NEMS, in the form of number of seconds since January 1, 1970. It
represents a property of the individual TH message within the BATCH_TH
message.

##### propSeqNo

This element specifies the messages sequence number. It represents a
property of the individual TH message within the BATCH_TH message.

##### propTestMsg

This element represents a property of the individual TH message within
the BATCH_TH message.

##### propOneMinFreq

This element allows TH messages to be distributed to a client at
one-minute intervals, rather than at their actual frequency, which is 12
seconds. This property should be set on every fifth TH message.

##### msgTimes

![SFDPSSchema_v1.3.8_p221.png](media/image22.png){width="3.441666666666667in"
height="1.395138888888889in"}

[]{#_Toc523206105 .anchor}Figure 21. msgTimes Structure

###### arrivalTime

This element specifies the arrival time of the flight, in XML dateTime
format.It represents a property of the individual TH message within the
BATCH_TH message.

###### arrivalTimeEpoch

This element specifies the arrival time of the flight, in the form of
number of seconds since January 1, 1970. It represents a property of the
individual TH message within the BATCH_TH message.

###### departureTime

This element specifies the departure time of the flight, in XML dateTime
format. It represents a property of the individual TH message within the
BATCH_TH message.

###### departureTimeEpoch

This element specifies the departure time of the flight, in the form of
number of seconds since January 1, 1970. It represents a property of the
individual TH message within the BATCH_TH message

##### flightState

This element contains the current status of the flight as specified by
SFDPS. Either **Proposed**, **Active**, **Landed**, **Cancelled**, or
**Dropped**.

##### flightStateActiveOrProposed

This element specifies whether the current status of the flight as
specified by SFDPS is active or proposed. Either **true** or **false**.

##### fdpsGufi

The SFDPS GUFI is an identifier on every message that positively
identifies what flight the message is for. It represents a property of
the individual TH message within the BATCH_TH message.

##### eramGufi_316aFPId

Contains the eramGufi flight plan identifier from the SFDPS system, the
unique flight plan identifier. It represents a property of the
individual TH message within the BATCH_TH message.

##### eramGufi_316aDT

Contains the date and time representation of the eramGufi flight plan.
It represents a property of the individual TH message within the
BATCH_TH message.

##### uuidGufi

This element specifies a unique identifier for a flight that conforms to
the Universal Unique Identifier standard and conforms to the GUFI
requirements of FIXM 3.0. It represents a property of the individual TH
message within the BATCH_TH message.

##### flightPlanSeqNo

Contains the sequence number for each flight plan. It represents a
property of the individual TH message within the BATCH_TH message.

#### TH

![SFDPSSchema_v1.3.8_p373.png](media/image23.png){width="3.4069772528433946in"
height="7.949255249343832in"}

[]{#_Toc523206106 .anchor}Figure 22. TH Structure

##### sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last four
digits, represent the message sequence number in the range
\[0000-9999\].

##### sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss*, where: *hh* stands for the
two-digit hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and ss stands for the two-digit seconds in the range
00-59.

##### sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

##### flightId_02a

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.

##### computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**.

##### sspId_167a

Site Specific Plan Identifier. It is assigned by IFPA to uniquely
identify a flight plan in each ERAM facility. One to four digits.

##### groundSpeed_05b

This element contains the aircraft ground speed in knots. The format is
three digits. If the aircraft ground speed is not available, this
element contains three zeroes.

##### assignedAlt_08a

Assigned altitude or flight level expressed in hundreds of feet. Only
one of the altitude elements assignedAlt_08a, assignedAlt_08b,
assignedAlt_08c, assignedAlt_08d, assignedAlt_08e, assignedAlt_08f,
assignedAlt_08g, assignedAlt_08h may be included in the message. The
format consists of either two or three digits, or the constant string
**VFR**. Three digits are required for ARTS III, thus a leading zero
needs to be used when necessary.

##### assignedAlt_08b 

Fixed value of **OTP** which indicates VFR-ON-Top. It specifies that the
aircraft is flying above the clouds in VFR conditions.

##### assignedAlt_08c 

VFR-ON-Top with altitude. It represents an Instrument Flight Rules (IFR)
flight operating above the clouds in VFR conditions at the specified
assigned altitude. The format is the constant string **OTP/** followed
by two to three digits that represent the assigned altitude in hundreds
of feet.

##### assignedAlt_08d 

The assigned block of altitudes for the flight to fly. The format
consists of the string **ABV/** followed by two to three digits that
represent the altitude in hundreds of feet above which the flight is
flying.

##### assignedAlt_08e 

Element used for IFR flights operating above a specified altitude. The
format consists of the string **ABV/** followed by two to three digits
that represent the altitude in hundreds of feet above which the flight
is flying.

##### assignedAlt_08f 

Assigned Altitude/FIX/Altitude element specifies the altitudes to and
from a fix for the flight to fly at. The altitudes are specified in
hundreds of feet in a two to three digit format. The fix is specified
using the same format as the coordination fix element *coordFix_06a* in
4.1.16. The fix cannot be the departure or arrival point.

##### assignedAlt_08g 

It is used to specify that the flight is flying Visual Flight Rules
(VFR). It can only have the value **VFR**.

##### assignedAlt_08h 

It is used to specify that the flight is flying VFR at a specified
altitude. The format consists of the string **VFR/** followed by two to
three digits that represent an altitude in hundreds of feet.

##### reportedAlt_54a

The element is used to specify the reported altitude. For aircraft with
operative Mode C capability, this element contains the Mode C altitude.
For aircraft without Mode C capability or with non-operative Mode C
capability, this element may contain the controller reported altitude.
If there is no Mode C or controller reported altitude, or the reported
altitude is negative, this element contains "0" or \"000\" or is
optional. The format consists of one to three digits that represent the
reported aircraft altitude in hundreds of feet. Leading zeros may be
inserted for altitudes of less than three digits.

##### reportedAlt_54b

This field is the reported altitude B4 indicator. The ERAM controllers'
full data block used for tracking an aircraft has a special indicator
for the B4 character of the full data block. The format of this element
is one character as follows: **A** -- Reported altitude (controller
entered) equals single assigned altitude; **B** -- Beacon reported
altitude is in conformance or controller entered reported altitude is in
the block for an aircraft which has been assigned an altitude block (B1
to B3 - low altitude limit of block and C1 to C3=high altitude limit of
block); **C** -- Beacon reported altitude is within Altitude Conformance
Limits feet; **F** -- Reported altitude (controller entered) equals
first altitude or (beacon reported) is within Altitude Conformance
Limits of first altitude when assigned altitude is (d)dd/fix/(d)dd and
the first altitude is displayed in Field B; **N** -- No beacon reported
altitude has been received for the aircraft; no controller entered
reported altitude exists for the aircraft; or the aircraft's rate of
change is questionable and Computed Rate of Change is being used to make
further conformance checks; **T** -- Interim altitude is currently being
displayed in the assigned altitude field (B1 through B3); **V** --
Beacon reported or controller entered reported altitude, when no
assigned altitude exists for the aircraft; **X** -- Beacon reported
altitude becomes disestablished. (C1-C3 also contains \`X\' character.).
**\^** - Beacon reported or controller entered reported altitude is
below assigned altitude when flight is climbing; **v** -- Beacon
reported or controller entered reported altitude is above assigned
altitude when flight is descending; **+** - Beacon reported altitude
exceeds upper conformance limit for an aircraft which has reached it
assigned altitude or the controller entered reported altitude exceeds
the assigned altitude for a non-Mode C aircraft which has previously
been reported at the assigned altitude; **-** - Beacon reported altitude
is less than lower conformance limit for an aircraft which has reached
its assigned altitude or the controller entered reported altitude is
less than the assigned altitude for a non-Mode C aircraft which has
previously been reported at the assigned altitude; **/** - Flight type
is \`OTP\' or \`VFR.'

##### reportedAlt_54c

The element specifies the reported altitude C4 indicator. The ERAM
controllers full data block used for tracking an aircraft has a special
indicator for the C4 character of the full data block as follows: If the
aircraft is not responding with the Mode C altitude, the controller
entered reported altitude is displayed in *reportedAlt_54c* with a pound
sign (#) or X in position C4 whenever (1) the controller entered
reported altitude does not equal the assigned altitude or is not within
the assigned altitude block, (2) no assigned altitude has been entered,
or (3) the assigned altitude is VFR, VFR/(d)dd, OTP, or OTP/(d)dd. In
either case for a Mode C reported altitude or a controller reported
altitude, when an interim altitude is displayed in *reportedAlt_54b* the
B4 character position contains the letter "T" and the reported altitude,
or either the lower or upper altitude of an assigned block altitude is
displayed in *reportedAlt_54c*. In the case where a controller entered
reported altitude exists, a pound sign (#) or X is displayed in the C4
position.

##### controllingFacility_138a

This element specifies the facility that is controlling the flight. The
format consists of three letters. The value is three blank characters if
identification of the controlling facility is not available.

##### controllingSector_138b

This element specifies the controlling ARTS position or the controlling
ERAM ARTCC sector number. The Controlling Sector is the sector/position
that is controlling the flight. The value is 00 if identification of the
controlling sector is not available. The format is one digit followed by
one alphanumeric.

##### receivingFacility_139a

This element specifies the facility that is receiving the flight. The
format is three letters.

##### receivingSector_139b

This element specifies the receiving ARTS position or the receiving ERAM
ARTCC sector number. The receiving sector is the sector/position that is
receiving the flight. The value is 00 if identification of the receiving
sector is not available. The format is one digit followed by one
alphanumeric.

##### trackPosition_23d

This element specifies the track position form ERAM to ATM-IPOP. It is a
latitude/longitude pair, separated by a virgule. For latitude, the first
two digits are degrees, the second two are minutes, and the last two are
seconds. The letter can be N or S. For the longitude, the first three
digits are degrees, the second two are minutes, and the last two are
seconds. The letter can be E or W.

##### trackVelocity_23e

This element specifies the velocity in nautical miles per hour. Minimum
length = 5, Maximum length = 11. It has an X and a Y component separated
by a virgule. Either component can be preceded by either a + or -- sign,
followed by one to three digits. The second component can be preceded by
an S or an H, for speed only in nautical miles per hour (NM/hr), or
heading only (degrees), respectively.

##### coastIndicator_153a

This element specifies an action indicator. It has only one possible
value, **C** for Coast.

##### timeOfTrackData_170a

This element specifies the date and time the track data was stored.

##### targetPosition_171a

This element specifies the ERAM radar target position, in
latitude/longitude format, as described in message number. Length = 16,
it is a latitude/longitude pair, separated by a virgule.

##### targetAlt_172a

This element specifies the Mode C Target altitude (corrected for
barometric pressure) in hundreds of feet. The format is three digits,
with leading zeroes required. If the target altitude is negative,
targetAlt_172a is **000**.

##### targetAltInvalid_172b

If the element *targetAlt_172a* is not valid, this field is set to
**INV**, for invalid Mode C altitude.

##### timeOfTargetData_173a

This element specifies the date and time of the correlated target.

## Drop Track Information -- RH

![SFDPSSchema_v1.3.8_p308.png](media/image24.png){width="2.8541666666666665in"
height="2.0833333333333335in"}

[]{#_Toc523206107 .anchor}Figure 23. RH Structure

###  sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last four
digits, represent the message sequence number in the range
\[0000-9999\].

###  sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss*, where: *hh* stands for the
two-digit hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and ss stands for the two-digit seconds in the range
00-59.

###  sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

###  flightId_02a

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.

###  computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**.

###  sspId_167a

Site Specific Plan Identifier. It is assigned by IFPA to uniquely
identify a flight plan in each ERAM facility. One to four digits.

## Interim Altitude -- LH

![SFDPSSchema_v1.3.8_p211.png](media/image25.png){width="3.34375in"
height="2.7708333333333335in"}

[]{#_Toc523206108 .anchor}Figure 24. LH Structure

###  sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last
four-digits, represent the message sequence number in the range
\[0000-9999\].

###  sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss*, where: *hh* stands for the
two-digit hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and ss stands for the two-digit seconds in the range
00-59.

###  sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

###  interimAlt_76a

This element specifies the letter **D** that is used to delete the
interim altitude stored by ATM-IPOP. The message must include either
this element or the element *interimAlt_76b.*

###  interimAlt_76b

This element specifies the interim altitude for the flight in hundreds
of feet. It is included in the message if an interim altitude is
assigned.

###  flightId_02a 

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.

###  computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**.

###  sspId_167a

Site Specific Plan Identifier. It is assigned by IFPA to uniquely
identify a flight plan in each ERAM facility. One to four digits.

## Automated Radar Terminal System (ARTS) Flow Control Track/Full Data Block Information -- HZ

![SFDPSSchema_v1.3.8_p168.png](media/image26.png){width="3.4895833333333335in"
height="4.833333333333333in"}

[]{#_Toc523206109 .anchor}Figure 25. HZ Structure

###  sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last four
digits, represent the message sequence number in the range
\[0000-9999\].

###  sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss*, where: *hh* stands for the
two-digit hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and ss stands for the two-digit seconds in the range
00-59.

###  sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

###  addresseeARTS_00d

This element contains the ARTS facility identification to which ERAM is
to relay the message.

###  addresserARTS_00a

This element contains the ARTS facility identification from which ERAM
is to relay the message.

###  flightId_02a 

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.

###  computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**.

###  groundSpeed_05b

This element contains the aircraft ground speed in knots. The format is
three digits. If the aircraft ground speed is not available, this
element contains three zeroes.

###  assignedAlt_08a

Assigned altitude or flight level expressed in hundreds of feet. Only
one of the altitude elements assignedAlt_08a, assignedAlt_08b,
assignedAlt_08c, assignedAlt_08d, assignedAlt_08e, assignedAlt_08f,
assignedAlt_08g, assignedAlt_08h may be included in the message. The
format consists of either two to three digits, or the constant string
**VFR**. Three digits are required for ARTS III, thus a leading zero
needs to be used when necessary.

### assignedAlt_08c 

VFR-ON-Top with altitude. It represents an Instrument Flight Rules (IFR)
flight operating above the clouds in VFR conditions at the specified
assigned altitude. The format is the constant string **OTP/** followed
by two to three digits that represent the assigned altitude in hundreds
of feet.

### interimAlt_76bT

This element specifies the interim altitude for the flight in hundreds
of feet It may only be specified if none of the other altitude elements
(assignedAlt_08a, assignedAlt_08c, interimAlt_76bT, assignedAlt_08d,
reportedAlt_54aC) is included in the message. One to three digits in the
range 0 -- 999.

### assignedAlt_08d 

The assigned block of altitudes for the flight to fly. The format
consists of the string **ABV/** followed by two to three digits that
represent the altitude in hundreds of feet above which the flight is
flying.

### reportedAlt_54aC

This element contains the reported Mode C altitude. It may only be
specified if none of the other altitude elements (assignedAlt_08a,
assignedAlt_08c, interimAlt_76bT, assignedAlt_08d, reportedAlt_54aC) is
included in the message. Three digits followed by the letter **C**. The
digits represent the aircraft altitude in hundreds of feet. Leading
zeroes must be inserted when necessary. If there is no Mode C or the
reported altitude is negative, this element contains \"000.\"

### trackPosition_23d

This element specifies the track position form ERAM to ATM-IPOP. It is a
latitude/longitude pair, separated by a virgule. For latitude, the first
two digits are degrees, the second two are minutes, and the last two are
seconds. The letter can be **N** or S. For the longitude, the first
three digits are degrees, the second two are minutes, and the last two
are seconds. The letter can be **E** or **W**.

## Beacon Code Reassignment -- BA

![SFDPSSchema_v1.3.8_p37.png](media/image27.png){width="2.90625in"
height="4.145833333333333in"}

[]{#_Toc523206110 .anchor}Figure 26. BA Structure

###  sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last four
digits, represent the message sequence number in the range
\[0000-9999\].

###  sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss*, where: *hh* stands for the
two-digit hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and ss stands for the two-digit seconds in the range
00-59.

###  sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

###  flightId_02a

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.

###  computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**.

###  eramGufi_316a

GUFI that uniquely identifies each flight plan in the system. This
element includes 10 alphanumeric characters: - ICAO country code (one
letter); en-route facility ID (one letter); time in seconds of current
day (five digits in the range 00000-86400); sequence number (two
digits).

###  eramGufi_316aNum

Contains the numeric representation of the eramGufi flight plan.

###  eramGufi_316aDT

Contains the date and time representation of the eramGufi flight plan.

###  sspId_167a

Site Specific Plan Identifier. It is assigned by IFPA to uniquely
identify a flight plan in each ERAM facility. One to four digits.

### beaconCode_04a

Beacon code. ***Note*:** As of SFDPS 1.3.1, if the flightState element
has a value of 'Canceled' or 'Proposed,' this element is only present in
the version of a message with FDPS_Restricted='R.' The element includes
four octal digits (i.e. 0-7). When the last two of the four digits are
zero, the beacon code is a non-discrete code. A discrete code is any
code not ending in 00.

### departurePoint_26a

It is used to specify the point at which to start processing the flight
plan route as follows: The departure airport or the airfile point. Any
of the standard ways to represent a fix can be used for this element
(fix name, lat/long, or fix-radial-distance), including the standard
airport designators.

### destination_27a

It is used to specify the point at which to end processing the flight
plan route. Any of the standard ways to represent a fix can be used for
this element (fix name, lat/long, or fix-radial-distance), including the
standard airport designators.

## Beacon Code Restricted -- RE

![SFDPSSchema_v1.3.8_p287.png](media/image28.png){width="3.3333333333333335in"
height="4.489583333333333in"}

[]{#_Toc523206111 .anchor}Figure 27. RE Structure

###  sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last four
digits, represent the message sequence number in the range
\[0000-9999\].

###  sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss*, where: *hh* stands for the
two-digit hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and ss stands for the two-digit seconds in the range
00-59.

###  sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

###  flightId_02a

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.

###  computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**.

###  eramGufi_316a

GUFI that uniquely identifies each flight plan in the system. This
element includes 10 alphanumeric characters: -International Civil
Aviation Organization (ICAO) country code (one letter); en-route
facility ID (one letter); time in seconds of current day (five digits in
the range 00000-86400); sequence number (two digits).

###  eramGufi_316aNum

Contains the numeric representation of the eramGufi flight plan.

###  eramGufi_316aDT

Contains the date and time representation of the eramGufi flight plan.

###  sspId_167a

Site Specific Plan Identifier. It is assigned by IFPA to uniquely
identify a flight plan in each ERAM facility. One to four digits.

### beaconCode_04a

Beacon code. ***Note:*** As of SFDPS 1.3.1, if the flightState element
has a value of 'Canceled' or 'Proposed,' this element is only present in
the version of a message with FDPS_Restricted='R.' The element includes
four octal digits (i.e. 0-7). When the last two of the four digits are
zero, the beacon code is a non-discrete code. A discrete code is any
code not ending in 00.

### departurePoint_26a

It is used to specify the point at which to start processing the flight
plan route as follows: The departure airport or the airfile point. Any
of the standard ways to represent a fix can be used for this element
(fix name, lat/long, or fix-radial-distance), including the standard
airport designators.

### destination_27a

It is used to specify the point at which to end processing the flight
plan route. Any of the standard ways to represent a fix can be used for
this element (fix name, lat/long, or fix-radial-distance), including the
standard airport designators.

### restrictedBeaconCode_04aR 

This element is used to specify the restricted beacon code. The element
includes four octal digits (i.e. 0-7). When the last two of the four
digits are zero, the beacon code is a non-discrete code. A discrete code
is any code not ending in 00.

## FDB Fourth Line -- HF

![SFDPSSchema_v1.3.8_p152.png](media/image29.png){width="3.21875in"
height="3.1145833333333335in"}

[]{#_Toc523206112 .anchor}Figure 28. HF Structure

###  sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last
four-digits, represent the message sequence number in the range
\[0000-9999\].

###  sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss*, where: *hh* stands for the
two-digit hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and ss stands for the two-digit seconds in the range
00-59.

###  sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

###  flightId_02a

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.

###  computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**.

###  sspId_167a

Site Specific Plan Identifier. It is assigned by IFPA to uniquely
identify a flight plan in each ERAM facility. One to four digits.

###  FDB4thLineHeading_155a 

This element is used to display the heading of the aircraft issued by
the controller. Its format is one to four alphanumeric characters.
Samples: 075, H075.

###  FDB4thLineSpeed_155b 

This element is used to display the speed of the aircraft issued by the
controller. Minimum length = 1 character, Maximum length = 4 characters.

###  FDB4thLineText_155c 

This element is used to display free-form text issued by the controller.
The allowed characters are the alphanumeric characters, −, +, =, \*, /,
underscore (\_), semicolon (;), period (.), and comma (,). No leading or
embedded spaces are allowed. It can be one to eight characters long.

## Point Out Information -- HR

![SFDPSSchema_v1.3.8_p159.png](media/image30.png){width="2.8541666666666665in"
height="1.5520833333333333in"}

[]{#_Toc523206113 .anchor}Figure 29. HR Structure

###  sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last
four-digits, represent the message sequence number in the range
\[0000-9999\].

###  sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss*, where: *hh* stands for the
two-digit hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and ss stands for the two-digit seconds in the range
00-59.

###  sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

###  routeStatus

![SFDPSSchema_v1.3.8_p160.png](media/image31.png){width="3.7395833333333335in"
height="1.15625in"}

[]{#_Toc523206114 .anchor}Figure 30. routeStatus Structure

#### routeStatusElements_135a 

This element contains the adapted route status elements. The adapted
names are Standard Instrument Departures (SID), Standard Terminal
Arrival Routes (STAR), AAR, Adapted Departure Routes (ADR) and ADAR that
are active when initialization begins. The format is two to six
alphanumeric characters.

#### actionIndicator_36a 

This element shows the status of the route elements in element
*actionIndicator_36a*. It can have one of two possible values: **ON** or
**OFF**.

## Inbound Point Out Information -- PT

![SFDPSSchema_v1.3.8_p284.png](media/image32.png){width="3.1041666666666665in"
height="3.4583333333333335in"}

[]{#_Toc523206115 .anchor}Figure 31. PT Structure

###  sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last
four-digits, represent the message sequence number in the range
\[0000-9999\].

###  sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss*, where: *hh* stands for the
two-digit hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and ss stands for the two-digit seconds in the range
00-59.

###  sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

###  flightId_02a

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.

###  computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**.

###  sspId_167a

Site Specific Plan Identifier. It is assigned by IFPA to uniquely
identify a flight plan in each ERAM facility. One to four digits.

###  controllingFacility_138a

This element specifies the facility that is controlling the flight. The
format consists of three letters. The value is three blank characters if
identification of the controlling facility is not available.

###  controllingSector_138b

This element specifies the controlling ARTS position or the controlling
ERAM ARTCC sector number. The Controlling Sector is the sector/position
that is controlling the flight. The value is 00 if identification of the
controlling sector is not available. The format is one digit followed by
one alphanumeric.

###  receivingFacility_139a

This element specifies the facility that is receiving the flight. The
format is three letters.

### receivingSector_139b

This element specifies the receiving ARTS position or the receiving ERAM
ARTCC sector number. The receiving sector is the sector/position that is
receiving the flight. The value is 00 if identification of the receiving
sector is not available. The format is one digit followed by one
alphanumeric.

## Handoff Status -- OH

![SFDPSSchema_v1.3.8_p239.png](media/image33.png){width="3.3541666666666665in"
height="4.489583333333333in"}

[]{#_Toc523206116 .anchor}Figure 32. OH Structure

###  sourceId_00e

This element specifies the source identification that includes a UTC
time followed by a four-digit sequence number. Ten digits, of which the
first six digits represent the UTC time (*hhmmss*) and the last four
digits, represent the message sequence number in the range
\[0000-9999\].

###  sourceTime_00e1

This element specifies the time component of the previous element,
sourceId_00e. Time in the format *hh_mm_ss*, where: *hh* stands for the
two-digit-hour in the range 00-23, *mm* stands for the two-digit minutes
in the range 00-59, and ss stands for the two-digit seconds in the range
00-59.

###  sourceSeqNo_00e2

This element specifies the message sequence number component of the
sourceId_00e element. Four-digit number in the range \[0000-9999\].

###  flightId_02a

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.

###  computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**.

### sspId_167a

Site Specific Plan Identifier. It is assigned by IFPA to uniquely
identify a flight plan in each ERAM facility. One to four digits.

###  controllingFacility_138a

This element specifies the facility that is controlling the flight. The
format consists of three letters. The value is three blank characters if
identification of the controlling facility is not available.

###  controllingSector_138b

This element specifies the controlling ARTS position or the controlling
ERAM ARTCC sector number. The Controlling Sector is the sector/position
that is controlling the flight. The value is 00 if identification of the
controlling sector is not available. The format is one digit followed by
one alphanumeric.

###  receivingFacility_139a

This element specifies the facility that is receiving the flight. The
format is three letters.

### receivingSector_139b

This element specifies the receiving ARTS position or the receiving ERAM
ARTCC sector number. The receiving sector is the sector/position that is
receiving the flight. The value is 00 if identification of the receiving
sector is not available. The format is one digit followed by one
alphanumeric.

### acceptingFacility_334a 

This element contains the accepting facility identifier. The accepting
facility is the facility receiving the flight when the handoff was
initiated. Data in this field indicates that a handoff is accepted. The
format consists of three letters.

### acceptingSector_335a 

This element contains the accepting sector data. The accepting sector is
the receiving sector/position that accepts the flight in handoff status.
Element *acceptingSector_335a* is the same as element
*receivingSector_139b*. The format is one digit followed by one
alphanumeric character.

### handoffEventIndicator_336a 

This element contains the handoff event indicator. The possible values
and their meanings are: **I** -- initiation, **A** -- acceptance, **R**
-- retraction, **T** -- take control, **U** -- update, or **F** --
failure.

## Flight Plan Reconstitution Message -- DBRTFPI

![](media/image34.png){width="6.0in" height="5.732931977252844in"}

[]{#_Toc523206117 .anchor}Figure 33. DBRTFPI Structure 1/3

![](media/image35.png){width="6.0in" height="6.434063867016623in"}

[]{#_Toc523206118 .anchor}Figure 34. DBRTFPI Structure 2/3

![](media/image36.png){width="2.0172101924759405in" height="6.43in"}

[]{#_Toc523206119 .anchor}Figure 35. DBRTFPI Structure 3/3

###  computerId_02d

ERAM Computer Identification (Computer ID). The element includes a
digit, followed by two alphanumeric characters with the exception of the
letters **I** and **O**.

###  flightId_02a

Aircraft ID, or flight ID (also called Call Sign). One uppercase
alphabetic character followed by one to six alphanumeric characters.

###  eramGufi_316a

GUFI that uniquely identifies each flight plan in the system. This
element includes 10 alphanumeric characters: ICAO country code (one
letter); en-route facility ID (one letter); time in seconds of current
day (five digits in the range 00000-86400); sequence number (two
digits).

###  eramGufi_316aNum

Contains the numeric representation of the eramGufi flight plan.

###  eramGufi_316aDT

Contains the date and time representation of the eramGufi flight plan.

###  sspId_167a

Site Specific Plan Identifier. It is assigned by IFPA to uniquely
identify a flight plan in each ERAM facility. One to four digits.

###  numberOfAircraft_03a

This element includes the number of aircraft for the flight followed
optionally by the Special Aircraft Indicator. The element consists of
zero to two digits optionally followed by one uppercase letter to
represent the Special Aircraft Indicator. The indicator can also appear
on its own (without the leading digits).

###  typeOfAircraft_03c

Type of aircraft. The element consists of one letter followed by one to
three alphanumeric characters.

###  airborneEquip_03e

Airborne equipment qualifier. It consists of one alphanumeric character.
The element consists of one alphanumeric character, that can have one of
the following values: **A** -- Transponder with no Mode C, **B** --
Transponder with Mode C, **E** -- FMS with Distance Measuring Equipment
(DME)/DME and Inertial Reference Unit (IRU) position updating, **G** --
Global Navigation Satellite System (GNSS), including Global Positioning
System (GPS) or Wide Area Augmentation System (WAAS), with enroute and
terminal capability, **X** -- No transponder, **W** -- Reduced Vertical
Separation Minimums (RVSM)

### beaconCode_04a

Beacon code. ***Note*:** As of SFDPS 1.3.1, if the flightState element
has a value of 'Canceled' or 'Proposed,' this element is only present in
the version of a message with FDPS_Restricted='R.' The element includes
four octal digits (i.e. 0-7). When the last two of the four digits are
zero, the beacon code is a non-discrete code. A discrete code is any
code not ending in 00.

### trueAirSpeed_05a

True airspeed expressed in knots. The format is two to four digits, in
the range 01 -- 3700 knots. Aircraft speed is required to be specified
by using one of the three possible elements: trueAirSpeed_05a,
machSpeed_05c or classifiedSpeed_05d.

### machSpeed_05c

Mach speed. The letter **M** followed by three digits. The maximum value
is M500.

### classifiedSpeed_05d

Adapted classified speed. It is not printed on flight strips. This
element may only include the string character **SC**.

### coordFix_06a

The Coordination fix represents the starting point to begin processing
the flight plan route from one of the following points: The departure
airport, the airfile fix or the adjacent center inbound coordination
fix. For ARTS III flight plans the coordination fix Field 06 is used as
the inbound coordination fix or the outbound coordination fix or, for an
ARTS internal flight, it can be the departure or destination airport.
This element can have one of the following formats: Two to five
alphanumeric characters for a fix name; the fix name as above followed
by six digits, for a fix radial distance; four digits followed by an
optional alphabetic character, followed by a virgule ('/'), followed by
four to five digits followed by an optional alphanumeric character for a
lat/long; or three to four alphanumeric characters for a location
identifier (LOCID).

### coordStatusTime_07d

Coordination time that represents the starting time in hours and minutes
at the coordination fix. The element includes one letter (possible
values are **A**, **D, E**, **P**, or **F**) followed by four digits
that represent time as *hhmm*.

### coordStatus_07d1

The coordStatus field is the single letter **A**, **D**, **E**, **F**,
or **P**, as described for element coordStatusTime_07d.

### coordTime_07d2

Starting time at the coordination fix.

### delayTime_07e

Delay time in expressed in minutes. Three digits.

### departureTime_243n 

This element specifies the reported (actual) departure time.

### proposedDepartureTime_2431 

This element specifies the proposed departure time.

### estDepartureClearanceTime_2432 

This element specifies the EDCT.

### arrivalTime_28b

This element specifies the reported time of arrival. Where the first
letter can be **A** or **E**, as follows: **A:** if time received in
field 00 of TB message caused flight to be dropped, **E:** if flight
dropped by application of AFDI or EFDI. The four digits specify time in
*hhmm* format.

### assignedAlt_08a

Assigned altitude or flight level expressed in hundreds of feet. Only
one of the altitude elements assignedAlt_08a, assignedAlt_08b,
assignedAlt_08c, assignedAlt_08d, assignedAlt_08e, assignedAlt_08f,
assignedAlt_08g, assignedAlt_08h may be included in the message. The
format consists of either two or three digits, or the constant string
**VFR**. Three digits are required for ARTS III, thus a leading zero
needs to be used when necessary.

### assignedAlt_08b 

Fixed value of **OTP** which indicates VFR-ON-Top. It specifies that the
aircraft is flying above the clouds in VFR conditions.

### assignedAlt_08c 

VFR-ON-Top with altitude. It represents an Instrument Flight Rules (IFR)
flight operating above the clouds in VFR conditions at the specified
assigned altitude. The format is the constant string **OTP/** followed
by two to three digits that represent the assigned altitude in hundreds
of feet.

### assignedAlt_08d 

The assigned block of altitudes for the flight to fly. The format
consists of the string **ABV/** followed by two to three digits that
represent the altitude in hundreds of feet above which the flight is
flying.

### assignedAlt_08e 

Element used for IFR flights operating above a specified altitude. The
format consists of the string **ABV/** followed by two to three digits
that represent the altitude in hundreds of feet above which the flight
is flying.

### assignedAlt_08f 

Assigned Altitude/FIX/Altitude element specifies the altitudes to and
from a fix for the flight to fly. The altitudes are specified in
hundreds of feet in a two to three- digit format. The fix is specified
using the same format as the coordination fix element *coordFix_06a* in
4.1.16. The fix cannot be the departure or arrival point.

### assignedAlt_08g 

It is used to specify that the flight is flying VFR. It can only have
the value **VFR**.

### assignedAlt_08h 

It is used to specify that the flight is flying VFR at a specified
altitude. The format consists of the string **VFR/** followed by two to
three digits that represent an altitude in hundreds of feet.

### requestedAlt_09a 

The element is used to specify requested altitude or flight level in
hundreds of feet. Only one of the seven requested altitude elements
(requestedAlt_09a to requestedAlt_08g) may be included in a proposed
flight message. The format consists of two to three digits. ARTS III
requires three characters, with a leading **0** when required (such as
090).

### requestedAlt_09b 

The element Requested Altitude format OTP represents an IFR flight
requesting to operate above the clouds in VFR conditions. OTP stands for
VFR-ON-Top. The element has a fixed value of OTP.

### requestedAlt_09c 

The element "Requested Altitude format OTP with altitude" represents a
flight requesting to operate VFR-ON-Top at the requested altitude. The
format consists of the string **OTP**/ followed by two to three digits
that represent the requested altitude in hundreds of feet. ERAM only
sends ARTS III the requested altitude with a format of three digits
(leading zeroes used when necessary, as in 090) and places a special
altitude indicator (U if Heavy Jet) in element numberOfAircraft_03a.

### requestedAlt_09d 

Element used for an IFR flight requesting to operate above a specified
altitude. The format consists of the string **ABV/** followed by two to
three digits that represent the requested altitude in hundreds of feet.

### requestedAlt_09e 

Element used to specify a requested block of altitudes or flight levels
for the flight to fly at. The altitudes are specified in hundreds of
feet. The format consists of two to three digits for the lowest
altitude, followed by the letter **B**, followed by two to three digits
for the highest altitude.

### requestedAlt_09f 

This element is used when the aircraft is requesting to fly VFR. It can
only include the fixed string "VFR." ERAM sends ARTS III the three
characters and also places a special altitude indicator **V** (not a
Heavy Jet) or **W** (if a Heavy Jet) in element numberOfAircraft_03a.

### requestedAlt_09g 

The element used to represent a flight requesting to fly VFR at a
specified altitude. The format consists of the constant string **VFR/**
followed by two to three digits that specify the requested altitude in
hundreds of feet.

### flightPlanRoute_10a 

It specifies the trajectory followed by the airplane from the departure
point to the arrival point, based on the fixes and routes along that
trajectory. The element format consists of a string that includes fixes
and routes along the trajectory flown by the airplane. The fixes and
routes are specified using the FIX.ROUTE.FIX format, where either
element can be implied, such as FIX..FIX, or ROUTE..ROUTE.

### departurePoint_26a

It is used to specify the point at which to start processing the flight
plan route as follows: The departure airport or the airfile point. Any
of the standard ways to represent a fix can be used for this element
(fix name, lat/long, or fix-radial-distance), including the standard
airport designators.

### destination_27a

It is used to specify the point at which to end processing the flight
plan route. Any of the standard ways to represent a fix can be used for
this element (fix name, lat/long, or fix-radial-distance), including the
standard airport designators.

### ETE_2439

This element specifies the Estimated Time En Route (ETE).

###  ETA_28a

Estimated Time of Arrival (ETA) at destination in hours and minutes. ETA
supplied only if the Estimated Time Enroute (ETE) was filed with the
flight plan. Four digits representing time in format hhmm.

### remarks_11c

Flight plan remarks text. The string is 1 to 400 characters in length.
It has an attribute called *remarktype* with the possible values of
interfacility or intrafacility.

### holdDataFix_21a

This element specifies the position location for the flight to hold
along the filed route of flight. If the message does not include the
optional *holdDataTime_21d* element, the flight goes into an indefinite
hold status when the flight arrives at the hold fix. Any of the valid
fix formats can be used, as described for *coordFix_06a* element in
4.1.16.

### holdDataTime_21d

This element specifies the time the flight can expect further clearance
at the holding location specified in the element *holdDataFix_21a*. This
element can only be included in the HH messages if the element
*holdDataFix_21a* is also included.

### progressReportFix_18a

This element specifies the position location report of the flight along
the filed route of flight. It uses the standard fix formats, as
specified for the element *coordFix_06a* in 4.1.16*.*

### progressReportTime_18d

This element specifies the time of the flight arriving at the fix
specified in element *progressReportFix_18a*, above.

### departureAutoRouteInhibitIndicator_244g 

This element specifies whether the departure route from the departure
airport is inhibited or not. Indicator marked by asterisk (\*).

### destinationAutoRouteInhibitIndicator_244h 

This element specifies whether the arrival route to the arrival airport
is inhibited or not. Indicator marked by asterisk (\*).

### interimAlt_76b

This element specifies the interim altitude for the flight in hundreds
of feet. It is included in the message if an interim altitude is
assigned.

### AARFld10_142e

This element includes the AAR preferential route in Field 10 format.
Either this element or the element AARNonFld10_142f may be included in
the message.

### AARNonFld10_142f

This element includes the AAR preferential route in non-Field 10 format.
Either this element or the element AARFld10_142e may be included in the
message. A "+" delimiter precedes and follows the non-Field10 elements.

### ADRFld10_142c

Adapted ADR preferential route in Field 10 format. Either this element
or the element ADRNonFld10_142d may be included in the message.

### ADRNonFld10_142d

Adapted ADR preferential route in non-Field 10 format. Either this
element or the element ADRFld10_142c may be included in the message. A
"+" delimiter precedes and follows the non-Field10 elements.

### ADARFld10_142a

This element contains the adapted ADAR preferential route in Field 10
format. The Preferential Route Alphanumerics are used to control the
flow and separation of traffic departing and arriving at designated
airports. An ADAR has the complete preferential routing from the
departure airport to the arrival airport. Either this element or the
element ADARNonFld10_142b may be included in the message.

### ADARNonFld10_142b

This element contains the adapted ADAR preferential route in non-Field
10 format. If required for the flight and if the element ADARFld10_142a
is not included in the message, the FH message contains this element for
the ADAR adapted route. Either this element or the element
ADARFld10_142a may be included in the message. A "+" delimiter precedes
and follows the non-Field10 elements.

### AARId_141c

If required for the flight, this element specifies the AAR adapted
arrival route name. The format consists of five alphanumeric characters.

### ADRId_141b

If required for the flight, the Adapted Route indicator format specifies
the ADR adapted departure route name. The format consists of five
alphanumeric characters.

### ADARId_141a

If required for the flight, this element specifies the ADAR departure
arrival route name. The format consists of five alphanumeric characters.

### FPA_143a0 

FPA containing the first postable fix (1^st^).

### FPA_143a1 

FPA containing the first postable fix (2^nd^).

### FPA_143a2 

FPA containing the first postable fix (3^rd^).

### FPA_143a3 

FPA containing the first postable fix (4th).

### FAV_143b0

The element specifies the FAV number containing the first fix where the
route alteration occurs due to an AAR application. The format is four
digits.

### FAV_143b1

The element specifies the FAV number containing the second fix where the
route alteration occurs due to an AAR application. The format is four
digits.

### FAV_143b2

The element specifies the FAV number containing the third fix where the
route alteration occurs due to an AAR application. The format is four
digits.

### FAV_143b3

The element specifies the FAV number containing the fourth fix where the
route alteration occurs due to an AAR application. The format is four
digits.

### timeBtw1stAndLastConvertedRouteFix_2449 

The element specifies the time interval between the first and last
converted route fix.

### flightRules_908a

This element specifies the flight rules as one character as follows:
**I** = IFR, **V** = VFR, **Y** = IFR First, **Z** = VFR First. If **Y**
or **Z** is used, the point(s) at which a change of flight rules is
planned should be shown in the route.

### typeOfFlight_908b

This element specifies the type of flight specified using one of the
following characters: **S** = Scheduled air transport, **N** =
Non-scheduled air transport, **G** = General Aviation, **M**= Military,
**O** = Other flights.

### wakeTurbulenceCat_909c 

This element specifies the wake turbulence category as **H** (heavy),
**M** (medium) or **L** (light).

### comNavApproachEquip_910a

Pre-2012 ICAO format Airborne Equipment Qualifier: Radio Communication,
Navigation, and Approach AID Equipment. This element has one required
plus 24 optional letters. The 25 possible letters are the letters **A**
through **Z** and each letter can only be used once. If the letter **N**
is present, it must be the only letter present. If the AH message is
sent using ICAO2012 format, then it will include Field 910c. If the AH
message is sent using Indeterminate ICAO format, then it will include
Field 910c and will also include Field 910a with the same value. Legacy
ICAO format letter codes correspond to: **N** -- No equipment is
carried, or equipment is unserviceable, **S** -- Standard equipment is
carried and is serviceable, **A** -- (not allocated), **B** -- (not
allocated), **C** -- Long Range Navigation (LORAN C), **D** -- DME,
**E** -- (not allocated), **F** -- Automatic Direction Finder (ADF),
**G** -- GNSS, **H** -- High Frequency (HF) RTF, **I** -- Inertial
Navigation, **J** --Data link, **K** -- MLS, **L** -- ILS, **M** --
Omega, **O** -- Very High Frequency Omnidirectional Range (VOR), **P**
-- (not allocated), **R** -- Performance Based Navigation (PBN)
approved, **T** -- Tactical Air Navigation System (TACAN), **U** --
Ultra High Frequency (UHF) RTF, **V** -- Very High Frequency (VHF) RTF,
**W** -- RVSM approved, **X** -- Minimum Navigation Performance
Specifications (MNPS) approved, **Y** -- VHF with 8.33 kHz spacing
capacity, **Z** -- Other equipment carried.

### survEquip_910b

This element represents the ICAO airborne equipment qualifier. The
format consists of up to two letters. The first letter must be one of
the Secondary Surveillance Radar (SSR) equipment letters and the second
letter, if used, must be the Automatic Dependent Surveillance (ADS)
capability letter **"D."** The valid values for the first letter and
their significance are: **N**: Nil, **A**: Transponder Mode A, **C**:
Transponder Mode A and C, **X**: Transponder Mode S without both
aircraft ID and pressure-altitude transmission, **P**: Transponder Mode
S, with pressure-altitude transmission but aircraft ID transmission,
**I**: Transponder Mode S with aircraft ID transmission but no
pressure-altitude transmission, **S**: Transponder Mode S with both
pressure-altitude and aircraft ID transmission, **D**: ADS capability.

### altAero_916c 

This element contains Alternate Arrival Point(s) or Aerodrome(s), if
any. More than one alternate arrival points of aerodromes may be
specified. The aerodrome is specified using the four-letter ICAO name or
ZZZZ if no ICAO location indicator has been allocated. The arrival point
format has to be one of the fix formats described above (see
coordFix_06a). If two or more alternatives are included, they may have
any of the valid formats and they have to be separated by blanks.

### FDB4thLineHeading_155a 

This element is used to display the heading of the aircraft issued by
the controller. Its format is one to four alphanumeric characters.
Samples: 075, H075.

### FDB4thLineSpeed_155b 

This element is used to display the speed of the aircraft issued by the
controller. Minimum length = 1 character, maximum length = 4 characters.

### FDB4thLineText_155c 

This element is used to display free-form text issued by the controller.
The allowed characters are the alphanumeric characters, −, +, =, \*, /,
underscore (\_), semicolon (;), period (.), and comma (,). No leading or
embedded spaces are allowed. It can be one to eight characters long.

### externalBeaconCode_04b

External beacon. It contains the requested beacon code when the flight
plan is inbound from an adjacent Center or an adjacent Non-U.S.
Automated Facility, the requested beacon code is different from the
assigned beacon code, and the aircraft is not established on the
assigned beacon code. Then, if the facility is adapted to receive Field
(04b), Field 04b is be transmitted. ***Note*:** As of SFDPS 1.3.1, if
the flightState element has a value of 'Canceled' or 'Proposed', this
element is only present in the version of a message with
FDPS_Restricted='R.' It has the same format as element beaconCode_04a.

### localIntendedRoute_10b

The Local Intended Route element contains the flight plan route that is
coordinated to penetrated facilities. It consists of the flight plan
route with any expected-to-be-applied-by-the-controlling-center ADRs,
ADARs or AARs already applied. It is intended for the clients that wish
to know the expected state of the flight plan when the current facility
releases control of the flight. Element localIntendedRoute_10b contains
the filed route (field 10a) merged with any locally applicable adapted
routes (preferential routes, transition fixes and A-line fixes).
Optional Field 10b is sent to ATM-IPOP, when Field 10b is not the same
as Field 10a. Minimum length = 3, Maximum length = 1000.

### timeRouteValues_2461 

This element contains the time of the route values.

### fixTimes 

This element specifies the fix and calculated time of arrival at each
fix that describes the aircraft's ERAM converted route of flight.

![SFDPSSchema_v1.3.8_p72.png](media/image37.png){width="3.2291666666666665in"
height="1.0520833333333333in"}

[]{#_Toc523206120 .anchor}Figure 36. fixTimes Structure

#### fixTime_68c

This element contains a fix and the expected time of arrival at the fix
in hours and minutes. The format consists of a valid representation of a
fix (see element 4.1.16 coordFix_06a), followed by a virgule, and is
followed by time in *hhmm* format. Minimum length = 7, Maximum length =
17.

#### fix_68c1

This element specifies the fix component of the element *fixTime_68c*.
The format consists of a valid representation of a fix (see element in
4.1.16 coordFix_06a in the FH message table).

#### crossingTime_68c2

This element specifies the time component of the element *fixTime_68c*.
The format is *dateTime*, and not *hhmm* as it is in the *fixTime_68c*
element.

### adjacentCenterRouting 

![SFDPSSchema_v1.3.8_p73.png](media/image38.png){width="4.145833333333333in"
height="0.7083333333333334in"}

[]{#_Toc523206121 .anchor}Figure 37. adjacentCenterRouting Structure

#### outputRouting_253a

This element indicates the destination of the output message.

#### FAV_29d 

This element provides the FAV Airspace Assignment number.

### ICAOStoredFormat_918a

This element may only have the value zero, to indicate that none of the
Other Information elements (with suffixes 918b -- 918x) is present in
the message.

### EETIndicator_918b

This element specifies Significant Points or Flight Information Region
(FIR) Boundary designators and accumulated estimated elapsed times to
such points or boundaries, when so prescribed on the basis of regional
air navigation agreements, or by the appropriate Air Traffic Service
(ATS) authority. **EET** stands for Estimated Elapsed Time. Free-form
text up to a total of 3,000 characters. The element consists of one or
more Significant Points with appended estimated flying time from
departure in *hhmm* format with a blank separating each occurrence of
Significant Point and time.

### RIFIndicator_918c

This element specifies the route to a revised destination aerodrome,
followed by the aerodrome location code. The revised route is subject to
re-clearance in flight. **RIF** stands for Revised in Flight. Free-form
string of up to 3,000 characters. The destination aerodrome has to be
specified using the four-letter ICAO location code.

### REGIndicator_918d

This element specifies Aircraft Registration (tail number), if different
from the aircraft identification specified in element flightId-\_02a.
Free-form string of up to 3000 characters.

### SELIndicator_918e

This element specifies the SELCAL code. SELCAL is a selective-calling
radio system that alerts aircraft crew to incoming radio communications.
Free-form string of up to 3000 characters.

### OPRIndicator_918f

This field specifies the Aircraft Operator, if not obvious from the
aircraft identification in flightId_02a. Free-form string of up to 3000
characters.

### STSIndicator_918g

This element specifies the Reason for Special Handling by ATS, such as
hospital aircraft. Free-form string of up to 3000 characters. The
following are the only valid special handling indicators: **ALTRV**,
**ATFMX**, **FFR**, **FLTCK**, **HAZMAT**, **HEAD**, **HOSP**, **HUM**,
**MARSA**, **MEDEVAC**, **NONRVSM**, **SAR**, **STATE**, **NONRNP10**,
**NONRPN10**, **PROTECTED**, **CARGO**, **CARGO FLT.**

### TYPIndicator_918h

Type(s) of Aircraft, preceded if necessary by number of aircraft, if
ZZZZ is specified in the element numberOfAircraft_03a. Free-form string
of up to 3000 characters.

### PERIndicator_918i

This element specifies the aircraft performance data. Single valid
letter specified in PAN-OPS 8168 Volume 1: **A** -- Indicated airspeed
(IAS) less than 169 km/h (91kt), **B** -- IAS between 169 km/h (91kt)
and 224 km/h (121 kt), **C** -- IAS between 224 km/h (121 kt) and 261
km/h ( 141 kt), **D** -- IAS between 261 km/h ( 141 kt) and 307 km/h
(166 kt), **E** -- IAS between 307 km/h (166 kt) and 391 km/h (211 kt),
**H** -- Helicopters.

### COMIndicator_918j

This element contains Communication Equipment Data. It is used for
additional Communication Equipment on board not specified in the
flightPlanRoute_10a element. Free-form string of up to 3000 characters.

### DATIndicator_918k

This element specifies data related to data link capability. Free-form
string of up to 3000 characters. Valid values are: **S** -- satellite
data link, **H** -- HF data link, **V** -- VHF data link, **M** -- SSR
Mode S data link. One or more of the valid letters may be specified in
this element.

### NAVIndicator_918l

This element contains Navigation Equipment Data. It is used for
additional Navigation Equipment not specified in the flightPlanRoute_10a
element. Free-form string of up to 3000 characters.

### DEPIndicator_918m

This element contains the name of the departure aerodrome(s). Free-form
string of up to 3000 characters.

### DESTIndicator_918n

This element includes the name of the destination aerodrome(s).
Free-form string of up to 3000 characters.

### ALTNIndicator_918o

This element includes the name of the alternate destination
aerodrome(s). Free-form string of up to 3000 characters.

### RALTIndicator_918p

This element contains the en route alternate aerodrome(s). Free-form
string of up to 3000 characters.

### CODEIndicator_918q

This element specifies the aircraft CPDLC address. Free-form string of
up to 3000 characters.

### RACEIndicator_918r

This element specifies the requested altitude and speed en route.
Free-form string of up to 3000 characters.

### SURIndicator_918s

This element specifies the surveillance applications or capabilities not
specified in localIntendedRoute_10b. Free-form string of up to 3000
characters.

### DLEIndicator_918t

This element specifies significant en route delay or holding point(s),
followed by length of delay. Free-form string of up to 3000 characters.
The length of delay is specified in the format *hhmm*.

### TALTIndicator_918u

This element specifies the takeoff alternate aerodrome. Free-form string
of up to 3000 characters. Valid formats include aerodrome name or any of
the fix formats (i.e., lat/long, fix-radial-distance, or name).

### DOFIndicator_918v

This element specifies the date of flight. Six-digit date in the format
*yymmdd*.

### ORGNIndicator_918w

This element specifies the originator's eight-letter AFTN address or
other appropriate contact details, in cases where the originator of the
flight plan may not be readily identified, as required by the
appropriate ATS authority. Eight-letter character string.

### PBNIndicator_918x

This element specifies the RNAV or RNP capability. **PBN** stands for
Performance Based Navigation. Up to eight two-character specifications
may be included, for a total of 16 characters. RNAV and RNP capabilities
are two-characters each, as follows. **RNAV specifications**: **A1** -
RNAV10 (RNP 10), **B1** - RNAV 5 all permitted sensors, **B2** - RNAV 5
GNSS, **B3** - RNAV 5 DME/DME, **B4** - RNAV 5 VOR/DME, **B5** - RNAV 5
INS or IRS, **B6** - RNAV 5 LORANC, **C1** - RNAV 2 all permitted
sensors, **C2** - RNAV 2 GNSS, **C3** - RNAV 2 DME/DME, **C4** - RNAV 2
DME/DME/IRU, **D1** - RNAV 1 all permitted sensors, **D2** - RNAV 1
GNSS, **D3** - RNAV 1 DME/DME, **D4** - RNAV 1 DME/DME/IRU. **RNP
specifications**: **L1** - RNP 4, **O1** - Basic RNP 1 all permitted
sensors, **O2** - Basic RNP 1 GNSS, **O3** - Basic RNP 1 DME/DME,
**O4** - Basic RNP 1 DME/DME/IRU, **S1** - RNP APCH, **S2** - RNP APCH
with BAR-VNAV, **T1** - RNP AR APCH with RF (special authorization
required), **T2** - RNP AR APCH without RF (special authorization
required).

### ICAO1stAdaptedField18_999a

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO2ndAdaptedField18_999b 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO3rdAdaptedField18_999c 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO4thAdaptedField18_999d 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO5thAdaptedField18_999e 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO6thAdaptedField18_999f 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO7thAdaptedField18_999g 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO8thAdaptedField18_999h 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO9thAdaptedField18_999i 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO10thAdaptedField18_999j 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO11thAdaptedField18_999k 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO12thAdaptedField18_999l 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO13thAdaptedField18_999m

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO14thAdaptedField18_999n 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO15thAdaptedField18_999o 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO16thAdaptedField18_999p 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO17thAdaptedField18_999q

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO18thAdaptedField18_999r 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO19thAdaptedField18_999s 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO20thAdaptedField18_999t 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO21stAdaptedField18_999u 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO22ndAdaptedField18_999v 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO23rdAdaptedField18_999w 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO24thAdaptedField18_999x 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### ICAO25thAdaptedField18_999y 

Elements having the suffix of *\_999a* through *\_999y* contain the data
that is present for the optionally adapted element 918 indicators that
are transmitted to CMS, when applicable, using a Field Reference Number
of 999, with elements *a* through *y*.

### lastSeqNo_245a 

The ERAM sequence number of the last message received for a flight.
Sequence number is part of field 00.

### lastFltMsgRcvd_245b 

This element specifies the time the last message was received for a
flight.

### RNVArrival_925a

This element specifies the RNAV accuracy value for the arrival phase of
the flight expressed in hundredths (.01) nm. The allowable range is
0001-9999. If the value is 0 then the field is not included.

### RNVEnroute_925b

This element specifies the RNAV accuracy value for the en route phase of
the flight expressed in hundredths (.01) nm. The allowable range is
0001-9999. If the value is 0 then the field is not included.

### RNVOceanic_925c

This element specifies the RNAV accuracy value for the oceanic phase of
the flight expressed in hundredths (.01) nm. The allowable range is
0001-9999. If the value is 0 then the field is not included.

### RNVDeparture_925d

This element specifies the RNAV accuracy value for the departure phase
of the flight expressed in hundredths (.01) nm. The allowable range is
0001-9999. If the value is 0 then the field is not included.

### RNVSpare1_925e

This is a spare element.

### RNVSpare2_925f

This is a spare element.

### tentativeFlightPlanIndicator_2459 

This element indicates whether the flight plan data is from a tentative
flight plan or not. Indicator is marked by asterisk (\*).

### RNPArrival_925g

This element specifies the RNP accuracy value for the arrival phase of
the flight expressed in hundredths (.01) nm. The allowable range is
0001-9999. If the value is 0 then the field is not included.

### RNPEnroute_925h

This element specifies the RNP accuracy value for the en route phase of
the flight expressed in hundredths (.01) nm. The allowable range is
0001-9999. If the value is 0 then the field is not included.

### RNPOceanic_925i

This element specifies the RNP accuracy value for the oceanic phase of
the flight expressed in hundredths (.01) nm. The allowable range is
0001-9999. If the value is 0 then the field is not included.

### RNPDeparture_925j

This element specifies the RNP accuracy value for the departure phase of
the flight expressed in hundredths (.01) nm. The allowable range is
0001-9999. If the value is 0 then the field is not included.

### RNPSpare1_925k

This is a spare element.

### RNPSpare2_925l

This is a spare element.

### reconReportedAlt_2460 

If the flight is active, this field contains the reported altitude from
the last track message received for the flight.

### cancellationIndicator_92b

This optional element includes a cancellation indicator. The letter
**C** is the only valid value.

### ATCIntendedRoute_10c

The ATC Intended Route element contains the current cleared flight plan
route with any unacknowledged auto routes already applied. The ATC
Intended Route includes to-be-applied AARs that are not to be notified
in the current center. It is intended for clients that wish to know the
currently expected route of the flight across contiguous ERAM airspace.
Field 10c contains the filed route (Field 10a) merged with any adapted
routes (preferential routes, transition fixes and A- line fixes).
Optional Field 10c is sent to ATM-IPOP, when parameter Merged ATC
Intended Route Switch (MARS) is ON and if either one of the following is
true: If Field 10b exists and Field 10c is not the same as Field 10b or
if Field 10b does not exist and Field 10c is not the same as Field 10a.
Minimum length = 3, Maximum length = 1000.

### flightPlanRouteTevNo_2468

This optional element specifies the flight plan route revision number.

### clearanceRoute_2469 

No description. Minimum length = 3, Maximum length = 1000.

### comNavApproachEquipICAO2012_910c 

This element is the ICOA 2012 version of the element
comNavApproachEquip_910a. The valid values are: **N** -- No equipment is
carried, or equipment is unserviceable, **S** -- Standard equipment is
carried and is serviceable, **A** -- GBAS landing system **B** -- LPV
(APV with SBAS) **C** -- LORAN C, **D** -- DME, **E1** -- FMC WPR ACARS,
**E2** -- D-FIS ACARS, **E3** -- PDC ACARS, **F** -- ADF, **G** -- GNSS,
**H** -- HF RTF, **I** -- Inertial Navigation, **J1** -- CPDLC ATN VDL
Mode 2, **J2** -- CPDLC FANS 1/A HDFL, **J3** -- CPDLC FANS 1/A VDL Mode
A, **J4** -- CPDLC FANS 1/A VDL Mode 2, **J5** -- CPDLC FANS 1/A SATCOM
(INMARSAT), **J6** -- CPDLC FANS 1/A SATCOM (MTSAT), **J7** -- CPDLC
FANS 1/A SATCOM (Iridium), **K** -- MLS, **L** -- ILS, **M1** -- ATC RTF
SATCOM (INMARSAT), **M2** -- ATC RTF SATCOM (MTSAT), **M3** -- ATC RTF
(Iridium), **O** -- VOR, **P1-P9** -- Reserved for RCP, **R** -- PBN
approved, **T** -- TACAN, **U** -- UHF RTF, **V** -- VHF RTF, **W** --
RVSM approved, **X** -- MNPS approved, **Y** -- VHF with 8.33 kHz
spacing capacity, **Z** -- Other equipment carried.

### survEquipICAO2012_910d

This element is the ICAO 2012 equivalent of the element survEquip_910b.
Minimum element length = 1, Maximum element length = 20. The valid
values are the following: **N** *-- No surveillance equipment or*
equipment unserviceable, **A** -- Transponder Mode A, **C** --
Transponder Mode A and C, **E** -- Transponder -- Mode S, including
aircraft identification, pressure-altitude and extended squitter
Automated Dependent Surveillance-Broadcast (ADS- B) capability, **H** --
Transponder -- Mode S, including aircraft identification,
pressure-altitude and enhanced surveillance capability, **I** --
Transponder -- Mode S, including aircraft identification, but no
pressure-altitude capability, **L** -- Transponder -- Mode S, including
aircraft identification, pressure-altitude, extended squitter (ADS-B)
and enhanced surveillance capability, **P** -- Transponder -- Mode S,
including pressure-altitude, but no aircraft identification, **S** --
Transponder -- Mode S, including both pressure-altitude and aircraft
identification capability, **X** -- Transponder - Mode S with neither
aircraft identification nor pressure-altitude capability, **B1** --
ADS-B with dedicated 1090 mHz, ADS-B "out" capability, **B2** -- ADS-B
with dedicated 1090 mHz ADS-B "out" and "in" capability, **U1** -- ADS-B
"out" capability using UAT, **U2** -- ADS-B "out" AND "IN" capability
using UAT, **V1** -- ADS-B "out" capability using VDL Mode 4, **V2** --
ADS-B "out" and "in" capability using VDL Mode 4, D1 -- ADS-C with FANS
1/A capabilities, **G1** -- ADS-C with ATN capabilities.

#   {#section .list-paragraph}

# Appendix A: Acronyms {#appendix-a-acronyms .list-paragraph}

  -----------------------------------------------------------------------
  **Acronym**    **Definition**
  -------------- --------------------------------------------------------
  3D             Three Dimensional

  AAR            Adapted Arrival Route

  ABV            Above

  ACARS          Aircraft Communications Addressing, and Reporting System

  ADAR           Adapted Departure and Arrival Route

  ADF            Automatic Direction Finder

  ADR            Adapted Departure Route

  ADS            Automatic Dependent Surveillance

  ADS-B          Automatic Dependent Surveillance - Broadcast

  ADS-C          Automatic Dependent Surveillance - Contract

  AFDI           Arrival Flight Drop Interval

  AFTN           Aeronautical Fixed Telecommunication Network

  AH             Flight Amendment Information Message

  ALTRV          Altitude Reservation

  APCH           Approach

  APV            Approach Procedures with Vertical Guidance

  ARTCC          Air Route Traffic Control Center

  ARTS           Automated Radar Terminal System

  ATC            Air Traffic Control

  ATFMX          Exempt from Air Traffic Flow Management

  ATM            Air Traffic Management

  ATN            Aeronautical Telecommunication Network

  ATS            Air Traffic Service

  BAR-VNAV       Barometric Vertical Navigation

  CID            Computer Identification

  CL             Cancellation Information Message

  CMS            Common Message Set

  CONUS          Contiguous United States

  CPDLC          Controller-Pilot Data Link Communication

  DA             Data Accept

  D-FIS          Digital Flight Information Service

  DH             Departure Information Message

  DME            Distance Measuring Equipment

  EDCT           Expect Departure Clearance Time

  EDDS           En Route Data Distribution System

  EET            Estimated Elapsed Time

  EFDI           Expire Fix Drop Interval

  ERADP          En Route Airspace Data Publication

  ERAM           En Route Automation Modernization

  ERFDP          En Route Flight Data Publication

  ERGMP          En Route General Message Publication

  ERODP          En Route Operational Data Publication

  ET             Expected Departure Time Information Message

  ETA            Estimated Time of Arrival

  FAA            Federal Aviation Administration

  FANS           Future Air Navigation System

  FAV            Fixed Airspace Volume

  FDB            Full Data Block

  FDPS           Flight Data Publication Service

  FFR            Fire Fighting

  FH             Flight Plan Information Message

  FIR            Flight Information Region

  FIXM           Flight Information eXchange Model

  FLTCK          Flight Check

  FMC            Flight Management Computer

  FMS            Flight Management System

  GBAS           Ground Based Augmentation System

  GNSS           Global Navigation Satellite System

  GPS            Global Positioning System

  GUFI           Globally Unique Flight Identifier

  H              Hour

  HADDS          Host Air Traffic Management Data Distribution System

  HAZMAT         Hazardous Material Flight

  HEAD           Head of State Flight

  HF             Full Data Block Fourth Line Information Message

  HF             High Frequency

  HFDL           High Frequency Data Link

  HH             Hold Information Message

  HOSP           Medical Flight

  HP             Position Update Information Message

  HT             Point Out Information Message

  HU             Flight Plan Update Information Message

  HUM            Humanitarian Flight

  HV             Flight Arrival Information Message

  HX             Converted Route Information Message

  HZ             Automated Radar Terminal System Flow Control Track/Full
                 Data Block Information

  IAS            Indicated Airspeed

  ICAO           International Civil Aviation Organization

  ID             Identification

  IFPA           Instrument Flight Procedures Automation

  IFR            Instrument Flight Rules

  IH             Aircraft ID Amendment Information Message

  ILS            Instrument Landing System

  INMARSAT       International Marine/Maritime Satellite

  INV            Invalid

  IPOP           Intermediate Point of Presence

  IRU            Inertial Reference Unit

  JMS            Java Messaging Service

  KM             Kilometer

  KT             Knots

  LAT            Latitude

  LH             Interim Altitude Information Message

  LOCID          Location Identifier

  LONG           Longitude

  LORAN          Long Range Navigation

  LPV            Localizer Performance with Vertical Guidance

  MARS           Merged Air Traffic Control Intended Route Switch

  MARSA          Military Assumes Responsibility for Separation

  MEDEVAC        Medical Evacuation Flight

  MHz            megahertz

  MLS            Microwave Landing System

  MNPS           Minimum Navigation Performance Specifications

  MTSAT          Multifunction Transport Satellite

  NAS            National Airspace System

  NEMS           National Airspace System Enterprise Messaging System

  NESG           National Airspace System Enterprise Security Gateway

  NI             Tentative Aircraft Identification Amendment Information
                 Message

  NL             Tentative Flight Plan Removal Message

  NM             Nautical Miles

  NONRNP10       Non-Required Navigation Performance 10 NM Flight
                 Operations in RNP10 airspace

  NONRVSM        Non-Reduced Vertical Separation Minima Operations in
                 RVSM airspace

  NP             Tentative Flight Plan Information Message

  NU             Tentative Flight Plan Amendment Information Message

  OH             Handoff Status Information Message

  OTP            Visual Flight Rules on Top

  PBN            Performance Based Navigation

  PDC            Pre-Departure Clearance

  PH             Progress Report Information Message

  PT             Inbound Point Out Information Message

  RCP            Required Communications Performance

  RH             Drop Track Information Message

  RIF            Revised in Flight

  RNAV           Area Navigation

  RNP            Required Navigation Performance

  RTF            Radiotelephony

  RVSM           Reduced Vertical Separation Minima

  SAR            Search and Rescue

  SATCOM         Satellite Communications

  SBAS           Satellite Based Augmentation System

  SC             Speed Classified

  SELCAL         Selective Calling

  SFDPS          System Wide Information Management Flight Data
                 Publication Service

  SID            Standard Instrument Departure

  SSPID          Site Specific Plan Identifier

  SSR            Secondary Surveillance Radar

  STAR           Standard Terminal Arrival Route

  STATE          Military, Customs, or Police

  SWIM           System Wide Information Management

  TACAN          Tactical Air Navigation System

  TB             Terminate Beacon Code

  TH             Track Information Message

  TRACON         Terminal Radar Approach Control

  UAT            Universal Access Transceiver

  UFPI           Unique Flight Plan Identifier

  UHF            Ultra-High Frequency

  UTC            Universal Time Coordinated

  VDL            Very High Frequency Data Link

  VFR            Visual Flight Rules

  VHF            Very High Frequency

  VOR            Very High Frequency Omnidirectional Range

  WAAS           Wide Area Augmentation System

  WPR            Waypoint Position Reporting

  XML            eXtensible Markup Language
  -----------------------------------------------------------------------

# Appendix B: Flight Data Properties {#appendix-b-flight-data-properties .list-paragraph}

Table 3. Flight Data Properties

+-------------------+----------------+---------------------------------+
| **Property Name** | *              | **Permissible Values**          |
|                   | *Description** |                                 |
+===================+================+=================================+
| FD                | This property, | ZAB, ZAU, ZBW, ZDC, ZDV, ZFW,   |
| PS_SourceFacility | of type        | ZHU, ZID, ZJX, ZKC, ZLA, ZLC,   |
|                   | String,        | ZMA, ZME, ZMP, ZNY, ZOA, ZOB,   |
|                   | indicates the  | ZSE, ZTL                        |
|                   | source, the    |                                 |
|                   | ARTCC, of the  |                                 |
|                   | CMS message    |                                 |
|                   | that caused    |                                 |
|                   | this message   |                                 |
|                   | to be          |                                 |
|                   | published.     |                                 |
+-------------------+----------------+---------------------------------+
| FDPS_SourceSystem | This property, | FDPS1, FDPS2                    |
|                   | of type        |                                 |
|                   | String,        |                                 |
|                   | indicates the  |                                 |
|                   | specific       |                                 |
|                   | instance of    |                                 |
|                   | SFDPS that     |                                 |
|                   | published the  |                                 |
|                   | message. A     |                                 |
|                   | change in the  |                                 |
|                   | value of this  |                                 |
|                   | property       |                                 |
|                   | indicates that |                                 |
|                   | the producer   |                                 |
|                   | has switched   |                                 |
|                   | from one site  |                                 |
|                   | to the other.  |                                 |
+-------------------+----------------+---------------------------------+
| FDPS_MessageType  | This property, | FH, AH, HX, CL, DH, IH, HH, PH, |
|                   | of type        | HV, HU, ET, HP, NP, NI, NL, NU, |
|                   | String,        | BATCH_TH, RH, LH, HZ, BA, RE,   |
|                   | indicates the  | HF, HT, PT, OH, FH_FIXM,        |
|                   | type of        | AH_FIXM, HX_FIXM, CL_FIXM,      |
|                   | message        | DH_FIXM, IH_FIXM,HH_FIXM,       |
|                   |                | PH_FIXM, HV_FIXM, HU_FIXM,      |
|                   |                | ET_FIXM, HP_FIXM, NP_FIXM,      |
|                   |                | NI_FIXM, NL_FIXM, NU_FIXM,      |
|                   |                | BATCH_TH_FIXM, RH_FIXM,         |
|                   |                | LH_FIXM, HZ_FIXM, BA_FIXM,      |
|                   |                | RE_FIXM, HF_FIXM, HT_FIXM,      |
|                   |                | PT_FIXM, OH_FIXM, DBRTFPI,      |
|                   |                | DBRTFPI_FIXM                    |
+-------------------+----------------+---------------------------------+
| FD                | This property, | While this property may contain |
| PS_FlightOperator | of type        | any three-letter code or none,  |
|                   | String,        | only those listed below are     |
|                   | indicates the  | available for routing due to    |
|                   | operator of    | limitations of NEMS: DAL, SWA,  |
|                   | the flight     | UAL, AAL, USA, ASQ, JBU, SKW,   |
|                   | that caused    | TRS, ASA, WJA, NKS, FFT, HAL,   |
|                   | this message   | AAY, UPS, FDX.\                 |
|                   | to be          | This property is not available  |
|                   | published.     | as a JMS property for the       |
|                   |                | BATCH_TH and BATCH_TH_FIXM      |
|                   |                | messages. However, for the      |
|                   |                | SimpleXML formatted messages,   |
|                   |                | it is available as an SFDPS     |
|                   |                | property (propFlightOperator)   |
|                   |                | of each individual Track        |
|                   |                | message within the BATCH_TH     |
|                   |                | message. For the FIXM formatted |
|                   |                | messages, it is specified as an |
|                   |                | attribute in each individual    |
|                   |                | Track message within the        |
|                   |                | BATCH_TH_FIXM message:          |
|                   |                | flight/                         |
|                   |                | operator/operatingOrganization/ |
|                   |                | organization/@name.             |
+-------------------+----------------+---------------------------------+
| FDPS_Origin       | This property, | While this property may contain |
|                   | of type        | any destination or none, only   |
|                   | String,        | those listed below are          |
|                   | indicates the  | available for routing due to    |
|                   | originating    | limitations of NEMS:\           |
|                   | airport of the | KATL, KBOS, KBWI, KCLE, KCLT,   |
|                   | flight to      | KCVG, KDCA, KDEN, KDFW, KDTW,   |
|                   | which this     | KEWR, KFLL, KHNL, KIAD, KIAH,   |
|                   | message        | KJFK, KLAS, KLAX, KLGA, KMCO,   |
|                   | applies.       | KMDW, KMEM, KMIA, KMSP, KORD,   |
|                   |                | KPDX, KPHL, KPHX, KPIT,KSAN,    |
|                   |                | KSEA, KSFO, KSLC, KSTL, KTPA.\  |
|                   |                | This property is not available  |
|                   |                | as a JMS property for the       |
|                   |                | BATCH_TH and BATCH_TH_FIXM      |
|                   |                | messages. For the SimpleXML     |
|                   |                | formatted messages, it is       |
|                   |                | specified as a property         |
|                   |                | (propOrigin) of each individual |
|                   |                | Track message within the        |
|                   |                | BATCH_TH message. For the FIXM  |
|                   |                | formatted messages, it is       |
|                   |                | specified as an attribute in    |
|                   |                | each individual Track message   |
|                   |                | within the BATCH_TH_FIXM        |
|                   |                | message:                        |
|                   |                | fl                              |
|                   |                | ight/departure/@departurePoint. |
+-------------------+----------------+---------------------------------+
| FDPS_DestId       | This property, | While this property may contain |
|                   | of type        | any destination or none, only   |
|                   | String,        | those listed below are          |
|                   | indicates the  | available for routing due to    |
|                   | destination    | limitations of NEMS:\           |
|                   | airport of the | KATL, KBOS, KBWI, KCLE, KCLT,   |
|                   | flight to      | KCVG, KDCA, KDEN, KDFW, KDTW,   |
|                   | which this     | KEWR, KFLL, KHNL, KIAD, KIAH,   |
|                   | message        | KJFK, KLAS, KLAX, KLGA, KMCO,   |
|                   | applies.       | KMDW, KMEM, KMIA, KMSP, KORD,   |
|                   |                | KPDX, KPHL, KPHX, KPIT, KSAN,   |
|                   |                | KSEA, KSFO, KSLC, KSTL, KTPA.   |
|                   |                |                                 |
|                   |                | This property is not available  |
|                   |                | as a JMS property for the       |
|                   |                | BATCH_TH and BATCH_TH_FIXM      |
|                   |                | messages. For the SimpleXML     |
|                   |                | formatted messages, it is       |
|                   |                | specified as a property         |
|                   |                | (propDestination) of each       |
|                   |                | individual Track message within |
|                   |                | the BATCH_TH message. For the   |
|                   |                | FIXM formatted messages, it is  |
|                   |                | specified as an attribute in    |
|                   |                | each individual Track message   |
|                   |                | within the BATCH_TH_FIXM        |
|                   |                | message:                        |
|                   |                | flight/arrival/@arrivalPoint.   |
+-------------------+----------------+---------------------------------+
| FDPS_Sensitive    | This property, | TRUE -- The flight is           |
|                   | of type        | military/sensitive.\            |
|                   | Boolean,       | FALSE -- The flight is neither  |
|                   | indicates      | military nor sensitive.         |
|                   | whether the    |                                 |
|                   | flight to      |                                 |
|                   | which this     |                                 |
|                   | message        |                                 |
|                   | applies is     |                                 |
|                   | mili           |                                 |
|                   | tary/sensitive |                                 |
|                   | or not.        |                                 |
+-------------------+----------------+---------------------------------+
| F                 | This property, | TRUE -- The CMS message came    |
| DPS_Authoritative | of type        | from the controlling center.\   |
|                   | Boolean,       | FALSE -- The CMS message did    |
|                   | indicates      | not come from the controlling   |
|                   | whether the    | center.                         |
|                   | CMS message    |                                 |
|                   | that caused    |                                 |
|                   | this message   |                                 |
|                   | to be          |                                 |
|                   | published was  |                                 |
|                   | sent from a    |                                 |
|                   | Source         |                                 |
|                   | Facility or    |                                 |
|                   | ARTCC that was |                                 |
|                   | the            |                                 |
|                   | authoritative  |                                 |
|                   | or controlling |                                 |
|                   | Center of the  |                                 |
|                   | flight.        |                                 |
+-------------------+----------------+---------------------------------+
| FDPS_Recon        | This property, | TRUE -- The message was         |
|                   | of type        | generated as the result of a    |
|                   | Boolean,       | data reconstitution.\           |
|                   | indicates      | FALSE -- The message was not    |
|                   | whether this   | generated as the result of a    |
|                   | message was    | data reconstitution.\           |
|                   | generated as   | Value is set only for           |
|                   | the result of  | reconstitution messages,        |
|                   | a data         | DBRTFPI, DBRTPFI_FIXM.          |
|                   | r              |                                 |
|                   | econstitution. |                                 |
+-------------------+----------------+---------------------------------+
| FDPS_DataType     | This property, | FlightSimpleXML, FlightFIXM     |
|                   | of type        |                                 |
|                   | String,        |                                 |
|                   | indicates the  |                                 |
|                   | type of data   |                                 |
|                   | publication    |                                 |
|                   | this message   |                                 |
|                   | is part of.    |                                 |
+-------------------+----------------+---------------------------------+
| FDPS_OneMinFreq   | This property, | TRUE -- The track message was   |
|                   | of type        | sent at a one-minute interval.\ |
|                   | String,        | FALSE- the track message was    |
|                   | indicates      | sent at a 12-second interval.   |
|                   | whether a      |                                 |
|                   | track message  |                                 |
|                   | was sent at    |                                 |
|                   | one-minute     |                                 |
|                   | intervals or   |                                 |
|                   | at             |                                 |
|                   | twelve-second  |                                 |
|                   | intervals.     |                                 |
+-------------------+----------------+---------------------------------+
| FDPS_Restricted   | This property, | 1\. A -- the message can be     |
|                   | of type        | received by All consumers; it   |
|                   | String,        | contains no beacon codes or is  |
|                   | indicates      | post-departure.\                |
|                   | whether a      | 2. R -- the message is          |
|                   | message can be | Restricted to only consumers    |
|                   | shared with    | authorized to receive the       |
|                   | all users,     | message; it is a pre-departure  |
|                   | only users     | message with a beacon code.\    |
|                   | authorized to  | 3. D -- the beacon code has     |
|                   | receive beacon | been removed (Desensitized) and |
|                   | code           | so the message can be received  |
|                   | information on | by consumers not otherwise      |
|                   | proposed and   | authorized to receive it.\      |
|                   | canceled       | Note: The FDPS_Sensitive        |
|                   | flights, or    | property still applies, and a   |
|                   | only users not | message marked sensitive        |
|                   | authorized to  | (FDPS_Sensitive = 'true') will  |
|                   | receive beacon | only be shared with users       |
|                   | code           | authorized to receive sensitive |
|                   | information on | data, even if the value in the  |
|                   | proposed and   | FDPS_Restricted property is 'A' |
|                   | active         | or 'D.'                         |
|                   | flights.       |                                 |
+-------------------+----------------+---------------------------------+

[^1]: Requires access to FAA NAS Service Registry and Repository (NSRR),
    new accounts can be requested at https://nsrr.faa.gov/user/register
