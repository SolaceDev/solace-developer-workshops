module substitution-scoring

go 1.24

// The SAM tool SDK is vendored into _sdk/ by `sam toolset init --lang go`
// and re-injected by the build pipeline if the directory is missing. Keep
// this replace line untouched: it is what makes the build work offline.
require samtoolsdk v0.0.0

replace samtoolsdk => ./_sdk/samtoolsdk
