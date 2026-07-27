import axios from "axios";
import FormData from "form-data";

type RiskLevel = "low" | "medium" | "high";
type C2paStatus = "not_present" | "present" | "unavailable";
type ReviewStatus =
  | "not_configured"
  | "not_required"
  | "completed"
  | "failed";

export type ImageInput = {
  buffer: Buffer;
  filename: string;
  mimetype: string;
};

export type ProvenanceSignal = {
  status: C2paStatus;
  present: boolean;
  valid: boolean | null;
  ai_declared: boolean;
  claim_generator?: string;
  actions: string[];
  digital_source_types: string[];
};

export type ProviderSignal = {
  provider: "sightengine";
  ai_generated_or_edited_score: number;
  deepfake_score: number;
  deepfake_available?: boolean;
  suspected_generator?: string;
};

export type ReviewSignal = {
  provider: "hive";
  status: ReviewStatus;
  ai_generated_score?: number;
  deepfake_score?: number;
  suspected_generator?: string;
  agreement?: "agree" | "disagree";
};

export type DetectionResult = {
  is_fake: boolean;
  confidence_score: number;
  verdict_code:
    | "HIGH_AI_RISK"
    | "REVIEW_RECOMMENDED"
    | "LOW_AI_RISK"
    | "PROVIDER_DISAGREEMENT";
  risk_level: RiskLevel;
  signals: {
    provenance: ProvenanceSignal;
    primary: ProviderSignal | null;
    second_opinion: ReviewSignal;
  };
  detection_path: string[];
  evidence: string[];
  raw_analysis: {
    sightengine?: unknown;
    hive?: unknown;
  };
};

const HIVE_SOURCE_EXCLUSIONS = new Set([
  "ai_generated",
  "not_ai_generated",
  "deepfake",
  "none",
  "inconclusive",
  "inconclusive_video",
]);

const AI_SOURCE_PATTERN =
  /trainedalgorithmicmedia|compositewithtrainedalgorithmicmedia|chatgpt|openai|dall[\s-]?e|midjourney|stable[\s_-]?diffusion|firefly|gemini|flux|seedream|imagen|ideogram|recraft/i;

const clamp = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0;
};

const envNumber = (name: string, fallback: number) => {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? clamp(parsed) : fallback;
};

function collectNamedValues(
  value: unknown,
  names: Set<string>,
  output: unknown[] = [],
): unknown[] {
  if (Array.isArray(value)) {
    for (const item of value) collectNamedValues(item, names, output);
    return output;
  }
  if (!value || typeof value !== "object") return output;
  for (const [key, child] of Object.entries(value)) {
    if (names.has(key.toLowerCase())) output.push(child);
    collectNamedValues(child, names, output);
  }
  return output;
}

function flattenStrings(values: unknown[]) {
  const result: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "string") result.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") {
      Object.values(value).forEach(visit);
    }
  };
  values.forEach(visit);
  return [...new Set(result.filter(Boolean))];
}

function likelyNoManifest(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /no (claim|manifest)|manifest.*not found|jumbf.*not found/i.test(message);
}

export async function inspectC2pa(
  input: ImageInput,
): Promise<ProvenanceSignal> {
  const empty: ProvenanceSignal = {
    status: "not_present",
    present: false,
    valid: null,
    ai_declared: false,
    actions: [],
    digital_source_types: [],
  };

  try {
    const importEsm = new Function(
      "specifier",
      "return import(specifier)",
    ) as (
      specifier: string,
    ) => Promise<typeof import("@contentauth/c2pa-node")>;
    const { Reader } = await importEsm("@contentauth/c2pa-node");
    const reader = await Reader.fromAsset({
      buffer: input.buffer,
      mimeType: input.mimetype,
    });
    if (!reader) return empty;

    const manifest = reader.json() as unknown;
    const active = reader.getActive() as unknown;
    const combined = { manifest, active };
    const actions = flattenStrings(
      collectNamedValues(combined, new Set(["action", "actions_action"])),
    );
    const digitalSourceTypes = flattenStrings(
      collectNamedValues(
        combined,
        new Set([
          "digitalsourcetype",
          "digital_source_type",
          "actions_digital_source_type",
        ]),
      ),
    );
    const generators = flattenStrings(
      collectNamedValues(
        combined,
        new Set(["claim_generator", "claimgenerator"]),
      ),
    );
    const validationStatuses = flattenStrings(
      collectNamedValues(
        combined,
        new Set(["validation_status", "validationstatus"]),
      ),
    );
    const hasCriticalValidationError = validationStatuses.some((status) =>
      /invalid|mismatch|malformed|untrusted|expired|revoked|failure|error/i.test(
        status,
      ),
    );
    const aiDeclared = AI_SOURCE_PATTERN.test(
      [...digitalSourceTypes, ...generators].join(" "),
    );

    return {
      status: "present",
      present: true,
      valid: !hasCriticalValidationError,
      ai_declared: aiDeclared,
      claim_generator: generators[0],
      actions,
      digital_source_types: digitalSourceTypes,
    };
  } catch (error) {
    if (likelyNoManifest(error)) return empty;
    console.warn(
      "C2PA inspection unavailable:",
      error instanceof Error ? error.message : error,
    );
    return { ...empty, status: "unavailable" };
  }
}

async function submitSightengine(
  input: ImageInput,
  apiUser: string,
  apiSecret: string,
  models: string,
) {
  const data = new FormData();
  data.append("models", models);
  data.append("api_user", apiUser);
  data.append("api_secret", apiSecret);
  data.append("media", input.buffer, {
    filename: input.filename,
    contentType: input.mimetype,
  });
  return axios.post(
    "https://api.sightengine.com/1.0/check.json",
    data,
    {
      headers: data.getHeaders(),
      timeout: 20_000,
      maxBodyLength: 21 * 1024 * 1024,
    },
  );
}

async function callSightengine(input: ImageInput) {
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;
  if (!apiUser || !apiSecret) {
    throw new Error("SIGHTENGINE_NOT_CONFIGURED");
  }

  const requestedModels =
    process.env.SIGHTENGINE_MODELS?.trim() || "genai";
  let deepfakeAvailable = requestedModels
    .split(",")
    .map((model) => model.trim())
    .includes("deepfake");
  let response;
  try {
    response = await submitSightengine(
      input,
      apiUser,
      apiSecret,
      requestedModels,
    );
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (
      !deepfakeAvailable ||
      !status ||
      ![400, 402, 403, 422].includes(status)
    ) {
      throw error;
    }
    console.warn(
      `Sightengine deepfake model unavailable (${status}); retrying genai only.`,
    );
    deepfakeAvailable = false;
    response = await submitSightengine(input, apiUser, apiSecret, "genai");
  }
  const raw = response.data as {
    type?: {
      ai_generated?: number;
      deepfake?: number;
      ai_generators?: Record<string, number>;
    };
  };
  const generators = Object.entries(raw.type?.ai_generators ?? {}).sort(
    (left, right) => clamp(right[1]) - clamp(left[1]),
  );
  return {
    raw,
    signal: {
      provider: "sightengine",
      ai_generated_or_edited_score: clamp(raw.type?.ai_generated),
      deepfake_score: clamp(raw.type?.deepfake),
      deepfake_available: deepfakeAvailable,
      suspected_generator:
        generators[0] && clamp(generators[0][1]) >= 0.25
          ? generators[0][0]
          : undefined,
    } satisfies ProviderSignal,
  };
}

function parseHive(raw: unknown) {
  const payload = raw as {
    status?: Array<{
      response?: {
        output?: Array<{
          classes?: Array<{ class?: string; score?: number }>;
        }>;
      };
    }>;
  };
  const classes =
    payload.status?.[0]?.response?.output?.[0]?.classes?.map((item) => ({
      name: String(item.class ?? ""),
      score: clamp(item.score),
    })) ?? [];
  const score = (name: string) =>
    classes.find((item) => item.name === name)?.score ?? 0;
  const sources = classes
    .filter((item) => !HIVE_SOURCE_EXCLUSIONS.has(item.name))
    .sort((left, right) => right.score - left.score);
  return {
    aiGeneratedScore: score("ai_generated"),
    deepfakeScore: score("deepfake"),
    suspectedGenerator:
      sources[0] && sources[0].score >= 0.25 ? sources[0].name : undefined,
  };
}

async function callHive(input: ImageInput) {
  const apiKey = process.env.HIVE_API_KEY;
  if (!apiKey) return null;
  const data = new FormData();
  data.append("media", input.buffer, {
    filename: input.filename,
    contentType: input.mimetype,
  });
  const response = await axios.post(
    process.env.HIVE_API_URL ??
      "https://api.thehive.ai/api/v2/task/sync",
    data,
    {
      headers: {
        ...data.getHeaders(),
        Authorization: `Token ${apiKey}`,
      },
      timeout: 25_000,
      maxBodyLength: 21 * 1024 * 1024,
    },
  );
  return { raw: response.data, parsed: parseHive(response.data) };
}

export async function analyzeImage(
  input: ImageInput,
): Promise<DetectionResult> {
  const provenance = await inspectC2pa(input);
  const detectionPath = ["c2pa"];
  const evidence: string[] = [];
  const secondOpinion: ReviewSignal = {
    provider: "hive",
    status: process.env.HIVE_API_KEY ? "not_required" : "not_configured",
  };

  if (
    provenance.present &&
    provenance.valid &&
    provenance.ai_declared &&
    process.env.C2PA_SHORT_CIRCUIT === "true"
  ) {
    return {
      is_fake: true,
      confidence_score: 0.99,
      verdict_code: "HIGH_AI_RISK",
      risk_level: "high",
      signals: { provenance, primary: null, second_opinion: secondOpinion },
      detection_path: detectionPath,
      evidence: ["有效内容凭证声明该图片由生成式 AI 创建或修改"],
      raw_analysis: {},
    };
  }

  const primaryResult = await callSightengine(input);
  detectionPath.push("sightengine");
  const primary = primaryResult.signal;
  const primaryScore = Math.max(
    primary.ai_generated_or_edited_score,
    primary.deepfake_score,
  );
  const reviewLow = envNumber("HIVE_REVIEW_LOW", 0.35);
  const reviewHigh = envNumber("HIVE_REVIEW_HIGH", 0.65);
  const shouldReview =
    process.env.HIVE_ALWAYS_REVIEW === "true" ||
    (primaryScore >= reviewLow && primaryScore <= reviewHigh);
  let hiveRaw: unknown;
  let finalScore = primaryScore;
  let providerDisagreement = false;

  if (shouldReview && process.env.HIVE_API_KEY) {
    try {
      const hive = await callHive(input);
      if (hive) {
        detectionPath.push("hive");
        hiveRaw = hive.raw;
        const hiveScore = Math.max(
          hive.parsed.aiGeneratedScore,
          hive.parsed.deepfakeScore,
        );
        providerDisagreement = Math.abs(primaryScore - hiveScore) >= 0.4;
        Object.assign(secondOpinion, {
          status: "completed",
          ai_generated_score: hive.parsed.aiGeneratedScore,
          deepfake_score: hive.parsed.deepfakeScore,
          suspected_generator: hive.parsed.suspectedGenerator,
          agreement: providerDisagreement ? "disagree" : "agree",
        });
        finalScore = primaryScore * 0.55 + hiveScore * 0.45;
      }
    } catch (error) {
      console.warn(
        "Hive review failed:",
        error instanceof Error ? error.message : error,
      );
      secondOpinion.status = "failed";
    }
  }

  if (provenance.present && provenance.valid && provenance.ai_declared) {
    finalScore = Math.max(finalScore, 0.99);
    evidence.push("内容凭证声明存在生成式 AI 创建或修改");
  }
  if (primary.ai_generated_or_edited_score >= 0.5) {
    evidence.push("像素模型发现 AI 生成或 AI 编辑特征");
  }
  if (primary.deepfake_score >= 0.5) {
    evidence.push("人脸模型发现换脸或身份级修改特征");
  }
  if (secondOpinion.status === "completed") {
    evidence.push(
      secondOpinion.agreement === "agree"
        ? "第二检测供应商与主模型结论一致"
        : "两家检测供应商分数差异较大，建议人工复核",
    );
  }
  if (evidence.length === 0) evidence.push("未发现高置信度生成式 AI 特征");

  const highThreshold = envNumber("HIGH_RISK_THRESHOLD", 0.8);
  const lowThreshold = envNumber("LOW_RISK_THRESHOLD", 0.35);
  let riskLevel: RiskLevel =
    finalScore >= highThreshold
      ? "high"
      : finalScore < lowThreshold
        ? "low"
        : "medium";
  if (
    providerDisagreement &&
    !(provenance.present && provenance.valid && provenance.ai_declared)
  ) {
    riskLevel = "medium";
  }
  const verdictCode = providerDisagreement
    ? "PROVIDER_DISAGREEMENT"
    : riskLevel === "high"
      ? "HIGH_AI_RISK"
      : riskLevel === "low"
        ? "LOW_AI_RISK"
        : "REVIEW_RECOMMENDED";

  return {
    is_fake: riskLevel === "high",
    confidence_score: clamp(finalScore),
    verdict_code: verdictCode,
    risk_level: riskLevel,
    signals: { provenance, primary, second_opinion: secondOpinion },
    detection_path: detectionPath,
    evidence,
    raw_analysis: { sightengine: primaryResult.raw, hive: hiveRaw },
  };
}
