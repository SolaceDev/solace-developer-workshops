package solace

import (
	"fmt"
	"os"
)

// Env reads an environment variable, treating empty as absent so an exported
// but blank variable falls back rather than producing an empty username.
func Env(name, fallback string) string {
	if v := os.Getenv(name); v != "" {
		return v
	}
	return fallback
}

// Config is everything needed to reach the workshop broker as one username.
//
// The cockpit exports these to every process it starts, so nothing here is
// hardcoded to a particular broker. The defaults match setup_broker.sh, which
// means an app also runs standalone from a terminal for anyone who wants to
// poke at it outside the cockpit.
type Config struct {
	Host     string
	VPN      string
	Username string
	Password string
}

// FromEnv builds a Config for the given username.
//
// Note SOLACE_SMF_PORT, not SOLACE_SEMP_PORT: 55555 carries messages and 8080
// is the management interface. Conflating the two is the single most common
// first-day mistake, so the distinction is spelled out here and in the guides.
func FromEnv(username string) Config {
	return Config{
		Host:     fmt.Sprintf("tcp://%s:%s", Env("SOLACE_HOST", "localhost"), Env("SOLACE_SMF_PORT", "55555")),
		VPN:      Env("SOLACE_MSG_VPN", "default"),
		Username: username,
		Password: Env("SOLACE_CLIENT_PASSWORD", "solace-workshop"),
	}
}
