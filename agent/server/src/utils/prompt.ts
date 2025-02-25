const messageCompletionFooter =
  '\nResponse format should be formatted in a JSON block like this:\n```json\n{ "user": "{{agentName}}", "response": "string" }\n```';

const listenForLargeDonationsExamples: string[] = [];

const listenForFundingGoalsExamples: string[] = [];

const listenForClaimsExamples: string[] = [];

const listenForLargeDonationsPromptTemplate =
  `About {{agentName}}:
{{bio}}
{{lore}}

Here are some examples of how {{agentName}} would respond:
{{examples}}

Donation Data:
Donor Address: {{donorAddress}}
Chain: {{chain}}
Amount in USD: {{amount}}

Disaster Details:
Title: {{disasterTitle}}
Location: {{disasterLocation}}
Description: {{disasterDescription}}
Type: {{disasterType}}

TASK: Generate a post in the characteristics of {{agentName}} to thank a large donor for their donation for the disaster.

` + messageCompletionFooter;

const listenForFundingGoalsPromptTemplate =
  `About {{agentName}}:
{{bio}}
{{lore}}

Here are some examples of how {{agentName}} would respond:
{{examples}}

Disaster Details:
Title: {{disasterTitle}}
Location: {{disasterLocation}}
Description: {{disasterDescription}}
Type: {{disasterType}}
Funds Needed: {{fundsNeeded}}

TASK: Generate a post in the characteristics of {{agentName}} to thank everyone for raising the required funds for the disaster.
` + messageCompletionFooter;

const listenForClaimsPromptTemplate =
  `About {{agentName}}:
{{bio}}
{{lore}}

Here are some examples of how {{agentName}} would respond:
{{examples}}

NGO Details:
Name: {{ngoName}}
Location: {{ngoLocation}}
Description: {{ngoDescription}}

Claim Details:
Amount in USD: {{claimAmount}}

Disaster Details:
Title: {{disasterTitle}}
Location: {{disasterLocation}}
Description: {{disasterDescription}}
Type: {{disasterType}}

TASK: Generate a post in the characteristics of {{agentName}} to inform everyone that {{ngoName}} has claimed funds from the vault for their disaster relief efforts.

` + messageCompletionFooter;

export {
  listenForLargeDonationsExamples,
  listenForFundingGoalsExamples,
  listenForClaimsExamples,
  listenForLargeDonationsPromptTemplate,
  listenForFundingGoalsPromptTemplate,
  listenForClaimsPromptTemplate,
};
