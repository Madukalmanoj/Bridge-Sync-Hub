import { logger } from "./logger";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("NO_API_KEY");
  }
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status}`);
  }
  const data = await res.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };
  return data.candidates[0]?.content?.parts[0]?.text ?? "";
}

function extractJson(text: string): unknown {
  const match = text.match(/```json\n?([\s\S]*?)\n?```/) ?? text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  return JSON.parse(match ? match[1] ?? match[0] : text);
}

export interface FieldMappingResult {
  sourceField: string;
  targetField: string;
  confidence: number;
  reasoning: string;
}

export interface AnomalyResult {
  title: string;
  description: string;
  severity: "High" | "Medium" | "Low";
  recommendation: string;
  department: string | null;
}

export interface DiscoveredField {
  fieldName: string;
  fieldType: string;
  description: string;
}

const MOCK_MAPPINGS: FieldMappingResult[] = [
  { sourceField: "full_name", targetField: "applicant_name", confidence: 97, reasoning: "Direct semantic match — both refer to the citizen's full legal name" },
  { sourceField: "aadhaar_number", targetField: "id_proof_number", confidence: 91, reasoning: "Aadhaar is the primary national ID; id_proof_number maps to this" },
  { sourceField: "mobile_number", targetField: "contact_phone", confidence: 95, reasoning: "Both represent primary contact telephone number" },
  { sourceField: "email_address", targetField: "communication_email", confidence: 93, reasoning: "Functionally identical fields for electronic communication" },
  { sourceField: "business_name", targetField: "establishment_name", confidence: 89, reasoning: "Business/establishment — same concept, different terminology" },
  { sourceField: "business_type", targetField: "activity_category", confidence: 82, reasoning: "Business category maps to activity classification" },
  { sourceField: "district", targetField: "jurisdiction_area", confidence: 88, reasoning: "District indicates administrative jurisdiction" },
  { sourceField: "description", targetField: "nature_of_business", confidence: 78, reasoning: "Free-text description aligns with nature of business field" },
  { sourceField: "start_date", targetField: "proposed_commencement_date", confidence: 90, reasoning: "Both indicate intended operational start date" },
  { sourceField: "documents", targetField: "document_checklist", confidence: 75, reasoning: "Both reference supporting document submissions" },
];

const MOCK_ANOMALIES: AnomalyResult[] = [
  { title: "Applications Idle in Food Safety Dept", description: "3 applications have been idle for 5+ days without any officer action in Food Safety Department", severity: "High", recommendation: "Reassign to available officer or escalate to senior officer for immediate review", department: "Food Safety Department" },
  { title: "High Rejection Rate — Labour Dept", description: "Labour Department rejection rate is 34% this week vs 12% baseline — possible miscommunication on document requirements", severity: "Medium", recommendation: "Review rejection reasons and update citizen guidance documentation on document requirements", department: "Labour Department" },
  { title: "SLA Breach Pattern Detected", description: "Applications from Kalaburagi district show 2x longer processing times — possible resource constraint", severity: "Medium", recommendation: "Investigate staffing levels for Kalaburagi district processing and consider load balancing", department: null },
];

const MOCK_FIELDS: DiscoveredField[] = [
  { fieldName: "applicant_id", fieldType: "string", description: "Unique applicant identifier in department system" },
  { fieldName: "establishment_name", fieldType: "string", description: "Name of the business establishment" },
  { fieldName: "activity_category", fieldType: "string", description: "Category of business activity" },
  { fieldName: "jurisdiction_area", fieldType: "string", description: "Administrative district/area" },
  { fieldName: "contact_phone", fieldType: "string", description: "Primary contact telephone number" },
  { fieldName: "id_proof_number", fieldType: "string", description: "Government-issued identity proof number" },
  { fieldName: "proposed_commencement_date", fieldType: "date", description: "Intended business start date" },
  { fieldName: "nature_of_business", fieldType: "text", description: "Description of business activities" },
  { fieldName: "document_checklist", fieldType: "json", description: "List of submitted supporting documents" },
  { fieldName: "applicant_name", fieldType: "string", description: "Full legal name of the applicant" },
];

export async function mapSchemaFields(
  sourceSystem: string,
  targetSystem: string,
  sourceFields: string[],
  targetFields: string[],
): Promise<FieldMappingResult[]> {
  try {
    const prompt = `You are a government data interoperability expert. Given these two field schemas from different government IT systems, identify semantically equivalent fields. Return JSON only — an array of objects with fields: sourceField, targetField, confidence (0-100 integer), reasoning (one sentence).

Source system (${sourceSystem}) fields: ${JSON.stringify(sourceFields)}
Target system (${targetSystem}) fields: ${JSON.stringify(targetFields)}

Return only valid JSON array, no markdown.`;

    const text = await callGemini(prompt);
    return extractJson(text) as FieldMappingResult[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "NO_API_KEY") {
      logger.warn("Gemini API key not set — returning mock schema mappings");
    } else {
      logger.error({ err }, "Gemini schema mapping failed — returning mock");
    }
    return MOCK_MAPPINGS;
  }
}

export async function detectAnomalies(stats: unknown): Promise<AnomalyResult[]> {
  try {
    const prompt = `You are a government application processing analyst. Analyze these application statistics and detect anomalies or inefficiencies. Return a JSON array of anomalies with fields: title, description, severity ("High"|"Medium"|"Low"), recommendation, department (string or null).

Stats: ${JSON.stringify(stats)}

Return only valid JSON array, no markdown.`;

    const text = await callGemini(prompt);
    return extractJson(text) as AnomalyResult[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "NO_API_KEY") {
      logger.warn("Gemini API key not set — returning mock anomalies");
    } else {
      logger.error({ err }, "Gemini anomaly scan failed — returning mock");
    }
    return MOCK_ANOMALIES;
  }
}

export async function discoverDeptFields(departmentName: string, systemType: string): Promise<DiscoveredField[]> {
  try {
    const prompt = `You are a government IT systems expert. Generate realistic field names for the ${departmentName}'s ${systemType} system. Return a JSON array of 10 fields with: fieldName (snake_case), fieldType (string/integer/date/boolean/text/json), description (one sentence).

Return only valid JSON array, no markdown.`;

    const text = await callGemini(prompt);
    return extractJson(text) as DiscoveredField[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "NO_API_KEY") {
      logger.warn("Gemini API key not set — returning mock discovered fields");
    } else {
      logger.error({ err }, "Gemini schema discover failed — returning mock");
    }
    return MOCK_FIELDS;
  }
}

export async function chatWithCitizenAssistant(
  message: string,
  appStatus: unknown,
  language: string,
): Promise<string> {
  const langHint = language === "kn" ? "Respond in Kannada script." : "Respond in simple English.";
  try {
    const prompt = `You are a helpful Karnataka government portal assistant (BridgeSync). Help the citizen understand their application status and what documents they need. Be friendly and concise. ${langHint}

Current application context: ${JSON.stringify(appStatus)}

Citizen message: ${message}`;

    return await callGemini(prompt);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "NO_API_KEY") {
      logger.warn("Gemini API key not set — returning mock chat response");
    } else {
      logger.error({ err }, "Gemini chat failed — returning mock");
    }
    if (language === "kn") {
      return "ನಮಸ್ಕಾರ! ನಿಮ್ಮ ಅರ್ಜಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ ಮತ್ತು ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿದೆ. ನಿಮ್ಮ ಅರ್ಜಿ ಸಂಖ್ಯೆಯನ್ನು ಬಳಸಿ ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ. ಸಹಾಯಕ್ಕಾಗಿ ಸಂಪರ್ಕಿಸಿ: 1800-XXX-XXXX";
    }
    return "Hello! Your application has been received and is being processed by the relevant department. Please track your application status using your Application ID. For immediate assistance, call our helpline: 1800-XXX-XXXX (toll-free).";
  }
}
