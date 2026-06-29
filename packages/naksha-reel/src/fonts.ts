import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';

export const INTER = loadInter('normal', {
  weights: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
}).fontFamily;
export const JBMONO = loadMono('normal', {
  weights: ['500', '700'],
  subsets: ['latin'],
}).fontFamily;
export const TIMES = "'Times New Roman', Times, serif";
