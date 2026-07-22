---
title: Talking to Agents with Voice
description: "Use speech-to-text to talk to agents and text-to-speech to hear responses in the Agent Mesh UI, and configure the underlying voice and transcription providers."
sidebar_position: 657
---

# Talking to Agents with Voice

You can talk to an agent with your voice instead of typing, and hear the agent's response read aloud instead of reading it on screen. Voice input converts your speech into a chat message; voice output speaks the agent's reply back through your speakers. This page covers using both, and points at the configuration knobs your operator sets.

Voice input and output share the same chat window described in [Chatting with Agents](./chatting.md). Voice does not change what you can ask the agent or what the agent can do; it changes how you send messages and how you consume the response.

## Talking with Your Microphone

The message box in the chat window has a **microphone** button next to the **Send message** button. Select it to start capturing your voice; select it again to stop. The Agent Mesh UI streams your speech to the transcription service, and the transcribed text appears in the message box as you talk. Review the transcription, edit it if you need to, and select **Send message** to send it to the agent.

Some hints for accurate transcription:

- Speak at a normal pace and close to the microphone. Background noise reduces accuracy.
- Pause between distinct sentences so the transcriber can segment your speech.
- If the transcription is inaccurate for a technical term or a proper name, edit the text before sending. The transcriber does not learn from your corrections.

Microphone access is a browser permission. Your browser prompts you the first time you use the microphone button. If you deny the permission, the microphone button is disabled until you grant it in your browser settings.

## Listening to Responses

When voice output is available for the current agent, each assistant message has a **Play** button. Select it to hear the message read aloud through your speakers. Select **Pause** to stop the playback; select **Play** again to resume. The Agent Mesh UI reads plain text; formatting such as code blocks and tables is skipped rather than spoken.

Voice output uses a text-to-speech provider your operator configures. The available voices depend on the provider. Some deployments expose a voice selector in the chat header where you select the voice; others use a fixed voice for the deployment.

## Configuration for Operators

Voice features have two independent provider tracks: **speech-to-text (STT)** for the microphone, and **text-to-speech (TTS)** for playback. Each track is configured separately, so the **microphone** button and the **Play** button appear independently based on which side has valid credentials.

The following example shows both tracks in the Web UI entrypoint runtime configuration under a `speech:` block:

```yaml
# Web UI Entrypoint config
speech:
  stt:
    provider: azure
    azure:
      api_key: "${AZURE_SPEECH_KEY}"
      region: "${AZURE_SPEECH_REGION}"
      language: en-US
  tts:
    provider: ${TTS_PROVIDER, gemini}
    gemini:
      api_key: "${GEMINI_API_KEY}"
      default_voice: "Kore"
      voices:
        - "Kore"
        - "Puck"
    azure:
      api_key: "${AZURE_SPEECH_KEY}"
      region: "${AZURE_SPEECH_REGION}"
      default_voice: "en-US-Andrew:DragonHDLatestNeural"
```

The supported providers on each track:

| Track | Selector key | Providers |
|---|---|---|
| Speech-to-text | `speech.stt.provider` | `openai` (Whisper-compatible endpoints), `azure` (Azure Cognitive Services) |
| Text-to-speech | `speech.tts.provider` | `gemini` (Google Gemini), `azure` (Azure Neural Voices), `polly` (AWS Polly) |

Each provider block under `speech.stt.<provider>` and `speech.tts.<provider>` carries the credentials, and (for TTS) a `default_voice` and a `voices` list. Provider selectors accept the standard `${VAR, default}` environment-variable substitution syntax.

For TTS, every provider block with valid credentials stays available for per-request selection from the Web UI voice picker. The `tts.provider` key picks the fallback only when a request does not specify a provider.

**Helm.** The chart exposes one voice-related key: `llmService.transcriptionModel` sets the transcription model name for the OpenAI STT provider. Provider selection and credentials live in the entrypoint runtime configuration, not in the Helm values.

For the Helm reference, see [Helm Values Reference](../reference/helm-values.md). To confirm which providers your deployment has configured, check with your operator or fetch `/api/v1/speech/config` from the Web UI entrypoint. The response reports per-provider availability flags.

## Related Topics

- To send text messages, attach files, and manage sessions, see [Chatting with Agents](./chatting.md).
- To organize voice-driven conversations alongside your other work, see [Managing Projects](./managing-projects.md).
