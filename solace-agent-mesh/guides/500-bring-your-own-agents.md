# 500 Bring Your Own Agents
> **Under Construction**

Ready to integrate your organization's agents? Solace Agent Mesh supports any framework with a REST/HTTP interface.

### Supported Frameworks

- **AWS Bedrock Agents** (Action Groups, Knowledge Bases)
- **Azure AI Agent Service** (Copilot Studio, Azure OpenAI Assistants)
- **Google Vertex AI Agents**
- **LangChain/LangGraph agents** (via REST wrapper)
- **Semantic Kernel agents**
- **Custom REST APIs**

### Integration Steps

1. **Expose your a2a agent** via HTTP endpoint (GET/POST) Ensure your endpoints are secured
2. **Add to Solace Agent Mesh** using `sam add proxy` → A2A Proxy
3. **Test connectivity** before deploying to production

### Example: Custom LangChain Agent

If you have a LangChain agent, wrap it with FastAPI:

```python
from fastapi import FastAPI
from langchain import Agent

app = FastAPI()

@app.post("/invoke")
async def invoke_agent(query: str):
    result = my_langchain_agent.run(query)
    return {"response": result}
```

Then add to Solace Agent Mesh with endpoint: `https://your-domain.com/invoke`

### 🎯 Challenge

Before the workshop ends:
1. Connect at least **2 A2A agents** to your Solace Agent Mesh instance
2. Create a **multi-agent workflow** (e.g., "Plan a trip, then create recipes for the destination")
3. Share your coolest agent interaction in the workshop chat!

> 🔧 **Need help?** Ask in [Solace Community](https://community.solace.com/c/solace-agent-mesh/16) or during the workshop Q&A.

---

### ✅ That's It!
You’ve successfully:  
- Set up GitHub Codespaces  
- Installed and initialized Solace Agent Mesh  
- Started your own Solace Agent Mesh instance
- Explored and installed agents  

> 🧠 Next step: Try deploying additional agents and experiment with **Agent-to-Agent (A2A)** communication.

---
### [Resources Section](./999-resources.md)