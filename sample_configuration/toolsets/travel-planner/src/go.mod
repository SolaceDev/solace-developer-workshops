module travel-planner

go 1.26

require github.com/SolaceDev/solace-agent-mesh-go/pkg/samtoolsdk v0.0.0

// TODO: drop the replace once samtoolsdk is consumable as a stable module.
replace github.com/SolaceDev/solace-agent-mesh-go/pkg/samtoolsdk => ./_sdk/samtoolsdk
