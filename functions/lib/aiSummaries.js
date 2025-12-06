"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTestSummary = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const generative_ai_1 = require("@google/generative-ai");
// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
// Access API key from environment variables
// Ensure you have set this: firebase functions:config:set gemini.key="YOUR_API_KEY"
// limit to specific region if needed, e.g. .region("australia-southeast1")
const GENAI_API_KEY = process.env.GENAI_API_KEY || ((_a = functions.config().gemini) === null || _a === void 0 ? void 0 : _a.key);
exports.generateTestSummary = functions
    .region("australia-southeast1")
    .firestore.document("test_results/{resultId}")
    .onCreate(async (snapshot, context) => {
    const resultData = snapshot.data();
    const resultId = context.params.resultId;
    if (!resultData) {
        console.error(`No data found for resultId: ${resultId}`);
        return;
    }
    // If summary already exists (unlikely on create, but good practice), skip
    if (resultData.summary) {
        console.log(`Summary already exists for resultId: ${resultId}`);
        return;
    }
    if (!GENAI_API_KEY) {
        console.error("GENAI_API_KEY is not set. Cannot generate summary.");
        return;
    }
    try {
        const genAI = new generative_ai_1.GoogleGenerativeAI(GENAI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // Construct the prompt
        const score = resultData.score;
        const correctCount = resultData.correctCount;
        const totalQuestions = resultData.totalQuestions;
        const timeTaken = resultData.timeTaken || "unknown time";
        const level = resultData.level || 1;
        const prompt = `
                Analyze the following arithmetic test result for a student at level ${level}.
                Score: ${score}%.
                Correct: ${correctCount} out of ${totalQuestions}.
                Time taken: ${timeTaken} seconds.

                Provide a 2-sentence encouraging summary for the student.
                Focus on effort and improvement. Do not be overly critical.
                The summary should be addressed to the student using "You".
            `;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const summaryText = response.text();
        // Update the document with the summary
        await snapshot.ref.update({
            summary: summaryText,
            summaryCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Successfully generated summary for resultId: ${resultId}`);
    }
    catch (error) {
        console.error(`Error generating summary for resultId: ${resultId}`, error);
        // Optionally update the doc to indicate failure?
        // await snapshot.ref.update({ summaryError: "Failed to generate summary." });
    }
});
//# sourceMappingURL=aiSummaries.js.map