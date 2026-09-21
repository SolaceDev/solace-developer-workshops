package solace

import (
	"fmt"
	"os"
	"time"
)

// Clock is the timestamp format used across every workshop app, chosen to be
// short enough that a log line still fits a narrow cockpit pane.
const Clock = "15:04:05"

// Logf prints a role-prefixed line to stdout. Every app in the workshop logs
// the same shape, so an attendee reading two panes side by side can line up
// what happened in each without decoding two different formats.
func Logf(role, format string, args ...any) {
	fmt.Printf("[%s] %s\n", role, fmt.Sprintf(format, args...))
}

// Errf is Logf for stderr.
func Errf(role, format string, args ...any) {
	fmt.Fprintf(os.Stderr, "[%s] %s\n", role, fmt.Sprintf(format, args...))
}

// Eventf prints the numbered, timestamped header that precedes a received
// message, then its topic and payload. Kept in one place because the pub-sub
// scenario's whole point is comparing panes, which only works if every
// subscriber renders a message identically.
func Eventf(role string, n int, topic, payload string) {
	fmt.Printf("\n[%s] #%d  %s\n", role, n, time.Now().Format(Clock))
	fmt.Printf("[%s] topic   %s\n", role, topic)
	fmt.Printf("[%s] payload %s\n", role, payload)
}
