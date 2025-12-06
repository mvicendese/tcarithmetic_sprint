// Role type: 'admin' is deprecated, use 'teacher' with isAdmin flag
export type Role = 'teacher' | 'student';

export interface BaseUser {
  id: string;
  email: string;
  firstName: string;
  surname: string;
  role: Role;
}

export interface TeacherUser extends BaseUser {
  role: 'teacher';
  isAdmin: boolean; // Flag to indicate admin privileges
  classIds: string[];
}

export interface RecentTestResult {
  level: number;
  score: number; // percentage
  correctCount: number;
  timeRemaining: number;
  date: string;
}

export interface StudentUser extends BaseUser {
  role: 'student';
  yearLevel: number; // School year level (e.g., 7, 8, 9)
  locked: boolean;
  classIds: string[]; // Changed from optional single classId to array
  currentLevel: number; // Moved from StudentData for faster access
  aiApproved: boolean; // Consent flag for AI features

  // New fields for Single Source of Truth
  password?: string; // Stored for teacher reference (managed accounts only)
  consecutiveFastTrackCount: number;
  aiSummary?: string;
  recentTests?: RecentTestResult[];
}

export type User = TeacherUser | StudentUser;

export type QuestionType = 'integer' | 'fraction';

export interface RationalNumber {
  num: number;
  den: number;
}

export interface Question {
  id: string;
  questionText: string;
  type: QuestionType;
  correctAnswer: string;
  operationType: 'add' | 'sub' | 'mul' | 'div' | '+' | '-' | '*' | '/';
  operands: (number | RationalNumber)[];
  rawAnswer?: number | RationalNumber; // For internal use (uniqueness checks)
}

export interface AnsweredQuestion extends Question {
  submittedAnswer: string;
  isCorrect: boolean;
  timeTakenSeconds: number;
}

export interface TestAttempt {
  id: string;
  date: string;
  level: number;
  score: number; // percentage
  totalScore: number; // raw score (correct count)
  correctCount: number;
  totalQuestions: number;
  timeTaken: number;
  timeRemaining: number;
  answeredQuestions: AnsweredQuestion[];
  summary?: string;
}

// Full Test Result Document (for 'test_results' collection)
export interface TestResultDocument {
  id?: string;
  studentId: string;
  level: number;
  score: number; // percentage
  correctCount: number;
  totalQuestions: number;
  timeTaken: number;
  timeRemaining: number;
  questions: AnsweredQuestion[];
  date: string; // ISO string
  summary?: string;
  summaryCreatedAt?: any;
}

export interface Class {
  id: string;
  name: string;
  teacherIds: string[]; // Changed from single teacherId to array for multi-teacher support
  studentIds: string[];
  archived?: boolean;
}

export interface Prompts {
  studentAnalysis: string;
  classAnalysis: string;
  schoolAnalysis: string;
}

export interface IntegerLevelConfig {
  level: number;
  addition_threshold: number;
  subtraction_threshold: number;
  multiplication_threshold: number;
  addition_min: number;
  addition_max: number;
  difference_min: number;
  difference_max: number;
  mult_factor_min: number;
  mult_factor_max: number;
  div_factor_min: number;
  div_factor_max: number;
  div_factor_extra: number;
}

export interface FractionLevelConfig {
  level: number;
  integer_operation_threshold: number;
  addition_threshold: number;
  subtraction_threshold: number;
  multiplication_threshold: number;
  numerator_max: number;
}

export interface TestConfig {
  integerLevels: IntegerLevelConfig[];
  fractionLevels: FractionLevelConfig[];
}