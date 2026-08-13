# Safety and Alignment

Source material: dive-into-llms chapters 6 (jailbreak attacks), 10 (agent
safety), and 11 (RLHF/PPO alignment).

## Jailbreak robustness (ch6)

The tutorial teaches attack, not defense, on the premise that "to obtain better
security, we must first learn how to attack." It walks through
**EasyJailbreak**, a framework integrating 11 mainstream jailbreak methods, with
**PAIR** as the worked example — an iterative pipeline of seed initialization,
constraint addition, mutation, attack execution, and evaluation.

Practical implication for this skill: if a user is shipping anything
public-facing, recommend running an EasyJailbreak-style adversarial test pass
against the actual system prompt and guardrails *before* launch, using it as a
red-team tool rather than assuming prompted safety instructions hold. No
specific defensive technique is prescribed in the source material — the
mitigation is empirical (test, find the break, patch the specific hole,
retest), not a one-shot fix.

## Agent safety risk assessment (ch10)

Based on the **R-Judge** benchmark, which evaluates LLM agents across seven
domains (software programming, operating systems, IoT, applications, finance,
web services, healthcare) and ten risk types (privacy leakage, data loss,
computer security, financial property loss, and others). Worked examples
include an agent exposing SSH private keys and an agent disabling a
system-critical process without assessing impact.

Assessment pattern: feed the agent a multi-turn interaction record (user,
agent, environment), have it (1) produce a natural-language risk analysis, then
(2) a binary safe/unsafe label, and compare against human-annotated ground
truth. Lower temperature (near 0) improves judgment stability for this kind of
evaluation.

Practical mitigations to recommend for any agent that takes real-world actions
(file writes, credential handling, financial actions, system commands):
- Require an explicit risk-assessment step before high-impact actions, not just
  after-the-fact logging.
- Classify data sensitivity and hard-block transmission of credentials/secrets
  regardless of what the task appears to ask for.
- Run an R-Judge-style multi-domain evaluation before granting an agent
  unsupervised execution rights, not just a happy-path functional test.

## RLHF / PPO alignment training (ch11)

Three-step loop: **rollout** (model generates responses to queries), **evaluate**
(a reward signal — function, model, or human feedback — scores them),
**optimize** (PPO updates the policy using the reward plus a KL-divergence
penalty against a frozen reference model, to keep the model from drifting too
far while chasing the reward).

Tooling: HuggingFace **TRL** (`PPOTrainer`, `AutoModelForCausalLMWithValueHead`),
a frozen reference-model copy, a reward model (the tutorial's example: a BERT
sentiment classifier used to push GPT-2 toward positive movie reviews), W&B for
monitoring.

Cost: PPO requires holding the trainable policy model and a frozen reference
model simultaneously — roughly double the memory footprint of the base model
alone, before counting the reward model. The tutorial's GPT-2-scale run used
~10GB VRAM for ~35 minutes; this scales steeply with model size and should be
treated as the most expensive item in the decision framework, justified only
when behavior must be robust to adversarial or out-of-distribution use, not for
cooperative-user contexts where a good system prompt or fine-tuning already
gets the desired behavior.

## How to use this in a recommendation

Safety is not itself a "chosen approach" the way RAG or fine-tuning is — it's a
cross-cutting check. Every recommendation report should include a short safety
note: does the target use case have adversarial exposure or irreversible
actions? If yes, name the applicable practice above (jailbreak testing, agent
risk assessment, or — only if behavior robustness under adversarial pressure is
the actual bottleneck — alignment training) as a required step, separate from
whichever primary approach family won.
