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
    name: "add_info_extractors",
    description: "Add information extractor actions to an assistant. Extracts structured data from conversations. Automatically merges with existing actions.",
    input_schema: {
      type: "object",
      properties: {
        model_id: { type: "string", description: "The assistant's model_id" },
        extractors: {
          type: "array",
          description: "Information extractors to add",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Human-readable action name" },
              subtype: { type: "string", enum: ["YES_NO", "SINGLE_CHOICE", "OPEN_QUESTION"], description: "Extraction type" },
              identifier: { type: "string", description: "Unique key for this extraction (used in results)" },
              description: { type: "string", description: "What to extract from the conversation" },
              choices: { type: "array", items: { type: "string" }, description: "Options for SINGLE_CHOICE subtype" },
              examples: { type: "array", items: { type: "string" }, description: "Example answers for OPEN_QUESTION subtype" },
            },
            required: ["name", "subtype", "identifier", "description"]
          }
        }
      },
      required: ["model_id", "extractors"]
    }
  },
  {
    name: "add_custom_evals",
    description: "Add custom post-call evaluation actions to an assistant. Evals are scored against the call transcript after the call ends. Automatically merges with existing actions.",
    input_schema: {
      type: "object",
      properties: {
        model_id: { type: "string", description: "The assistant's model_id" },
        evals: {
          type: "array",
          description: "Custom evaluations to add",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Human-readable action name" },
              identifier: { type: "string", description: "Unique key for this eval (used in results)" },
              text: { type: "string", description: "The evaluation question — analyzed against the call transcript" },
              category: { type: "string", enum: ["pass_fail", "numeric", "descriptive", "likert_scale"], description: "Scoring type: pass_fail (true/false), numeric (1-10), descriptive (free text), likert_scale" },
              expected_result: { type: "string", description: "The desired outcome (e.g. 'true' for pass_fail, '8' for numeric)" },
            },
            required: ["name", "identifier", "text", "category", "expected_result"]
          }
        }
      },
      required: ["model_id", "evals"]
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
  },

  // ── Voices ───────────────────────────────────────────────────────────
  {
    name: "list_voices",
    description: "List available voices for assistants. Returns voice IDs, names, and preview URLs. Use voice IDs when creating or updating an assistant's voice_id.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default 50)" },
        offset: { type: "number", description: "Pagination offset (default 0)" },
      }
    }
  },

  // ── Calls (expanded) ────────────────────────────────────────────────
  {
    name: "list_calls",
    description: "List calls for an assistant with optional filters. Date filters use Unix timestamps in milliseconds.",
    input_schema: {
      type: "object",
      properties: {
        model_id: { type: "string", description: "Assistant model_id to list calls for" },
        limit: { type: "number", description: "Max results (default 20)" },
        offset: { type: "number", description: "Pagination offset (default 0)" },
        from_date: { type: "number", description: "Start date as Unix timestamp in milliseconds" },
        to_date: { type: "number", description: "End date as Unix timestamp in milliseconds" },
        call_status: { type: "string", description: "Filter by status (e.g. completed, failed, no-answer)" },
        duration_min: { type: "number", description: "Minimum call duration in seconds" },
        duration_max: { type: "number", description: "Maximum call duration in seconds" },
      },
      required: ["model_id"]
    }
  },
  {
    name: "get_call_details",
    description: "Get full details for a specific call including transcript, recording URL, collected variables, and metadata.",
    input_schema: {
      type: "object",
      properties: {
        call_id: { type: "string", description: "The call ID to look up" },
      },
      required: ["call_id"]
    }
  },

  // ── Contacts ─────────────────────────────────────────────────────────
  {
    name: "create_contact",
    description: "Create a new contact for outbound calling campaigns.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Contact name" },
        phone_number: { type: "string", description: "Phone number in E.164 format (+11234567890)" },
        email: { type: "string", description: "Email address" },
        contact_metadata: { type: "object", description: "Custom metadata key-value pairs (e.g. {company: 'Acme', role: 'CFO'})" },
      },
      required: ["name", "phone_number"]
    }
  },
  {
    name: "find_contact",
    description: "Find contacts. Provide contact_id to get one by ID, or phone to search by number. Omit both to list all.",
    input_schema: {
      type: "object",
      properties: {
        contact_id: { type: "string", description: "Specific contact ID to retrieve" },
        phone: { type: "string", description: "Phone number to search for" },
      }
    }
  },
  {
    name: "update_contact",
    description: "Update an existing contact. Send only the fields you want to change.",
    input_schema: {
      type: "object",
      properties: {
        contact_id: { type: "string", description: "Contact ID to update" },
        name: { type: "string", description: "New name" },
        phone_number: { type: "string", description: "New phone number in E.164 format" },
        email: { type: "string", description: "New email" },
        contact_metadata: { type: "object", description: "Updated metadata key-value pairs" },
      },
      required: ["contact_id"]
    }
  },
  {
    name: "delete_contact",
    description: "Delete a contact by ID.",
    input_schema: {
      type: "object",
      properties: {
        contact_id: { type: "string", description: "Contact ID to delete" },
      },
      required: ["contact_id"]
    }
  },

  // ── Knowledge Bases ──────────────────────────────────────────────────
  {
    name: "create_knowledge_base",
    description: "Create a new knowledge base for RAG. After creation, add sources and attach it to an assistant.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Knowledge base name" },
        rag_use_condition: { type: "string", description: "When the agent should consult this KB (e.g. 'when asked about pricing or products')" },
      },
      required: ["name"]
    }
  },
  {
    name: "delete_knowledge_base",
    description: "Delete a knowledge base and all its sources.",
    input_schema: {
      type: "object",
      properties: {
        kb_id: { type: "string", description: "Knowledge base ID to delete" },
      },
      required: ["kb_id"]
    }
  },
  {
    name: "manage_knowledge_base_agent",
    description: "Attach or detach a knowledge base to/from an assistant. Attaching makes the KB content available to the agent during calls via RAG.",
    input_schema: {
      type: "object",
      properties: {
        kb_id: { type: "string", description: "Knowledge base ID" },
        model_id: { type: "string", description: "Assistant model_id" },
        action: { type: "string", enum: ["attach", "detach"], description: "Whether to attach or detach" },
      },
      required: ["kb_id", "model_id", "action"]
    }
  },
  {
    name: "add_knowledge_base_source",
    description: "Add a source to a knowledge base. Use type 'text' with title+content for inline text, or type 'web' with url to crawl a page.",
    input_schema: {
      type: "object",
      properties: {
        kb_id: { type: "string", description: "Knowledge base ID" },
        type: { type: "string", enum: ["text", "web"], description: "Source type" },
        title: { type: "string", description: "Title (required for text sources)" },
        content: { type: "string", description: "Text content (required for text sources)" },
        url: { type: "string", description: "URL to crawl (required for web sources)" },
      },
      required: ["kb_id", "type"]
    }
  },
  {
    name: "list_knowledge_base_sources",
    description: "List sources in a knowledge base.",
    input_schema: {
      type: "object",
      properties: {
        kb_id: { type: "string", description: "Knowledge base ID" },
        limit: { type: "number", description: "Max results (default 20)" },
        offset: { type: "number", description: "Pagination offset (default 0)" },
      },
      required: ["kb_id"]
    }
  },
  {
    name: "delete_knowledge_base_source",
    description: "Remove a specific source from a knowledge base.",
    input_schema: {
      type: "object",
      properties: {
        kb_id: { type: "string", description: "Knowledge base ID" },
        source_id: { type: "string", description: "Source ID to remove" },
      },
      required: ["kb_id", "source_id"]
    }
  },

  // ── Standalone Actions ───────────────────────────────────────────────
  {
    name: "create_action",
    description: "Create a standalone action. For 'custom': provide webhook_url, method, optional headers/payload_template. For 'calcom_booking': provide api_key, event_type_id, optional calendar_id. For 'ghl_booking': provide api_key, calendar_id, optional location_id.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Action name" },
        action_type: { type: "string", enum: ["custom", "calcom_booking", "ghl_booking"], description: "Action type" },
        webhook_url: { type: "string", description: "Webhook URL (custom)" },
        method: { type: "string", description: "HTTP method (custom, e.g. POST)" },
        headers: { type: "object", description: "Request headers (custom, optional)" },
        payload_template: { type: "string", description: "Payload template with {{variable}} placeholders (custom, optional)" },
        api_key: { type: "string", description: "API key (calcom_booking / ghl_booking)" },
        event_type_id: { type: "string", description: "Cal.com event type ID (calcom_booking)" },
        calendar_id: { type: "string", description: "Calendar ID (calcom_booking optional, ghl_booking required)" },
        location_id: { type: "string", description: "GHL location ID (ghl_booking, optional)" },
      },
      required: ["name", "action_type"]
    }
  },
  {
    name: "list_actions",
    description: "List standalone actions in your workspace.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default 20)" },
        offset: { type: "number", description: "Pagination offset (default 0)" },
      }
    }
  },
  {
    name: "delete_action",
    description: "Delete a standalone action by ID.",
    input_schema: {
      type: "object",
      properties: {
        action_id: { type: "string", description: "Action ID to delete" },
      },
      required: ["action_id"]
    }
  },
  {
    name: "manage_action_agents",
    description: "Attach or detach standalone actions to/from an assistant. Pass an array of action IDs.",
    input_schema: {
      type: "object",
      properties: {
        model_id: { type: "string", description: "Assistant model_id" },
        actions: { type: "array", items: { type: "string" }, description: "Array of action IDs" },
        action: { type: "string", enum: ["attach", "detach"], description: "Whether to attach or detach" },
      },
      required: ["model_id", "actions", "action"]
    }
  },
];

const SYSTEM_PROMPT = `You are Synthflow Conductor, a voice AI assistant builder. You help users create and configure voice AI assistants, make calls, and set up actions using the Synthflow platform.

When the user asks you to create something, use the appropriate tool. Be conversational and helpful. After creating resources, summarize what was created and suggest next steps.

When updating assistant prompts:
- For small changes (adding a line, fixing a phrase), first GET the assistant to read the current prompt, then send the full updated prompt via update_assistant.
- For large rewrites, break the work into steps: first update the core prompt structure, then add detailed sections in follow-up updates if needed.
- Never try to update multiple assistants with large prompts in a single response — do them one at a time.
- If a prompt is very long (over 2000 words), warn the user that you'll update it in stages.

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

Information extractors pull structured data from conversations. Use add_info_extractors with subtypes:
- YES_NO: binary extraction (e.g. "Is the customer interested in a demo?")
- SINGLE_CHOICE: pick one from choices (e.g. department: Sales/Support/Billing)
- OPEN_QUESTION: free-form text extraction with examples (e.g. "What is the customer's main issue?")

Custom evaluations score call quality post-call. Use add_custom_evals with categories:
- pass_fail: binary (expected_result: "true" or "false")
- numeric: 1-10 score
- descriptive: qualitative assessment
- likert_scale: agreement-based scale
Both tools automatically merge with the assistant's existing actions.

Simulations let you test an assistant with AI-generated callers. Workflow:
1. Create a simulation suite for the agent (create_simulation_suite)
2. Add test cases — each case has a caller persona prompt and success criteria (create_simulation_case)
3. Run the suite (run_simulation) — returns a simulation_id
4. Check results (get_simulation_results)

Each test case needs: a name, a prompt describing the simulated caller's persona/scenario, success_criteria (array of strings), and call_success_type ("all" or "any").

Knowledge bases let you give assistants access to custom information via RAG (retrieval-augmented generation).
Workflow:
1. Create a knowledge base (create_knowledge_base) — optionally set rag_use_condition to guide when the agent should consult it
2. Add sources — text content or web URLs (add_knowledge_base_source)
3. Attach the KB to an assistant (manage_knowledge_base_agent with action: "attach")
The agent will search the KB during calls when relevant. To inspect a KB, use list_knowledge_base_sources. To disconnect, use manage_knowledge_base_agent with action: "detach".

Standalone actions are reusable integrations that can be shared across multiple assistants. These are different from inline actions on create_assistant/update_assistant — standalone actions are managed separately.
Types:
- custom: HTTP webhook — provide webhook_url, method, optional headers and payload_template with {{variable}} placeholders
- calcom_booking: Cal.com scheduling — provide api_key, event_type_id, optional calendar_id
- ghl_booking: GoHighLevel booking — provide api_key, calendar_id, optional location_id
Workflow: create_action, then manage_action_agents (action: "attach") to connect to assistants. Use list_actions to see existing actions.

Calls can be listed and inspected after they happen:
- list_calls: Filter by assistant (model_id required), date range, status, duration. Date filters (from_date, to_date) use Unix timestamps in milliseconds.
- get_call_details: Returns full transcript, recording URL, collected variables, and call metadata for a specific call_id.

Contacts are people for outbound calling campaigns. Each has a name, phone number (E.164), optional email, and custom metadata.
- create_contact / find_contact / update_contact / delete_contact
- find_contact can look up by contact_id or search by phone number
Use contacts as targets for outbound calls via create_call.

Voices can be browsed with list_voices. Each voice has a voice_id and name. Pass the voice_id when creating or updating an assistant's agent.voice_id configuration.

Out-of-scope topics — do not fabricate answers for these. Instead, tell the user these features are managed through the Synthflow dashboard (app.synthflow.ai) or by contacting Synthflow support:
- Phone number provisioning, SIP trunking, and telephony configuration
- Batch/bulk outbound campaigns and campaign scheduling
- Billing, subscription plans, and usage limits
- Sub-account and workspace management
- Integrations setup (Zapier, HubSpot, Salesforce, etc.) beyond what standalone actions provide
- User roles, permissions, and team management
If you don't have a tool for something, say so clearly. Never guess at dashboard navigation or suggest users build custom scripts.`;
