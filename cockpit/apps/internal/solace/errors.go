package solace

import (
	"errors"

	"solace.dev/go/messaging/pkg/solace"
	"solace.dev/go/messaging/pkg/solace/subcode"
)

// SubCodeOf returns the broker subcode carried by an error, and whether there
// was one. Errors from this API wrap a *solace.NativeError; anything else (a
// context deadline, a nil pointer in our own code) has no subcode.
func SubCodeOf(err error) (subcode.Code, bool) {
	var native *solace.NativeError
	if errors.As(err, &native) {
		return native.SubCode(), true
	}
	return 0, false
}

// Explain turns a broker error into a sentence an attendee can act on.
//
// Every one of these is an outcome a workshop scenario deliberately provokes:
// pointing a subscriber at a topic its ACL forbids, starting a consumer before
// the queue exists, mistyping a username. A raw error string plus a stack
// trace would tell them something broke without telling them what to change,
// so each known subcode gets a plain explanation and the caller decides
// whether that is fatal.
//
// Returns the empty string when there is nothing more useful to say than the
// error itself, which is the caller's cue to print the raw error.
func Explain(err error, username, subject string) string {
	code, ok := SubCodeOf(err)
	if !ok {
		return ""
	}
	switch code {
	case subcode.SubscriptionAclDenied:
		return username + " connects fine (its client profile allows that) but its ACL profile does not permit subscribing to " + subject + "."
	case subcode.PublishAclDenied:
		return username + " is not permitted to publish to " + subject + ". Its ACL profile allows a different topic space."
	case subcode.ClientAclDenied:
		return username + " was refused at login by an ACL rule. Check the client username is enabled and its ACL profile allows connections."
	case subcode.LoginFailure:
		return "The broker rejected the username or password for " + username + ". Check the client username exists and SOLACE_CLIENT_PASSWORD matches the terraform value."
	case subcode.PermissionNotAllowed:
		return username + " is not permitted that operation on " + subject + ". Its client profile most likely disallows guaranteed messaging or endpoint creation."
	case subcode.UnknownQueueName:
		return "Queue " + subject + " does not exist on the broker. Run this scenario's Apply action first, then start this app again."
	}
	return ""
}
