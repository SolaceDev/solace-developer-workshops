System Wide Information Management (SWIM)

**Surface Movement Event Service (SMES) Operational Context Document**

![](media/image1.png)

Version 1.1

April 25, 2019

**SIGNATURE PAGE**

Name Date

SWIM Implementation Lead

Name Date

SWIM Program Manager

Federal Aviation Administration

800 Independence Avenue, SW

Washington, D.C. 20591

**DOCUMENT CHANGE HISTORY**

  -----------------------------------------------------------------------
  **Version**     **Date**     **Description of Changes**
  --------------- ------------ ------------------------------------------
  1.0             11/6/2017    Initial document for review by the SWIFT
                               focus group

  1.1             4/25/2019    Document updated per feedback from STDDS
                               program
  -----------------------------------------------------------------------

  : []{#_Toc6995289 .anchor}Table . Surface Movement Data Sources

**TABLE OF CONTENTS**

[1 Introduction [1](#introduction)](#introduction)

[2 Airport Information [3](#airport-information)](#airport-information)

[2.1 Airport Surface Movement
[3](#airport-surface-movement)](#airport-surface-movement)

[2.2 References [4](#references)](#references)

[3 Surface Movement Event Service
[6](#surface-movement-event-service)](#surface-movement-event-service)

[3.1 Service Overview [6](#service-overview)](#service-overview)

[3.2 ASDEXMessage [8](#asdexmessage)](#asdexmessage)

[3.2.1 ASDEXMessage Processing Considerations
[11](#asdexmessage-processing-considerations)](#asdexmessage-processing-considerations)

[3.3 SafetyLogicAlertReport
[12](#safetylogicalertreport)](#safetylogicalertreport)

[3.4 SafetyLogicHoldBarMessage
[12](#safetylogicholdbarmessage)](#safetylogicholdbarmessage)

[3.5 SurfaceMovementEventMessage
[14](#surfacemovementeventmessage)](#surfacemovementeventmessage)

[4 SMES Message Types [15](#smes-message-types)](#smes-message-types)

[4.1 ASDEXMessage [17](#asdexmessage-1)](#asdexmessage-1)

[4.1.1 positionReport [17](#positionreport)](#positionreport)

[4.1.2 adsbReport [33](#adsbreport)](#adsbreport)

[4.1.3 mlatReport [39](#mlatreport)](#mlatreport)

[4.1.4 smrReport [40](#smrreport)](#smrreport)

[4.1.5 genericFlightInfo [44](#genericflightinfo)](#genericflightinfo)

[4.1.6 systemStatus [45](#systemstatus)](#systemstatus)

[4.2 SafetyLogicAlertReportMessage
[46](#safetylogicalertreportmessage)](#safetylogicalertreportmessage)

[4.2.1 airport [48](#airport-1)](#airport-1)

[4.2.2 alert [48](#alert)](#alert)

[4.2.3 audio [48](#audio)](#audio)

[4.2.4 curSeverity [48](#curseverity)](#curseverity)

[4.2.5 cycleNum [48](#cyclenum)](#cyclenum)

[4.2.6 encounter [48](#encounter)](#encounter)

[4.2.7 repSeverity [48](#repseverity)](#repseverity)

[4.2.8 situation [48](#situation)](#situation)

[4.2.9 separation [48](#separation)](#separation)

[4.2.10 text [48](#text)](#text)

[4.2.11 time [48](#time-3)](#time-3)

[4.2.12 type [49](#type-1)](#type-1)

[4.2.13 version [49](#version)](#version)

[4.2.14 cleared [49](#cleared)](#cleared)

[4.2.15 location [49](#location)](#location)

[4.2.16 track1 [49](#track1)](#track1)

[4.2.17 track2 [50](#track2)](#track2)

[4.3 SafetyLogicHoldBarMessage
[51](#safetylogicholdbarmessage-1)](#safetylogicholdbarmessage-1)

[4.3.1 airport [52](#airport-2)](#airport-2)

[4.3.2 control [52](#control)](#control)

[4.3.3 status [52](#status-3)](#status-3)

[4.4 SurfaceMovementEventMessage
[53](#surfacemovementeventmessage-1)](#surfacemovementeventmessage-1)

[4.4.1 callsign [54](#callsign-2)](#callsign-2)

[4.4.2 track [54](#track-3)](#track-3)

[4.4.3 stid [54](#stid-1)](#stid-1)

[4.4.4 mode3Acode [54](#mode3acode-4)](#mode3acode-4)

[4.4.5 acAddress [54](#acaddress-4)](#acaddress-4)

[4.4.6 time [54](#time-4)](#time-4)

[4.4.7 event [54](#event)](#event)

[4.4.8 position [54](#position-3)](#position-3)

[4.4.9 altitude [55](#altitude-1)](#altitude-1)

[4.4.10 status [55](#status-4)](#status-4)

[4.4.11 events [55](#events)](#events)

[4.4.12 enhancedData [55](#enhanceddata)](#enhanceddata)

[Appendix A: Acronym Listing
[57](#appendix-a-acronym-listing)](#appendix-a-acronym-listing)

**\
**

**LIST OF FIGURES**

[Figure 1 - Movement and Non-Movement Areas
[3](#_Toc494179816)](#_Toc494179816)

[Figure 5 - SMES: From Source to Message
[8](#_Ref6487396)](#_Ref6487396)

[Figure 2 - Example ASDE-X Display [10](#_Toc494179817)](#_Toc494179817)

[Figure 3 - ASDEXMessage Sub-Types [11](#_Toc6995297)](#_Toc6995297)

[Figure 4 - Runway Status Light System
[14](#_Toc494179818)](#_Toc494179818)

[Figure 6. asdexMsg Structure [17](#_Toc6995299)](#_Toc6995299)

[Figure 7 - Position Report Structure
[18](#_Ref491338037)](#_Ref491338037)

[Figure 8. flightId Structure [19](#_Toc6995301)](#_Toc6995301)

[Figure 9. flightInfo Structure [20](#_Toc6995302)](#_Toc6995302)

[Figure 10 - position Structure [21](#_Toc6995303)](#_Toc6995303)

[Figure 11 - movement Structure [23](#_Toc6995304)](#_Toc6995304)

[Figure 12. status Structure [24](#_Toc6995305)](#_Toc6995305)

[Figure 13 - slc Structure [30](#_Toc6995306)](#_Toc6995306)

[Figure 14 - manual Structure [31](#_Toc6995307)](#_Toc6995307)

[Figure 15 - targetExtentType Structure
[32](#_Toc6995308)](#_Toc6995308)

[Figure 16 - adsbReport Structure [33](#_Ref491413886)](#_Ref491413886)

[Figure 17 - report Structure [34](#_Toc491259659)](#_Toc491259659)

[Figure 18. basicReport Structure [34](#_Toc6995311)](#_Toc6995311)

[Figure 19. mode3ACode Structure [36](#_Toc6995312)](#_Toc6995312)

[Figure 20. descriptor Structure [37](#_Toc6995313)](#_Toc6995313)

[Figure 21. status Structure [38](#_Toc6995314)](#_Toc6995314)

[Figure 22. extent Structure [39](#_Toc6995315)](#_Toc6995315)

[Figure 23. smrReport Structure [40](#_Toc6995316)](#_Toc6995316)

[Figure 24. report Structure [40](#_Toc6995317)](#_Toc6995317)

[Figure 25. extent Structure [42](#_Toc6995318)](#_Toc6995318)

[Figure 26. status Structure [43](#_Toc6995319)](#_Toc6995319)

[Figure 27. genericFlightInfo Structure
[44](#_Toc6995320)](#_Toc6995320)

[Figure 28. systemStatus Structure [46](#_Toc6995321)](#_Toc6995321)

[Figure 29 - SafetyLogicAlertReportMessage Structure
[47](#_Ref491431059)](#_Ref491431059)

[Figure 30 - SafetlyLogicHoldBarMessage Structure
[52](#_Toc494179834)](#_Toc494179834)

[Figure 31 - SurfaceMovementEventMessage Structure
[53](#_Ref491432726)](#_Ref491432726)

[Figure 32. position Structure [54](#_Toc6995325)](#_Toc6995325)

[Figure 33. events Structure [55](#_Toc6995326)](#_Toc6995326)

[Figure 34. enhancedData Structure [56](#_Toc6995327)](#_Toc6995327)

**LIST OF TABLES**

[Table 1. Surface Movement Data Sources [6](#_Toc6995289)](#_Toc6995289)

[Table 2 - Airports Equipped with ASDE-X or ASSC
[6](#_Ref491777457)](#_Ref491777457)

[Table 3 - ASDEXMessage Content Size [12](#_Toc6995291)](#_Toc6995291)

[Table 4 - SMES Message Type Indicator
[16](#_Toc494179837)](#_Toc494179837)

[Table 5. Acronym Listing [57](#_Toc6995293)](#_Toc6995293)

# Introduction

The purpose of this document is to provide users of the SWIM Terminal
Data Distribution System (STDDS) Surface Movement Event Service
(SMES)[^1] data product provided through Federal Aviation Administration
(FAA) System Wide Information Management (SWIM) infrastructure
background information on how the data is generated, what the data
means, and how the data can be used.

-   The beginning of this document provides details on the systems and
    sensors which are the source of the STDDS SMES data.

-   Next, is a brief discussion on how the data can be utilized by
    aviation stakeholders to improve their operation using the STDDS
    SMES data.

-   Finally, a detailed breakdown of the individual data elements, their
    definition, and their context is provided.

STDDS provides Service Oriented Architecture (SOA) interfaces for tower
and Terminal Radar Approach Control (TRACON) systems to send terminal
events to the National Airspace System (NAS) Enterprise Message Service
(NEMS) for subscription by NAS and non-NAS consumers using SWIM
compliant infrastructure and interface standards.

STDDS interfaces with the Runway Visual Range (RVR) system, Electronic
Flight Strip Transfer System (EFSTS), Airport Surface Detection
Equipment Model X (ASDE-X) system, Airport Surface Surveillance
Capability (ASSC) system, and Tower Data Link Service (TDLS) system at
airports to accept, derive and publish airport information. STDDS also
interfaces with the Standard Terminal Automation Replacement System
(STARS) General NAS User Services (GeNUS) interface at TRACONs.

STDDS publishes five (5) different categories of data, each published by
a different STDDS information service. The five (5) services are:

1.  Airport Data Service (APDS) -- publishes runway visual range (RVR)
    observations for select towers associated with a TRACON.

2.  Infrastructure System Monitor and Control (ISMC) sends system status
    and the status of its connections to external systems.

3.  Surface Movement Event Service (SMES) -- publishes derived surface
    movement events for all aircraft monitored at towers associated with
    a STDDS TRACON. The service also publishes track positions for all
    aircraft and vehicles collected from towers associated with a STDDS
    TRACON. Track positions originate from ASDE-X/ASSC System Track
    Reports (CAT11), Multilaterated (MLAT) Plot Reports (CAT10), or
    Automatic Dependent Surveillance-Broadcast (ADS-B) Plot Reports
    (CAT10). In addition, the service publishes safety logic alert
    reports and safety logic hold bar messages.

4.  Terminal Automation Information Service (TAIS) -- sends operational
    live flight plan data, track data, sign-in/sign-out data, Instrument
    Meteorological Conditions (IMC) data, traffic count data, and
    performance monitoring data from the STARS at select TRACONs.

5.  Tower Departure Event Service (TDES) -- sends d departure events for
    all flights from select towers associated with a TRACON. In
    addition, the service publishes Digital Automatic Terminal
    Information System (D-ATIS) information sent automatically to
    aircraft and operators at airports associated with STDDS TRACONs.
    The service provides a reconstitution mechanism for end-users
    interested in receiving historic departure events upon STDDS
    startup/connection.

Due to the scope of information provided by STDDS, the capabilities of
APDS, ISMC, SMES, TDES, and TAIS will be covered in five separate
Operational Context documents. This document will cover SMES only. For
information on TDES, ISMC, SMES, and TAIS please refer to those specific
Operational Context Documents.

# Airport Information

## Airport Surface Movement

In this section, an overview of airport surface movement concepts and
the systems used to manage aircraft movement is provided. The airport
surface is divided into two sections known as "Movement" and
"Non-Movement" areas. Movement areas are the parts of the airport
surface used by aircraft for takeoff, landing, and taxing. This excludes
the aprons, loading, and aircraft parking areas which are known as
"Non-Movement" areas. Movement areas are controlled by FAA Ground
Controllers, who are responsible for coordinating the movement of
aircraft to and from the runways via taxiways on the airport surface.
These ground controllers' primary job is to ensure safety and maintain
smooth flow of surface traffic. Pilots must get clearance to enter a
Movement area from the ground controller, who will provide specific
instructions on the route an aircraft must take. The Non-Movement areas
are controlled by the airline and air cargo operators whose primary job
is to ensure safety and controlling the logistics of loading and
unloading of aircraft. The figure below provides a depiction of the
division between Movement and Non-Movement areas at Ronald Regan
Washington National Airport (DCA).

![](media/image2.png){width="6.5in" height="3.522422353455818in"}

[]{#_Toc494179816 .anchor}Figure 1 - Movement and Non-Movement Areas

To support the ability of Ground Controllers to manage the safety and
flow of aircraft in the movement areas, the FAA has installed the ASDE-X
at the 35 busiest FAA controlled airports and will be deploying and
upgraded version known as ASSC at 10 additional airports over the next
few years (see Table 21 for complete listing of operational ASDE-X/ASSC
sites). ASDE-X/ASSC use a combination of radar and multilateration to
detect the location of aircraft on the airport surface. The location of
aircraft are depicted on a display used by the ground controller
enabling them to monitor aircraft location even if the aircraft is out
of their line-of-sight or during poor weather conditions.

In addition to tracking, the ASDE-X/ASSC systems monitor the trajectory
of each aircraft and provides a warning if the software predicts that
two aircraft will collide in the near future. This warning system is
also integrated with the Runway Status Light (RWSL) system which uses
red and green light embedded into the airport surface at strategic
location such as taxiway intersections or runway entrances. The RWSL
system works by monitors the ASDE-X/ASSC data and predicts the
trajectory of the aircraft on the airport surface. If any aircraft
attempts to enter a runway or taxiway intersection which is in use or
soon to be in use by another aircraft, the RWSL system will turn the
lights imbedded in the ground from "green" to "red" to alert the pilot
that if they continue taxing, they may collide with another aircraft.
The RWSL is fully automated and is available at the airports listed
under the "SafetyLogicHoldBarMessage" section below.

## References

Additional information pertaining to STDDS SMES and its capabilities can
be found at:

-   <https://nsrr.faa.gov/services/stdds-sme/documents>[^2]

    -   STDDS Schema

    -   STDDS Java Messaging Service Description Document (JMSDD)

    -   STDDS Web Service Requirements Document (WSRD)

    -   STDDS Release Notes

    -   STDDS Concept of Operations

    -   STDDS Site Data Availability

    -   Sample client to consume and process STDDS data

    -   Sample STDDS SMES data

-   <https://www.faa.gov/air_traffic/technology/swim/stdds/>

    -   Information and news about the STDDS Program

    -   Flight Information Exchange Model ([FIXM)-Mediated STDDS Data
        Overview](https://www.faa.gov/air_traffic/technology/swim/stdds/media/FIXM_Mediated_STDDS_Data_Overview_v2.pdf)

-   <https://www.faa.gov/air_traffic/technology/asde-x/>

    -   Information about ASDE-X capabilities

-   <https://www.faa.gov/nextgen/programs/adsb/atc/assc/>

    -   Information about ASSC capabilities

-   <https://www.faa.gov/about/office_org/headquarters_offices/avs/offices/air/transformation/csp/acronyms/>

    -   List of air traffic-related FAA acronyms

# Surface Movement Event Service 

## Service Overview

The Surface Movement Event Services is a SWIM service developed to
provide data generated by the ASDE-X, ASSC, and RWSL systems. The SMES
data is available to users both within and outside the FAA as a one-way
data stream and is built according to FAA SWIM standards and
requirements. Information produced by SMES is derived from airport
surface sensor data received via the SWIM Terminal Data Distribution
System (STDDS). SMES receives ASDE-X/ASSC position and status reports
from STDDS. The origin of the data used to derive position reports are
generated by System Movement Radar (SMR), MLAT Plot Reports, Automatic
Surveillance Radar (ASR), and/or Automatic Dependent
Surveillance-Broadcast (ADS-B) sensors. In addition to position reports,
SMES also publishes safety logic hold bar messages that report the
status of RWSL. Authorized internal NAS users (i.e. not external users
such as airlines) may also receive safety logic alert reports, which
detect accidents and incidents between aircraft and other vehicles on
the airport surface.

  ------------------------------------------------------------------------
  **Movement Data  **Data Sources in    **Data Sources     **Surface
  Category**       ASDE-X/ASSC**        Published in       Information
                                        SMES**             Location**
  ---------------- -------------------- ------------------ ---------------
  CAT10            MLAT, ADS-B, ASR,    MLAT, ADS-B        Non-Movement
                   SMR                                     Area

  CAT11            MLAT, ADS-B, ASR,    MLAT, ADS-B, ASR,  Movement Area
                   SMR                  SMR                
  ------------------------------------------------------------------------

  : []{#_Ref491777457 .anchor}Table 2 - Airports Equipped with ASDE-X or
  ASSC

SMES data is only available at airports equipped with either the ASDE-X
system or ASSC. Below is a table listing the airports and their
capability:

  ------------------------------------------------------------------------------
  **Airport Name**                                 **Airport    **Capability**
                                                   Code**       
  ------------------------------------------------ ------------ ----------------
  Andrews Air Force Base                           ADW          ASSC[^3]

  Baltimore Washington International Thurgood      BWI          ASDE-X
  Marshall Airport                                              

  Boston Logan International Airport               BOS          ASDE-X

  Bradley International Airport                    BDL          ASDE-X

  Charlotte Douglas International Airport          CLT          ASDE-X

  Chicago Midway Airport                           MDW          ASDE-X

  Chicago O\'Hare International Airport            ORD          ASDE-X

  Cincinnati/Northern Kentucky International       CVG          ASSC
  Airport                                                       

  Cleveland Hopkins International Airport          CLE          ASSC

  Dallas Fort Worth International Airport          DFW          ASDE-X

  Denver International Airport                     DEN          ASDE-X

  Detroit Metro Wayne County Airport               DTW          ASDE-X

  Fort Lauderdale / Hollywood Airport              FLL          ASDE-X

  General Mitchell International Airport           MKE          ASDE-X

  George Bush Intercontinental Airport             IAH          ASDE-X

  Hartsfield Jackson Atlanta International Airport ATL          ASDE-X

  Honolulu International Airport                   HNL          ASDE-X

  John F. Kennedy International Airport            JFK          ASDE-X

  John Wayne --- Orange County Airport             SNA          ASDE-X

  Kansas City International Airport                MCI          ASSC

  LaGuardia Airport                                LGA          ASDE-X

  Lambert St. Louis International Airport          STL          ASDE-X

  Las Vegas McCarran International Airport         LAS          ASDE-X

  Los Angeles International Airport                LAX          ASDE-X

  Louis Armstrong New Orleans International        MSY          ASSC
  Airport                                                       

  Louisville International Airport-Standiford      SDF          ASDE-X
  Field                                                         

  Memphis International Airport                    MEM          ASDE-X

  Miami International Airport                      MIA          ASDE-X

  Minneapolis St. Paul International Airport       MSP          ASDE-X

  Newark International Airport                     EWK          ASDE-X

  Orlando International Airport                    MCO          ASDE-X

  Philadelphia International Airport               PHL          ASDE-X

  Phoenix Sky Harbor International Airport         PHX          ASDE-X

  Pittsburgh International Airport                 PIT          ASSC

  Portland International Airport                   PDX          ASSC[^4]

  Ronald Reagan Washington National Airport        DCA          ASDE-X

  Salt Lake City International Airport             SLC          ASDE-X

  San Diego International Airport                  SAN          ASDE-X

  San Francisco International Airport              SFO          ASSC

  Seattle Tacoma International Airport             SEA          ASDE-X

  Ted Stevens Anchorage International Airport      ANC          ASSC

  Theodore Francis Green State Airport             PVD          ASDE-X

  Washington Dulles International Airport          IAD          ASDE-X

  William P. Hobby Airport                         HOU          ASDE-X
  ------------------------------------------------------------------------------

  : []{#_Toc6995291 .anchor}Table - ASDEXMessage Content Size

Figure 5 below provides a depiction of the interconnections involved
with delivering SMES Data:

![](media/image3.png){width="6.5in" height="5.0742902449693785in"}

[]{#_Ref6487396 .anchor}Figure - SMES: From Source to Message

The SMES publishes four different message types as discussed in sections
3.2-3.5.

## ASDEXMessage

ASDE-X Messages are generated by the ASDE-X/ASSC systems which are
airport surface surveillance systems that use a combination of radar and
sensors to determine the position of aircraft and vehicles (e.g. trucks,
tugs, etc.) on the airport surface. The ASDE-X/ASSC data is used by
airport ground controllers to manage the flow of aircraft at airports
with large volumes of surface traffic and gain visibility of aircraft
which are blocked from physical view by airport buildings and
infrastructure. The "ASDEXMessage" contains the position reports
generated by ASDE-X/ASSC (note: ASSC is a newer version of ASDE-X
currently being deployed at additional airports however, its
functionality is identical to ASDE-X). SMES publishes CAT11 position
reports and two types of CAT10 position reports (MLAT and ADS-B). CAT11
position reports are published once a second per target and contain
fused monosensor track information correlated with flight plan data.
CAT10 data is published as it is received by ASDE-X.

-   Messages are published in \~1 second intervals.

-   Contains one of four different possible information sets

    -   Position Report

    -   ADS-B Report

    -   MLAT Report

    -   System Status

-   Position Reports may be enhanced with flight plan information from
    the SWIM Flight Data Publication Service (SFDPS) to more readily
    enable correlation of flights across multiple SWIM services.

The ASDE-X Message can be used to monitor the position of aircraft on
the airport surface and within the terminal ramp areas. Having
visibility to the position of the aircraft enables SWIM users the
ability for real time tracking and management of aircraft at any
ASDE-X/ASSC equipped airport on a flight by flight basis. This
functionality can be coupled with real-time and post-ops analytics
enabling organizations to track aircraft movements, identify problems,
constraints, surface delays and provide tactical updates to departure
planning based on real time surface information. In addition to
improving efficiency and identifying possible corrective action, the
ASDE-X/ASSC data can be used to support existing safety mechanisms such
as Flight Operational Quality Assurance (FOQA) which uses data from the
aircraft flight data recorder to monitor pilot adherence to standard
operating procedures. Additionally, airlines and airport operations can
use this information to monitor their surface vehicles equipped with
transponders. It is important to note that the accuracy of the position
reporting is greatest in the movement areas. Tracking is provided for
non-movement areas by CAT10 data; however, coverage varies by airport.

![Image result for asde-x display
faa](media/image4.jpeg){width="5.208333333333333in"
height="3.3628707349081366in"}

[]{#_Toc494179817 .anchor}Figure 2 - Example ASDE-X Display[^5]

-   **Airlines --** Can use this data to monitor airport and/or ramp
    congestion on a flight by flight basis (or overall hub view) to
    identify constraints and develop possible solutions. Examples being
    no available gate upon arrival, problems created with gate returns,
    mechanical or passenger delays, DOT 180 or FAR 117 issues, and
    deicing complications. They can also use the data to replay system
    failures, identify why/how event happened and develop corrective
    action. The goal being to use this information to improve block time
    analysis and hopefully decrease same.

-   **Airport Operators** **--** Can us this date to monitor their
    equipment presence on entire airport (runways, taxiways, ramps,
    etc.) as well as having visibility to runway movements and ramp/gate
    congestion. With improved visibility of their resources, they can
    schedule maintenance and runway/ramp treatment operations at optimum
    times. This should maximize use of available manpower and resources.

-   **Air Traffic Control --** A primary benefit to this functionality
    is a common operational picture with airlines so that the airlines
    and the FAA can both operate using the same data. This allows Air
    Traffic Control (ATC) to facilitate earlier coordination for
    call-for-release times for overhead streams, and greater
    harmonization between FAA and AU for managing surface traffic.
    Another capability is to measure runway occupancy times during times
    of reduced braking action or visibility. During these times,
    maintaining the appropriate throughput assumes increased importance.
    For the TRACONS and Air Route Traffic Control Centers (ARTCC) who
    could monitor aircraft movements and airport congestion, sharing a
    common operational picture with Traffic Flow Management (TFM)
    personnel in the Air Traffic Control Tower (ATCT) can facilitate
    improved runway changes, runway use decisions, and Demand-Capacity
    Balancing (DCB) decisions. It is also envisioned that sharing this
    information with Crash-Fire-Rescue (CFR) personnel would be a safety
    enhancement by providing CFR personnel with a graphical presentation
    of where the aircraft in an accident or incident is located.

### ASDEXMessage Processing Considerations

The ASDE-X Message is the "envelope" or "parent" for four different
sub-messages which can be contained in the ASDE-X Message. Listed in the
table below are the four possible types of information that can be
placed in the parent ASDE-X Message (Position Report, ADS-B Report, MLAT
Report, and System Status) as well as a constant value, "airport", that
is included in each ASDE-X Message. The Position Report, ADS-B Report,
MLAT Report, and System Status information blocks are used to inform the
consumer what type of data is included in the rest of the message, while
the airport element informs the consumer which airport the message was
generated from. Each ASDE-X Message will contain an airport element, and
one of the four information types (position report, ADS-B Report, MLAT
Report, or System Status).

![C:\\Users\\swilson\\Documents\\EPICS\\Data Dictionary\\SMES\\SMES
Functional Drawings.png](media/image5.png){width="5.837790901137358in"
height="0.75in"}

[]{#_Toc6995297 .anchor}Figure - ASDEXMessage Sub-Types

An important fact about the ASDE-X Message from SMES is that the
Position Report, ADS-B report, and MLAT report can contain up to 50
individual position reports for multiple aircraft in a single ASDE-X
message. This is done to save bandwidth and increase the efficiency of
the service. By stuffing the Parent ASDEXMessage with as much
information as possible, the service decreases the total number of
messages which must be transported thus reducing overhead. This process
is known as "batching," and is a standard best practice for these types
of services. To inform consumers of the number of position reports
contained in an ASDEXMessage, a "cardinality" value is provided to list
the number of position reports provided in the message. For example, an
ASDEXMessage received with the "airport" data element = to "KMCO" and
the "positionReport" data element = to "15" means that the message
contains 15 of the position report types messages for the Orlando
International Airport. The ASDEXMessage will always represent just one
of the four possible message types. The ASDEXMessage may contain up to
50 positionReport or asdbReport or mlatReport, or a single systemStatus
message within.

  -----------------------------------------------------------------------------
  **Data Element**     **Description**                        **Cardinality**
  -------------------- -------------------------------------- -----------------
  **airport**          International Civil Aviation           1
                       Organization (ICAO) code of the source 
                       airport                                

  **positionReport**   List of CAT11 position reports         0...50

  **adsbReport**       List of CAT10 ADS-B reports            0...50

  **mlatReport**       List of CAT10 MLAT reports             0...50

  **systemStatus**     ASDE-X or ASSC mode and state          0...1
  -----------------------------------------------------------------------------

  : []{#_Toc494179837 .anchor}Table 4 - SMES Message Type Indicator

## SafetyLogicAlertReport

Safety Logic Alert reports are generated by Airport Movement Area Safety
System (AMASS) and are designed to detect and alert on potential
conflicts on the airport surface. The AMASS system receives data from
the ASDE-X or ASSC system which identify and monitor the location of
aircraft and vehicles on the airport surface. The AMASS system uses this
information to plot the trajectory of the targets and provides an alert
if any of the trajectories are predicted to intersect or converge. The
alerts generated by the AMASS system are published by SMES as a
SafetyLogicAlertReport.

-   Provides locations of targets involved in conflict.

-   Classifies the type of conflict (single target, dual target,
    converging taxi, single target taxiway, or intersecting runway), as
    well as the severity (cautionary, warning, or none). A "cleared"
    message will be sent once the situation has been cleared.

-   Available at all airports equipped with either ASDE-X or ASSC (see
    Table 1 for complete list).

The Safety Logic Alert is a powerful safety feature currently in use by
ground controllers to prevent incidents and accidents on the airport
surface. **This message is restricted to internal NAS (FAA only) and is
not available to external SWIM consumers (e.g., airlines, vendor).**

## SafetyLogicHoldBarMessage

Safety Logic Hold Bar messages contain information on the state of
Runway Status Lights at equipped airport. The Runway Status Lights are
used on airport surfaces to visually indicate to pilots when it is safe
to enter a runway area. The data in this message is binary (non-human
readable) format. This identifies if a Runway Status Light is indicating
"Red" (meaning that the runway environment is not safe to enter),
"Green" (meaning that the runway is safe to enter), or "Off" (meaning
that the Runway Status Light is not indicating anything). Runway Status
Light data is available for the following airports:

-   Charlotte Douglas International Airport (CLT)

-   Chicago O\'Hare International Airport (ORD)

-   Detroit Metropolitan Wayne County Airport (DTW)

-   Fort Lauderdale-Hollywood International Airport (FLL)

-   Houston George Bush Intercontinental Airport (IAH)

-   John F. Kennedy International Airport (JFK)

-   LaGuardia Airport (LGA)

-   Los Angeles International Airport (LAX)

-   McCarran International Airport (LAS)

-   Minneapolis-St. Paul International Airport (MSP)

-   Newark Liberty International Airport (EWR)

-   Orlando International Airport (MCO)

-   Phoenix Sky Harbor International Airport (PHX)

-   San Francisco International Airport (SFO)

-   Seattle-Tacoma International Airport (SEA)

-   Washington Dulles International Airport (IAD)

The Safety Logic Hold Bar message is another important safety tool
currently in use for airport surface operations. Users of this data can
develop visualization tools or alerts to monitor the status of the
lights. Coupled with the ASDE-X/ASSC data, a tool can be developed to
monitor the location of aircraft and vehicles in relation to the runway
/ taxiway intersections. Alerts can be generated to indicate if any
aircraft are about to cross any intersections where the Runway Status
Light is indicating "Red", meaning that they are not safe to enter. This
would provide organization with the ability monitor their aircraft /
vehicles and have insight to any possible unsafe conditions which are
occurring real-time. This information could be coupled with existing
FOQA programs. If desired, these alerts could also be displayed in
aircraft flight deck or vehicle cab.

![https://www.faa.gov/air_traffic/technology/rwsl/media/op_concept.jpg](media/image6.jpeg){width="5.567331583552056in"
height="3.6314391951006124in"}

[]{#_Toc494179818 .anchor}Figure 4 - Runway Status Light System

-   **Airline --** Safety alerts could be generated by establishing a
    geofence around intersections equipped with RWSL which are
    indicating red. These alerts can be sent directly to flight deck as
    a backup to immediately advise flight crew in event of error. Could
    also be used for airline/ATC analysis and incident review.

-   **Airport Operators --** Can receive alert of failure as well as be
    able to monitor operational status of RWSL.

-   **Air Traffic Control --**ATC Towers can benefit through the use of
    this data providing access to this information to Front Line Manager
    and TFM positions in the control tower who currently do not receive
    the SafetyLogicHoldBar data. This would improve situational
    awareness and may serve as a lower cost alternative to installing
    additional RWSL displays.

## SurfaceMovementEventMessage

Surface Movement Event messages contain airport surface data the
ASDE-X/ASSC systems. SMES extracts surface movement events from the
ASDE-X/ASSC surveillance data (spot-out, takeoff, landing, and spot-in)
and sends this data to subscribed SWIM service consumers via this
message.

-   Provides status of aircraft location (On-Ramp, On-Surface, and
    Airborne).

-   Provides aircraft events (spot-out, takeoff, landing, and spot-in)

The Surface Movement Event message can used by airlines to obtain
real-time information and accurate status of aircraft on the airport
surface. By supplementing existing data (status/time data from ACARS)
airlines can have finer granularity to where their aircraft actually is
and the exact time they entered / exited specific phases of surface
movement. This information can be used in post-operation analysis to
determine accuracy of predicted times and find inefficiencies in airport
surface movement operations.

-   **Airlines** -- An aircraft may have a mechanical after brake
    release or because of ramp traffic may not be able to push for an
    extended period. An alert could be issued identifying conflict.
    Also, ACARS is an item that can be placed on MEL (minimum equipment
    list) so flights can be operated using backup procedures when ACARS
    is inoperative. This message would be a good substitute. Could also
    be in post operations analysis used to analyze block time accuracy
    and identify an area that exceeds planned (ex. push time to time of
    ATC control entry).

-   **Airport** -- Can benefit from the SurfaceMovementEvent information
    by tracking surface and de-icing pad utilization and performance.
    This information is beneficial in determine strategies for efficient
    use of gate with their airline partners.

-   **Air Traffic Control** -- The SurfaceMovementEvent information
    would assist with system performance monitoring, delay management,
    and event re-creation when an incident occurs. It would also be used
    to re-create noteworthy events such as severe weather situations.
    During off-nominal situations this SurfaceMovementEvent information
    would provide the ability to measure performance and record the data
    for later analysis, and for comparison to other events. This
    information would improve the ability to measure taxi times,
    departure delays, and delays reaching the gate after landing. This
    would help identify bottlenecks and areas where delays frequently
    occur. Possessing statistical data about common delay points will
    facilitate creating mitigations to common delay causes

# SMES Message Types

SMES publishes airport surface data position and status data generated
by the ASDE-X and ASSC systems via the ASDEX Message and Surface
Movement Event Message. SMES publishes airport surface safety data via
the Safety Logic Report Message and the Safety Logic Hold Bar Message.
These messages are distributed to consumers via the NEMS. To inform
users of the type of message they are receiving, a message type data
value is inserted into the header of each message published from the
SMES via the NEMS. Below is a table listing the messages produced by
SMES and the corresponding metadata value.

  ---------------------------------------------------------------------------
  Message Name                  Definition                          MsgType
  ----------------------------- ----------------------------------- ---------
  ASDEXMessage                  Sent upon the receipt of a System   AT, AY,
                                Track message, a Status message, an AD, or ML
                                ADS-B Plot Report, or a MLAT Plot   
                                Report from ASDE-X or ASSC. The     
                                MsgType indicates the type of       
                                message as follows:\                
                                AT -- PositionReport\               
                                AY -- SystemStatus\                 
                                AD - adsbReport\                    
                                ML - mlatReport                     

  SafetyLogicAlertReport        Sent upon the receipt of a Safety   SA
                                Logic Alert Report from ASDEX or    
                                ASSC. Note this message is only     
                                sent to authorized NAS users.       

  SafetyLogicHoldBarMessage     Sent periodically (nominally every  SH
                                60 seconds) and upon change of any  
                                published fields received from      
                                ASDE-X or ASSC.                     

  SurfaceMovementEventMessage   Provides surface movement events    SE
                                derived from ASDE-X or ASSC         
                                position data.                      
  ---------------------------------------------------------------------------

  : []{#_Toc6995293 .anchor}Table . Acronym Listing

## ASDEXMessage

![C:\\Users\\jzimmer\\OneDrive - LS Technologies,
LLC\\Documents\\SWIFT\\Services\\STDDS\\R4
Schema\\externalInterfaces\\smes\\sd\\asdexmessage.files\\element_asdexMsg.jpg](media/image7.jpeg){width="4.17in"
height="5.63in"}

[]{#_Toc6995299 .anchor}Figure . asdexMsg Structure

### positionReport

![](media/image8.png){width="4.12in" height="5.87in"}

[]{#_Ref491338037 .anchor}Figure 7 - Position Report Structure

#### seqNum 

Provides the ASDE-X sequence number for a specific aircraft. The
sequence number is incremented each time a track report is issued for a
single aircraft. This number can be used to detect position reports
which are received out of order. Users can leverage this information to
smooth the depiction of aircraft movement on a display.

#### time

Provides a timestamp indicating when the information was generated.

#### track

An id number assigned to a specific aircraft currently being tracked by
the ASDE-X system. This number is unique to the ASDE-X system.

#### stid

STDDS Surface Track ID is a unique identifier assigned by STDDS.

#### plotCount

This field can have values ranging from 0 to 14.

#### flightId

> Contains three data elements which are used to identify the aircraft
> reference in the position report.

![](media/image9.png){width="3.45in" height="1.73in"}

[]{#_Toc6995301 .anchor}Figure . flightId Structure

##### aircraftid

Aircraft callsign (e.g. DAL123, N467GT, etc.) or "ANON" when blocked for
distribution to unauthorized end-users.

##### mode3Acode

Four octal digit beacon code assigned to a target (e.g. 1200, 4682,
etc.) "ANON" when blocked for distribution to unauthorized end-users.

##### acAddress

Mode S assigned address of the airframe or ground vehicle, expressed in
six hexadecimal digits.

#### flightInfo

> Contains six data elements used to classify the type of aircraft
> referenced in the position report, along with the next destination.

![](media/image10.png){width="3.04in" height="1.73in"}

[]{#_Toc6995302 .anchor}Figure . flightInfo Structure

##### tgtType

Identifies the type of craft position reports are being generated for.
Permissible values: "unknown", "aircraft", "vehicle", or
"unknown_aircraft". Utilized by users to differentiate between aircraft
and airport surface vehicles equipped with transponders.

##### acType

ICAO format with two to four characters being composed of letters and
digits. The first character must be a letter. "ANON" when blocked for
distribution to unauthorized end users. The field is omitted for ground
vehicles. Some examples are 'G4', 'B737' or 'A310'.

##### wake

Wake class of the airframe. Permissible values: \"L\", "H\", \"M\" or
another character received from the flight plan interface.

##### fix

First three characters of the departure fix or the three letter airport
name for arrival flights

##### runway

The predicted departure or arrival airport runway. Examples include,
"9", "36L", "27R", "18C".

#### position

Contains eight data elements which provide information on the 3
dimensional location of the aircraft.

![](media/image11.png){width="3.62in" height="3.87in"}

[]{#_Toc6995303 .anchor}Figure 10 - position Structure

##### x

X component of the Cartesian coordinates. Each unit represents one meter
from the ASDEX/ASSC reference point. This is typically the control
tower.

##### y

Y component of the Cartesian coordinates. Each unit represents one meter
from the ASDEX/ASSC reference point. This is typically the control
tower.

##### extendedX

X component of the Cartesian coordinates. Each unit represents one meter
from the ASDEX/ASSC reference point. This is typically the control
tower. The range is +/-1159548. These are for aircraft over 17NM from
the airport. Negative numbers are west of the control tower, and
positive numbers are east of the control tower.

##### extendedY

Y component of the Cartesian coordinates. Each unit represents one meter
from the ASDEX/ASSC reference point. This is typically the control
tower. The range is +/-1159548. These are for aircraft over 17NM from
the airport. Negative numbers are south of the control tower and
positive numbers are north of the control tower.

##### latitude

Latitude component of the aircraft / vehicle position. This is a double
precision floating point value with a maximum of eight fractional
digits. Positive values are in the northern hemisphere.

##### longitude

Longitude component of the aircraft / vehicle position. This is a double
precision floating point value with a maximum of eight fractional
digits.

##### altitude

Altitude in feet above Mean Sea Level (MSL) of the fused track.

##### flightLevel

Flight level of the aircraft within the range of - 12 to 1500 statute
mile of the airport. Flight levels are used when the aircraft is above
18,000 feet.

#### movement

Contains 6 data elements describing the speed, acceleration, and
direction of the aircraft.

![](media/image12.png){width="3.16in" height="2.07in"}

[]{#_Toc6995304 .anchor}Figure 11 - movement Structure

##### speed

Speed of the aircraft measure in nautical miles per hour (knots). Used
by consumers for display purposes.

##### heading

Heading of the aircraft measure in degrees. Used by consumers for
display purposes.

##### vx

Calculated X component of the aircraft velocity in meter/sec.

##### vy

Calculated X component of the aircraft velocity in meter/sec.

##### ax

X component of the fused track acceleration in meter/sec.

##### ay

Y component of the fused track acceleration in meter/sec.

#### status

The elements contained in the status group provide consumers with
information on the source of the data used for the position report, how
the position information was fused from multiple sources into a single
position report, and other indicators. Consumers can use this
information to determine the quality of the information published. The
elements below which are binary values have the following options: 0 =
False and, 1 = True.

![](media/image13.png){width="6.498681102362204in"
height="7.163494094488189in"}

[]{#_Toc6995305 .anchor}Figure . status Structure

##### mon

Binary value indicating if a track is a monosensor track.

##### gbs

This field indicates if the aircraft is not on the ground by setting it
to be true. This is a pass through from the transponder from the 'weight
on wheels' switch. This may not be valid for all tracks.

##### mrh

Indicates that the reported altitude is either "barometric" from
aircraft sensors or "geometric" from multilat.

##### src

Fused height source. Possible values: \"none\", \"adsb\", \"modec\",
\"multilat\", \"ground\", \"multiple\"

##### sim

Binary value indicating if the track is from live data (0), or data in
engineering playback mode (1).

##### tse

Track Service End Indicator. Binary value indicating if this is the last
message for the track.

##### spi

Binary value indicating if the last report contained Special Purpose
Indicator (SPI). A transponder can be configured to provide this signal
to aid in distinguishing between nondiscretes.

##### x

Binary value indicating the state of the Air Traffic Control Radar
Beacon System (ATCRBS X) bit. If true, the airports secondary radar
system has contact with the aircraft transponder.

##### gm

This field is set to 1 if the Global Positioning System (GPS) position
is more than 100 feet difference from the multilaterated position.

##### nc

Binary value indicating state of multipath noncooperative bit.

##### ls

Binary value indicating state of the lost coast sensor support indicator

##### aq

Binary value indicating state of the coast association question
indicator is set to true.

##### ap

Coast in apron indicator. Binary value indicating the aircraft is in the
non-movement area and is out of radar contact.

##### op

Binary value indicating state of coast in oscillation period indicator
bit.

##### tc

Binary value indicating the state of the manual/automatic tag indicator
bit.

##### da

Binary value indicating duplicate discrete Mode A.

##### lv

Binary value indicating state of the local vehicle association bit.

##### st

Binary value indicating the state of the suspended track indicator bit.

##### rt

Binary value indicating the state of the reference transmitter track
bit. Display track only if in maintenance mode.

##### ss

Binary value indicating the state of the SMR source fused bit.

##### ms

Binary value indicating state of Mode S source fused bit.

##### as

Binary value indicating state of the ADS-B source fused bit.

##### a9s

Binary value indicating state of the ASR-9 source fused bit.

##### at

Binary value indicating state of the Air Traffic Control Radar Beacon
System (ATCRBS) source fused bit.

##### si

Binary value indicating if the safety logic processing has been
inhibited on the track bit

##### m3c

Binary value indicating a change in the mode 3/A code.

##### di

Permissible values: 0: do not display 1: display

##### s1

Binary value indicating if the Surveillance and Broadcast Service (SBS)
1090-ES ADS-B source was fused for this track.

##### su

Binary value indicating if the SBS Universal Access Transceiver (UAT)
ADS-B source was fused for this track.

##### af

Alert Filter Indicator, indicating if any filters have been set in the
software to suppress collision alerts for specific portions of the
airport. Permissible values: 'unfiltered', 'filtered' or 'highlight'.

##### gnd

Ground Indicator. 0 = Unknown, 1 = Track on the Ground (Below 100 ft), 2
= Arrival Track (Above 100 ft).

##### ua

Binary value indicating if the UAT source was fused for this track.

##### df

Binary value indicating duplicate flight id.

##### quality

Probability that the predicted track position agreed with the best of
the raw plots. This field is a percentage and can have values ranging
from 0 to 100.

##### aqUat

Address Qualifier from CAT033 report (if SU bit is set) Possible values:
**adsbicao**, **adsbsa**, **tisbicao**, **tisbfti**, **vehicle**, or
**beacon**.

##### lvUat

Local Vehicle UAT link version. Permissible range: 0-7.

##### aq1090

Address Qualifier from CAT033 report (if S1 bit is set). Possible
values: **adsbicao**, **adsbsa**, **tisbicao**, **tisbfti**,
**vehicle**, or **beacon**.

##### lv1090

Local Vehicle 1090LV link version. Permissible range: 0-7.

##### aa

Binary value indicating if there is an SBS target associated with track.

##### av

SBS ADS-B Lat/Lon validation status based on comparison with other
sensor data. Possible values: **unknown**, **invalid**, **reserved**, or
**valid**.

##### sil

Source Integrity Level indicates the probability of the reported
horizontal position exceeding the containment radius defined by the
Navigation Integrity Category (NIC) on a per sample or per hour basis,
as defined
in [TSO](https://www.law.cornell.edu/definitions/index.php?width=840&height=800&iframe=true&def_id=fe0d7d61e68a6b3526d078d28d4d20df&term_occur=7&term_src=Title:14:Chapter:I:Subchapter:F:Part:91:Subpart:C:91.227)-C166b
and [TSO](https://www.law.cornell.edu/definitions/index.php?width=840&height=800&iframe=true&def_id=fe0d7d61e68a6b3526d078d28d4d20df&term_occur=8&term_src=Title:14:Chapter:I:Subchapter:F:Part:91:Subpart:C:91.227)-C154c.
Possible values: 0 = Unknown, 1 = \< 10^-3^, 2 = \< 10^-5^, 3 = \<
10^-7^.

##### nic

Navigation Integrity Category specifies an integrity containment radius
around an aircraft\'s reported position, as defined in TSO-C166b and
TSO-C154c. Possible values: 0 = ≥ 20 NM or Unknown, 1 = \< 20 NM, 2 = \<
8 NM, 3 = \< 4 NM, 4 = \< 2 NM, 5 = \< 1 NM, 6 = \< 0.6 NM, 7 = \< 0.2
NM, 8 = \< 0.1 NM, 9 = \< 75 m, 10 = \< 25 m, 11 = \< 7.5 m

##### NACp

Navigation Accuracy Category specifies the accuracy of a reported
aircraft\'s position, as defined in TSO-C166b and TSO-C154c.for Position
Possible values: 0 = ≥ 10 NM, 1 = \< 10 NM, 2 = \< 4 NM, 3 = \< 2 NM, 4
= \< 1 NM, 5 = \< 0.5 NM, 6 = \< 0.3 NM, 7 = \< 0.1 NM, 8 = \< 0.05 NM,
9 = \< 30 m, 10 = \< 10 m, 11 = \< 3 m. NM = Nautical Miles, and m =
meters

##### vs

Binary value indicating the source of the data used to compute the
vertical rate. Permissible values: "geometric" or "barometric".

##### ud

Binary value indicating the vertical rate direction. Permissible values:
"up" or "down".

##### vertRate

Vertical rate of the current track that indicates if the aircraft is
climbing or descending. Permissible values: "unavailable", 0 = 0, 1 = 32
feet/minute, 2 = 64 feet/minute, 1021 = 32672 feet/minute, 1022 = \>
32688 feet/minute. The "ud" binary value above indicates is the rate is
up or down.

##### uncorrBaroAlt

Most recent barometric pressure altitude reported by the aircraft;
coasted for a maximum time of 5 seconds. Permissible values:
"unavailable", -8191 = -204775 feet, - 8190 = -204750 feet, -2 = -50
feet, -1 = - 25 feet, 0 = 0 feet, 1 = 25 feet, 2 = 50 feet, 8190 =
204750 feet, 8191 = \>= 204775 feet.

#### slc

![](media/image14.png){width="3.2in" height="1.07in"}

[]{#_Toc6995306 .anchor}Figure - slc Structure

##### suspNum

Valid range of 1 to 26.

##### localAvNum

Local aircraft vehicle list number has the range of 101 to 276.

##### coastNum

Coasted track number has the range of 300 to 999.

#### manual

Contains information manually entered by ground controllers.

![](media/image15.png){width="3.34in" height="2.76in"}

[]{#_Toc6995307 .anchor}Figure 14 - manual Structure

##### callNum

Aircraft callsign obtained via manual tag. "ANON" when blocked for
distribution to unauthorized end-users.

##### mode3ACode

Four octal digit beacon code assigned to a target obtained via manual
tag. "ANON" when blocked for distribution to unauthorized end users

##### acType

Aircraft type obtained via manual tag. "ANON" when blocked for
distribution to unauthorized end-users.

##### category

Wake class of the airframe obtained via manual tag. The value of this
field can be any alphabetic character or "none". Possible values: "B" =
Heavy with RNAV, "F" = B757, "H" = Heavy, "J" = A380, "L" = B757 with
RNAV, "M" = A380 with RNAV, "R" = RNAV, or "X" = High Performance
Turbo-prop.

##### fix

First three characters of the departure fix or the three letter airport
name for arrival flights obtained via manual tag.

##### scratchpad1

First line of free form text obtained via manual tag. Up to seven
characters long. This field has a value of "none" when input data is not
available.

##### scratchpad2

Second line of free form text obtained via manual tag. Up to seven
characters long. This field has a value of "none" when input data is not
available.

#### targetExtent

The ASDE-X/ASSC program requires the System Track Report to contain
additional information that is not currently supported by the ASTERIX
Category 11 format. This additional information is appended to the
standard ASTERIX message as an extension to the standard.

![](media/image16.png){width="3.16in" height="1.72in"}

[]{#_Toc6995308 .anchor}Figure 15 - targetExtentType Structure

##### estimate

This field can have values ranging from 0 to 127 meters and corresponds
to the Extent field in the ASDE-X and ASSC. Note: If the data originates
from ASDE-X, this field will be set to 0 for targets which never had SMR
support, and to previous value for targets which lose SMR support.

##### startRange

SMR target extent start range. This field can have values from 0 to
65535 meters.

##### endRange

SMR target extent end range. This field can have values from 0 to 65535
meters.

##### startAzimuth

SMR target extent start azimuth. This field can have values from 0 to
360 degrees.

##### endAzimuth

SMR target extent end azimuth. This field can have values from 0 to 360
degrees.

### adsbReport

![](media/image17.png){width="3.73in" height="1.75in"}

[]{#_Ref491413886 .anchor}Figure 16 - adsbReport Structure

#### report

The "report" section of the adsbReport grouping contains all data
regarding the position, speed, altitude, and identification for a
specific aircraft or vehicle.

![](media/image18.png){width="3.78in" height="1.76in"}

[]{#_Toc491259659 .anchor}Figure 17 - report Structure

##### basicReport

![](media/image19.png){width="5.52in" height="2.81in"}

[]{#_Toc6995311 .anchor}Figure . basicReport Structure

###### time

Time of the track update. Format: yyyy-mm-ddThh:mm:ss.sssZ

###### track

The ADSB track number assigned to this aircraft / vehicle. This field is
in the range of 0 to 4095. It is assigned such that oldest released
track numbers are reused first.

###### position

Aircraft/vehicle position.

####### x

X component of the Cartesian coordinates. Each unit represents one meter
from the system center. System center is usually the airport air traffic
control tower.

####### y

Y component of the Cartesian coordinates. Each unit represents one meter
from the system center. System center is usually the airport air traffic
control tower.

####### lat

Latitude component of the aircraft / vehicle position. This is a double
precision floating point value with a maximum of eight fractional
digits. Positive values are in the northern hemisphere.

####### long

Longitude component of the aircraft / vehicle position. This is a double
precision floating point value with a maximum of eight fractional
digits.

###### Velocity

Aircraft velocity.

####### x

Calculated X component of the aircraft velocity in meter/sec.

####### y

Calculated Y component of the aircraft velocity in meter/sec.

##### mode3Acode

![](media/image20.png){width="3.48in" height="0.7in"}

[]{#_Toc6995312 .anchor}Figure . mode3ACode Structure

###### code

Four octal digit beacon code assigned to a target. "ANON" when blocked
for distribution to unauthorized end-users.

###### g

Binary value indicating a garbled Mode 3/A code. A garbled code in the
report does not match the corresponding Mode 3/A code in the track.
Possible values are: 0 = False and, 1 = True.

##### acAddress

Mode S assigned address of the airframe or ground vehicle, expressed in
six hexadecimal digits.

##### level

Flight level of the aircraft in hundreds of feet.

##### height

Flight altitude in feet.

#### descriptor

The "descriptor" section of the adsbReport provides information on the
quality of the data received.

![](media/image21.png){width="3.54in" height="3.85in"}

[]{#_Toc6995313 .anchor}Figure . descriptor Structure

##### crt

Binary value indicating if replies are corrupted. Possible values are: 0
= False and, 1 = True.

##### dcr

Binary value indicating ADS-B differential correction. Possible values
are: 0 = False and, 1 = True.

##### rab

Binary value indicating ADS-B differential correction. Possible values
are: 0 = False and, 1 = True.

##### spi

Binary value indicating if the plot contains Special Purpose Indicator
(SPI). A transponder can be configured to provide this signal to aid in
distinguishing between non-discretes. Possible values are: 0 = False
and, 1 = True.

##### gbs

Binary value indicating if ground bit is set. Possible values are: 0 =
False and, 1 = True.

##### tot

Type of vehicle. Permissible values: "undetermined", "aircraft",
"surface".

#### status

The "status" section of the adsbReport provides information on whether
or not the track is a new measurement or a duplicate. The Track Status
CNF, and DOU bits are set to correspond to the RDP track levels (new,
stationary, low confidence, high confidence) as follows:

-   If CNF=1, the track is new.

-   If CNF=0 the track is stationary.

-   If CNF=0, and DOU=1, the track is low confidence.

-   If CNF=0, and DOU=0, the track is high confidence.

![](media/image22.png){width="3.53in" height="1.05in"}

[]{#_Toc6995314 .anchor}Figure . status Structure

##### cnf

Track status. Permissible values: "new", and "confirmed".

##### dou

Binary value indicating low confidence (1) or high confidence (0).

#### extent

The "extent" section of the adsbReport provides information on the
source of the adsbReport data.

![](media/image23.png){width="3.5in" height="2.06in"}

[]{#_Toc6995315 .anchor}Figure . extent Structure

##### gm

If this field is set to 1 if the GPS position is more than 100 feet from
the multilaterated position. If this field is set to 0 if the GPS
position is less than 100 feet from the multilaterated position.

##### s1

Binary value indicating if the plot is SBS 1090-ES ADS-B.

##### su

Binary value indicating if the plot is UAT ADS-B.

### mlatReport

See section 4.1.2 for identical structure.

### smrReport

![](media/image24.png){width="3.69in" height="1.73in"}

[]{#_Toc6995316 .anchor}Figure . smrReport Structure

#### report

![](media/image25.png){width="5.54in" height="2.86in"}

[]{#_Toc6995317 .anchor}Figure . report Structure

##### time

The time of the track update.

##### track

The track number assigned to this aircraft / vehicle.

##### position

X/Y and Lat/Lon position values of the track.

###### x

X component of the Cartesian coordinates. Each unit represents one meter
from the system center. System center is usually the airport air traffic
control tower.

###### y

Y component of the Cartesian coordinates. Each unit represents one meter
from the system center. System center is usually the airport air traffic
control tower.

###### lat

Latitude component of the aircraft / vehicle position. This is a double
precision floating point value with a maximum of eight fractional
digits. Positive values are in the northern hemisphere.

###### lon

Longitude component of the aircraft / vehicle position. This is a double
precision floating point value with a maximum of eight fractional
digits.

##### velocity

Calculated X and Y components of the aircraft velocity.

###### X

Calculated X component of the aircraft velocity in meter/sec.

###### Y

Calculated X component of the aircraft velocity in meter/sec.

#### rdpSource

Indicator that the source data is from the Radar Data Processor (RDP).
The format is either **0** -- source not RDP or **1** -- source RDP.

#### extent

The "extent" section of the smrReport provides information on the source
of the smrReport data.

![](media/image26.png){width="3.47in" height="2.78in"}

[]{#_Toc6995318 .anchor}Figure . extent Structure

##### startRange

SMR target extent start range. This field can have values from 0 to
65535 meters.

##### endRange

SMR target extent end range. This field can have values from 0 to 65535
meters.

##### startAzimuth

SMR target extent start azimuth. This field can have values from 0 to
360 degrees.

##### endAzimuth

SMR target extent end azimuth. This field can have values from 0 to 360
degrees.

#### Status

Track status information.

![](media/image27.png){width="3.47in" height="3.47in"}

[]{#_Toc6995319 .anchor}Figure . status Structure

##### Cnf

New track or confirmed

##### tre

Default=0; Drop=1

##### mah

Default=0; Maneuver=1

##### tom

\"0\", \"1\", \"2\" or \"3\"

##### dou

HighConfidence=0; LowConfidence=1

##### gho

Default = 0, multipath=1

### genericFlightInfo

![](media/image28.png){width="3.65in" height="1.39in"}

[]{#_Toc6995320 .anchor}Figure . genericFlightInfo Structure

#### interface

Source interface of the flight plan. The format is either **artsiiia**,
**arsiiie**, **gfp**, **microearts**, or **stars**.

#### Type

Identifies the flight regime. The format is **A** (arrival), **P**
(departure), **E** (en route -- STARS), or a numeric indicator
(**IIIE**/**GFP**)

#### flightId

Aggregation of Flight Identification Information

##### aircraftId

Aircraft call sign. The format is a 1-6 character alphanumeric string.

##### mode3ACode

Four octal digit beacon code assigned to a target obtained via manual
tag. "ANON" when blocked for distribution to unauthorized end users

#### flightInfo

Aggregation of Flight Information

##### acType

Aircraft type obtained via manual tag. "ANON" when blocked for
distribution to unauthorized end-users.

##### category

Wake class of the airframe obtained via manual tag. The value of this
field can be any alphabetic character or "none". Possible values: **B**
= Heavy with RNAV, **F** = B757, **H** = Heavy, **J** = A380, **L** =
B757 with RNAV, **M** = A380 with RNAV, **R** = RNAV, or **X** = High
Performance Turbo-prop.

##### flightRules

Indicator of instrument flight rules or visual flight rules aircraft
operations.

##### entryFix

The first fix in the flight information.

##### exitFix

The last fix in the flight information.

##### runway

Assigned runway. The format is 3 alphanumeric characters

##### airport

Origin or destination airport. The format is 3-4 alphanumeric characters

##### scratchpad1

First line of free form text obtained via manual tag. Up to seven
characters long. This field has a value of "none" when input data is not
available.

##### scratchpad2

Second line of free form text obtained via manual tag. Up to seven
characters long. This field has a value of "none" when input data is not
available.

### systemStatus 

This information is used to inform the consumers if the SMES system is
operational or having maintenance performed.

![](media/image29.png){width="3.03in" height="0.68in"}

[]{#_Toc6995321 .anchor}Figure . systemStatus Structure

#### mode

Mode of input ASDE-X/ASSC link. Permissible values: "operational" or
"maintenance".

#### state

System state of the input ASDE-X/ASSC link. Permissible values:
"startup", "online", "degraded", "shutdown", or "offline".

## SafetyLogicAlertReportMessage

The SafetyLogicReportMessage contains information intended to alert a
user about a potential collision between two targets. The information
includes severity of the alert, location of both targets, and a flag for
triggering audio alerting. **Note this message is restricted to internal
NAS users only (e.g., ATC, FAA systems) and external NAS users (e.g.,
airlines, vendors) may not receive it.**

![](media/image30.png){width="2.8552351268591427in"
height="8.583333333333334in"}

[]{#_Ref491431059 .anchor}Figure 29 - SafetyLogicAlertReportMessage
Structure

### airport

ICAO code of the source airport.

### alert

Unique alphanumeric identifier assigned to alert.

### audio

Audio alert string

### curSeverity

Current Alert Severity as a result of Check Alert before hysteresis.
Permissible values: **cautionary**, **warning**, or **none**.

### cycleNum

AXSL check alerts cycle number

### encounter

Type of encounter sensor generating alert. Permissible values: **single
target**, **dual** **target**, **converging** **taxi**, **intersecting
runway**.

### repSeverity

Reported Alert Severity after alert hysteresis. Permissible values:
**cautionary**, **warning**, or **none**.

### situation

Alert situation ID. This field can have values of 0 to 65535.

### separation

Separation type. Permissible values: **CSEP** or **PSEP**.

### text

Text alert string.

### time

Time of the alert. Format: yyyy-mm-ddThh:mm:ss.sssZ

### type

Alert type. Permissible values: "ground" (on airport surface or below
100 feet AGL) or "arrival" (airborne -- above 100 feet AGL).

### version

Version of report.

### cleared

Flag indicating if the alert situation has cleared. Will be sent only in
the last alert report sent for an alert situation.

### location

#### location1

The numeric ID from eXtensible Markup Language (XML) adaptation for the
first alert location. Note: STDDS will publish this field only if the
input data from ASDE-X/ASSC is greater than 0.

#### location2

The numeric ID from XML adaptation for the first alert location. Note:
STDDS will publish this field only if the input data from ASDE-X/ASSC is
greater than 0.

#### location

The alphanumeric name of the alert location. When two alert locations
are available both names will be included separated by a space

### track1

#### id

The numeric ID from XML adaptation for the first alert location. Note:
STDDS will publish this field only if the input data from ASDE-X/ASSC is
greater than 0.

#### callsign

Aircraft call sign Note: STDDS will publish this field only if the TP
and the CV (Callsign valid) field in the input ASDE-X/ASSC data are set
to 1: Valid.

#### mode3a

Mode 3/A code of track. This field can have values of 0 to 7777 (Octal).
Note: STDDS will publish this field only if the TP (Track present) and
the 3V (Mode 3/A valid) field in the input ASDE-X/ASSC data are set to
1: Valid.

#### acAddress

Mode S ID of track. This field can have values of 1 to FFFFFF (Hex).
Note: STDDS will publish this field only if the TP and the SV (Mode S
valid) field in the input ASDE-X/ASSC data are set to 1: Valid.

#### surface

Runway/taxiway on which the track resides. Note: STDDS will publish this
field only if the TP field in the input ASDE-X/ASSC data is set.

#### latitude

Track latitude. This field can have values of -90 to 90 degrees. Note:
STDDS will publish this field only if the TP field in the input
ASDE-X/ASSC data is set to 1: True.

#### longitude

Track longitude. This field can have values of - 180 to 180 degrees.
Note: STDDS will publish this field if the TP field in the input
ASDE-X/ASSC data is set to 1: True.

### track2

#### id

The numeric ID from XML adaptation for the first alert location. Note:
STDDS will publish this field only if the input data from ASDE-X/ASSC is
greater than 0.

#### callsign

Aircraft call sign Note: STDDS will publish this field only if the TP
and the CV (Callsign valid) field in the input ASDE-X/ASSC data are set
to 1: Valid.

#### mode3a

Mode 3/A code of track. This field can have values of 0 to 7777 (Octal).
Note: STDDS will publish this field only if the TP (Track present) and
the 3V (Mode 3/A valid) field in the input ASDE-X/ASSC data are set to
1: Valid.

#### acAddress

Mode S ID of track. This field can have values of 1 to FFFFFF (Hex).
Note: STDDS will publish this field only if the TP and the SV (Mode S
valid) field in the input ASDE-X/ASSC data are set to 1: Valid.

#### surface

Runway/taxiway on which the track resides. Note: STDDS will publish this
field only if the TP field in the input ASDE-X/ASSC data is set.

#### latitude

Track latitude. This field can have values of -90 to 90 degrees. Note:
STDDS will publish this field only if the TP field in the input
ASDE-X/ASSC data is set to 1: True.

#### longitude

Track longitude. This field can have values of - 180 to 180 degrees.
Note: STDDS will publish this field if the TP field in the input
ASDE-X/ASSC data is set to 1: True.

## SafetyLogicHoldBarMessage

Provides consumers with access to airport surface sensor data which
indicates the configuration of the RWSL located on the surface of an
airport.

![](media/image31.png){width="3.94in" height="2.01in"}

[]{#_Toc494179834 .anchor}Figure 30 - SafetlyLogicHoldBarMessage
Structure

### airport

ICAO code of the source airport.

### control

Binary value to indicate whether hold bars are enabled or disabled.

### status

Bit map status of each hold bar (1...256) indicating visibility (0: Not
Visible, 1: Visible). The bits are assigned sequentially, starting at
bit 0 in word 8 and working backwards (i.e. Hold Bar 256 is represented
by bit 31 in word 1). This field will not be published if the hold bars
are disabled.

## SurfaceMovementEventMessage

The SurfaceMovementEventMessage provides status of aircraft location
(On-Ramp, On-Surface, and Air-Bourne) and aircraft events (Landing,
Takeoff, Entering Movement Area, Exiting Movement Area).

![](media/image32.png){width="3.707244094488189in"
height="7.338050087489064in"}

[]{#_Ref491432726 .anchor}Figure 31 - SurfaceMovementEventMessage
Structure

### callsign

Aircraft callsign or "ANON" when blocked for distribution to
unauthorized end-users.

### track

The track number assigned to the aircraft / vehicle. It is defined as
xs:short. This field is in the range of 0 to 4095.

### stid

Unique identifier assigned by STDDS. This field has up to 8 characters.

### mode3Acode

Four octal digit beacon code assigned to a target. "ANON" when blocked
for distribution to unauthorized end-users

### acAddress

Mode S assigned address of the airframe or ground vehicle, expressed in
six hexadecimal digits.

### time

UTC date and time of generated event data.

### event

Spot-in, spot-out, on, off.

### position

![](media/image33.png){width="4.03in" height="1.37in"}

[]{#_Toc6995325 .anchor}Figure . position Structure

#### latitude

Track latitude. This field can have values of -90 to 90 degrees. Note:
STDDS will publish this field only if the TP field in the input
ASDE-X/ASSC data is set to 1: True.

#### longitude

Track longitude. This field can have values of - 180 to 180 degrees.
Note: STDDS will publish this field if the TP field in the input
ASDE-X/ASSC data is set to 1: True.

### altitude

Altitude in feet.

### status

Movement area (on surface), Non-movement area (on ramp), Airborne,
Undefined (status is not yet determined).

### events

List of surface movement events for the aircraft. The list will contain
an event type and the UTC, derived by automation.

![](media/image34.png){width="5.65in" height="1.21in"}

[]{#_Toc6995326 .anchor}Figure . events Structure

#### eventRecord

##### event

The type of event. The format is either **off**, **on**, **spotin**, or
**spotout**.

##### at

UTC date and time of generated event data.

### enhancedData

Collection of correlated fields derived from SFDPS flight plan data
including En Route Automation Modernization (ERAM) Globally Unique
Flight Identifier (GUFI), SFDPS GUFI, Departure Airport, and Destination
Airport. The Boolean attribute "**s**" can be set to indicate that the
enhanced data is potentially stale due to a disruption in the flight
plan data flow.

![](media/image35.png){width="3.23in" height="2.1in"}

[]{#_Toc6995327 .anchor}Figure . enhancedData Structure

#### eramGufi

ERAM GUFI derived from SFDPS flight plan data. The format is an
alphanumeric string.

#### sfdpsGufi

SFDPS GUFI derived from SFDPS flight plan data. The format is an
alphanumeric string.

#### departureAirport

Departure ICAO airport identification (ID) derived from SFDPS flight
plan data. The format is an alphanumeric string.

#### destinationAirport

Destination ICAO airport ID derived from SFDPS flight plan data. The
format is an alphanumeric string.

#### aircraftType

This field is not published in SMES.

#### beaconCode

This field is not published in SMES.

# Appendix A: Acronym Listing {#appendix-a-acronym-listing .list-paragraph}

  -----------------------------------------------------------------------
  **Acronym**      **Definition**
  ---------------- ------------------------------------------------------
  ADS-B            Automatic Dependent Surveillance-Broadcast

  AMASS            Airport Movement Area Safety System

  APDS             Airport Data Service

  ARTCC            Air Route Traffic Control Center

  ASDE-X           Airport Surface Detection Equipment Model X

  ASR              Automatic Surveillance Radar

  ASSC             Airport Surface Surveillance Capability

  ATC              Air Traffic Control

  ATCRBS           Air Traffic Control Radar Beacon System

  CAT              Category

  CFR              Crash-Fire-Rescue

  D-ATIS           Digital Automatic Terminal Information System

  DCA              Ronald Regan Washington National Airport

  DCB              Demand-Capacity Balancing

  DOT              Department of Transportation

  ERAM             En Route Automation Modernization

  FAA              Federal Aviation Administration

  FAR              Federal Aviation Regulation

  FIXM             Flight Information Exchange Model

  FOQA             Flight Operational Quality Assurance

  GeNUS            General NAS User Services

  GPS              Global Positioning System

  GUFI             Globally Unique Flight Identifier

  ICAO             International Civil Aviation Organization

  ID               Identification

  IMC              Instrument Meteorological Conditions

  ISMC             Infrastructure System Monitor and Control

  JMSDD            Java Messaging Service Description Document

  MLAT             Multilaterated

  NAC              Navigation Accuracy Category

  NAS              National Airspace System

  NEMS             National Airspace System Enterprise Messaging Service

  NIC              Navigation Integrity Category

  RDP              Radar Data Processor

  RVR              Runway Visual Range

  RWSL             Runway Status Light

  SFDPS            SWIM Flight Data Publication Service

  SMES             Surface Movement Event Service

  SMR              Surface Movement Radar

  SOA              Service Oriented Architecture

  SPI              Special Purpose Indicator

  STARS            Standard Terminal Automation Replacement System

  STDDS            SWIM Terminal Data Distribution System

  SV               Mode S Valid

  SWIFT            SWIM Industry-FAA Team

  SWIM             System Wide Information Management

  TAIS             Terminal Automation Information Service

  TDES             Tower Departure Event Service

  TDLS             Tower Data Link Service

  TFM              Traffic Flow Management

  TP               Track Present

  TRACON           Terminal Radar Approach Control

  UAT              Universal Access Transceiver

  WSRD             Web Service Requirements Document

  XML              eXtensible Markup Language
  -----------------------------------------------------------------------

[^1]: This document presents information regarding STDDS SMES release
    4.0

[^2]: Requires access to FAA NAS Service Registry and Repository (NSRR),
    new accounts can be requested at https://nsrr.faa.gov/user/register

[^3]: Planned

[^4]: Planned

[^5]: ASDE-X provides a display to ATC, however STDDS-SMES only provides
    position reports, subscribers must generate any desired display/user
    interface.
