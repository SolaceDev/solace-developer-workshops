package solace

import (
	"os"
	"os/signal"
	"syscall"
)

// WaitForStop blocks until the process is asked to stop.
//
// The cockpit terminates a long-running action by signalling the process
// group, which delivers SIGTERM rather than SIGINT. Catching only os.Interrupt
// (as the Solace Go samples do) would mean the broker sees a dropped TCP
// session instead of a clean disconnect, so both are handled here.
func WaitForStop() {
	ch := make(chan os.Signal, 1)
	signal.Notify(ch, os.Interrupt, syscall.SIGTERM)
	<-ch
}
