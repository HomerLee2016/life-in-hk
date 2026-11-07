import { mergeTests, type CommunityQuestion } from '../bank';
import community from './community.json';
import { seedTests } from './tests';

/** The 17 quizzes shown in the app: community top-voted questions first, seed questions fill the rest. */
export const tests = mergeTests(seedTests, community.questions as CommunityQuestion[]);
