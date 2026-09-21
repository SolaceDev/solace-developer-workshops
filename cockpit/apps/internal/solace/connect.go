package solace

import (
	"os"

	"solace.dev/go/messaging"
	"solace.dev/go/messaging/pkg/solace"
	"solace.dev/go/messaging/pkg/solace/config"
)

// Connect builds a messaging service for one username and connects it.
//
// On failure it explains what happened and exits non-zero rather than
// returning: every caller in this workshop would do the same thing with the
// error, and a scenario app that cannot reach the broker has nothing else to
// do. Exiting here keeps each app's main function about the pattern it teaches
// instead of about error plumbing.
func Connect(role, username string) solace.MessagingService {
	cfg := FromEnv(username)

	svc, err := messaging.NewMessagingServiceBuilder().
		FromConfigurationProvider(config.ServicePropertyMap{
			config.TransportLayerPropertyHost:                cfg.Host,
			config.ServicePropertyVPNName:                    cfg.VPN,
			config.AuthenticationPropertySchemeBasicUserName: cfg.Username,
			config.AuthenticationPropertySchemeBasicPassword: cfg.Password,
			// Fail fast rather than retrying behind the scenes. If a username
			// is wrong or an ACL denies the connection, an attendee should see
			// it in the log pane straight away instead of watching a silent
			// retry loop and wondering why nothing arrives.
			//
			// Three separate properties, because they cover three different
			// moments: ConnectionRetries and ConnectionRetriesPerHost bound
			// the initial connect, and ReconnectionAttempts bounds recovery
			// after a connection that had previously succeeded. Setting only
			// the last one leaves a bad password retrying for minutes.
			config.TransportLayerPropertyConnectionRetries:        0,
			config.TransportLayerPropertyConnectionRetriesPerHost: 0,
			config.TransportLayerPropertyReconnectionAttempts:     0,
		}).Build()
	if err != nil {
		Errf(role, "could not build the messaging service: %s", err)
		os.Exit(1)
	}

	if err := svc.Connect(); err != nil {
		Errf(role, "could not connect to %s as %s:", cfg.Host, username)
		Errf(role, "  %s", err)
		if why := Explain(err, username, cfg.VPN); why != "" {
			Errf(role, "")
			Errf(role, "%s", why)
		}
		os.Exit(1)
	}

	Logf(role, "connected as %s to %s (vpn %s)", username, cfg.Host, cfg.VPN)
	return svc
}
