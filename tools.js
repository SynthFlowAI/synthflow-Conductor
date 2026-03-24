// Synthflow Conductor — tool definitions and system prompt
// Loaded by index.html before the main app script.

const TOOLS = [
  {
    name: "create_assistant",
    description: "Create a new Synthflow voice AI assistant. Can include actions (transfers, SMS, webhooks, etc.) inline. Returns the created assistant object with its model_id.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Display name for the assistant" },
        type: { type: "string", enum: ["inbound", "outbound", "widget"], description: "Call direction type" },
        agent: {
          type: "object",
          description: "Agent configuration",
          properties: {
            prompt: { type: "string", description: "System prompt defining assistant behavior" },
            language: { type: "string", description: "Language code: en-US, es-ES, fr, de-DE, multi (auto-detect), etc." },
            llm: { type: "string", enum: ["gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-5-chat", "synthflow"], description: "LLM to use" },
            greeting_message: { type: "string", description: "First message the assistant says" },
            greeting_message_mode: { type: "string", enum: ["agent_static", "agent_dynamic", "human"], description: "Greeting mode: agent_static (exact text), agent_dynamic (LLM generates), human (wait for caller)" },
            voice_id: { type: "string", description: "Voice ID from list-voices" },
            voice_speed: { type: "number", description: "Speaking speed 0.7-1.2, default 1.0" },
            patience_level: { type: "string", enum: ["low", "medium", "high"], description: "How long to wait before responding" },
            noise_cancellation: { type: "string", enum: ["standard", "advanced"] },
          }
        },
        actions: {
          type: "array",
          description: "Actions the assistant can perform during calls. Each action has a type, name, and a type-keyed config object.",
          items: { type: "object" }
        },
        is_recording: { type: "boolean", description: "Enable call recording" },
        phone_number: { type: "string", description: "Phone number to assign to this assistant" },
        description: { type: "string", description: "Human-readable description" },
      },
      required: ["name", "type"]
    }
  },
  {
    name: "list_assistants",
    description: "List existing Synthflow assistants. Returns an array of assistant objects with their model_id, name, type, and configuration.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Maximum number of results to return (default 20)" }
      }
    }
  },
  {
    name: "update_assistant",
    description: "Update an existing Synthflow assistant. Use this to add/remove actions, change agent settings, or modify any assistant configuration. Send only the fields you want to change.",
    input_schema: {
      type: "object",
      properties: {
        model_id: { type: "string", description: "The assistant's model_id to update" },
        agent: { type: "object", description: "Agent configuration fields to update (prompt, greeting_message, llm, language, etc.)" },
        actions: {
          type: "array",
          description: "Replace the assistant's actions array. Each action has type, name, and a type-keyed config. Pass [] to remove all actions.",
          items: { type: "object" }
        },
        name: { type: "string", description: "New display name" },
        is_recording: { type: "boolean" },
        phone_number: { type: "string" },
        description: { type: "string" },
      },
      required: ["model_id"]
    }
  },
  {
    name: "create_call",
    description: "Initiate an outbound phone call through a Synthflow assistant.",
    input_schema: {
      type: "object",
      properties: {
        model_id: { type: "string", description: "The assistant's model_id to place the call" },
        phone: { type: "string", description: "Destination phone number in E.164 format (+11234567890)" },
        name: { type: "string", description: "Name of the person being called" },
        lead_email: { type: "string", description: "Email address of the lead" },
        lead_timezone: { type: "string", description: "IANA timezone of the lead" },
        prompt: { type: "string", description: "Custom prompt override for this call" },
        greeting: { type: "string", description: "Custom greeting for this call" },
        custom_variables: {
          type: "array",
          description: "Variables accessible during the call as {{key}}",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              value: { type: "string" }
            },
            required: ["key", "value"]
          }
        }
      },
      required: ["model_id", "phone", "name"]
    }
  },
  {
    name: "create_simulation_suite",
    description: "Create a simulation test suite for an assistant. A suite groups test cases that will be run against the agent.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the test suite" },
        model_id: { type: "string", description: "The assistant's model_id to test" },
        language: { type: "string", description: "Locale for the simulated caller (default: en-US). 'multi' is not allowed." },
      },
      required: ["name", "model_id"]
    }
  },
  {
    name: "create_simulation_case",
    description: "Create a test case inside a simulation suite. Each case defines a caller persona/scenario and success criteria the agent must meet.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Test case name" },
        prompt: { type: "string", description: "The simulated caller's persona and scenario description" },
        type: { type: "string", enum: ["custom", "agent_based"], description: "Case type" },
        success_criteria: {
          type: "array",
          items: { type: "string" },
          description: "Criteria to evaluate whether the agent handled the call correctly"
        },
        call_success_type: { type: "string", enum: ["all", "any"], description: "'all' = every criterion must pass, 'any' = at least one" },
        suite_id: { type: "string", description: "Suite to add this case to" },
        base_agent_id: { type: "string", description: "The assistant's model_id this case tests" },
      },
      required: ["name", "prompt", "type", "success_criteria", "call_success_type", "suite_id", "base_agent_id"]
    }
  },
  {
    name: "list_simulation_cases",
    description: "List simulation test cases for a suite or agent.",
    input_schema: {
      type: "object",
      properties: {
        suite_id: { type: "string", description: "Filter cases by suite ID" },
        agent_id: { type: "string", description: "Filter cases by agent model_id (uses /by_agent endpoint)" },
      }
    }
  },
  {
    name: "run_simulation",
    description: "Execute all test cases in a simulation suite against the target agent. Returns a simulation_id to check results.",
    input_schema: {
      type: "object",
      properties: {
        suite_id: { type: "string", description: "The suite to execute" },
        target_agent_id: { type: "string", description: "The assistant's model_id to run the simulation against (must match the suite's model_id)" },
        max_turns: { type: "number", description: "Max conversation turns per simulation (10-50, default 20)" },
      },
      required: ["suite_id", "target_agent_id"]
    }
  },
  {
    name: "get_simulation_results",
    description: "Get the results of a simulation run, including per-case pass/fail and conversation transcripts.",
    input_schema: {
      type: "object",
      properties: {
        simulation_id: { type: "string", description: "The simulation run ID returned from run_simulation" },
      },
      required: ["simulation_id"]
    }
  }
];

const SYSTEM_PROMPT = `You are Synthflow Conductor, a voice AI assistant builder. You help users create and configure voice AI assistants, make calls, and set up actions using the Synthflow platform.

When the user asks you to create something, use the appropriate tool. Be conversational and helpful. After creating resources, summarize what was created and suggest next steps.

Key concepts:
- Assistants have a model_id used to reference them in API calls
- Calls require a model_id, phone number in E.164 format (+1...), and a name
- Custom variables are arrays of {key, value} pairs, accessible as {{key}} in prompts

Actions are capabilities attached to assistants via the actions array. Each action has a type, a name, and a type-keyed config object. Action types:
- LIVE_TRANSFER: Transfer to human. Config key: "LIVE_TRANSFER" with fields: phone (required), instructions (required), initiating_msg (required), transfer_mode (required: cold_transfer, warm_transfer, warm_transfer_with_context), message_to_transfer_target, goodbye_msg, failed_msg, timeout
- SEND_SMS: Send SMS. Config key: "SEND_SMS" with fields: content (required, supports {{var}}), instructions (required)
- CUSTOM_ACTION: Webhook/HTTP. Config key: "CUSTOM_ACTION" with fields: http_mode, url (required), name (required), description (required), speech_while_using_the_tool, variables_during_the_call (array of {name, description, example, type})
- INFORMATION_EXTRACTOR: Extract data. Config key: "INFORMATION_EXTRACTOR" with one subtype: YES_NO ({identifier, description}), SINGLE_CHOICE ({identifier, description, choices}), or OPEN_QUESTION ({identifier, description, examples})
- REAL_TIME_BOOKING: Calendar booking. Config key: "REAL_TIME_BOOKING" with fields: first_appt_date, max_time_slots, min_hours_diff, no_of_days, timezone
- CUSTOM_EVAL: Post-call eval. Config key: "CUSTOM_EVAL" with: question ({identifier, text, category: pass_fail|numeric|descriptive|likert_scale, expected_result})

Example LIVE_TRANSFER action:
{"type": "LIVE_TRANSFER", "name": "Transfer to Manager", "LIVE_TRANSFER": {"phone": "+11234567890", "instructions": "When user asks for a manager", "initiating_msg": "Let me connect you.", "transfer_mode": "warm_transfer"}}

Simulations let you test an assistant with AI-generated callers. Workflow:
1. Create a simulation suite for the agent (create_simulation_suite)
2. Add test cases — each case has a caller persona prompt and success criteria (create_simulation_case)
3. Run the suite (run_simulation) — returns a simulation_id
4. Check results (get_simulation_results)

Each test case needs: a name, a prompt describing the simulated caller's persona/scenario, success_criteria (array of strings), and call_success_type ("all" or "any").`;
