
// The helpful guide for initially assembling this project:
// https://codeburst.io/https-chidume-nnamdi-com-npm-module-in-typescript-12b3b22f0724

export class StatisticallySignificantDifference {
  constructor(
    public magnitude: number,
    public pValue: number,
    public fromTest: StatisticallySignificantDifferenceTest) {
  }
};

import ttest from 'ttest';

export abstract class StatisticallySignificantDifferenceTest {
  public abstract test(
    popInterested: number[],
    popCommon: number[],
    options?: {
      alpha?: number
    }): StatisticallySignificantDifference | null;

  public abstract get explanation(): string;
};

export class MeanDifferenceTest extends StatisticallySignificantDifferenceTest{
  public get explanation(): string {
    return 'The tested population\'s average is different from the common population\'s average, ' +
        'and this difference cannot be explained by mere chance.';
  }

  public test(
    popInterested: number[],
    popCommon: number[],
    options?: {
      alpha?: number
    }): StatisticallySignificantDifference | null {

    if (!popInterested.length || !popCommon.length) {
      return null;
    }

    const meanInterested = popInterested.reduce((a,b) => a + b, 0) / popInterested.length;
    const meanCommon = popCommon.reduce((a,b) => a + b, 0) / popCommon.length;
    const meanDiff = meanInterested - meanCommon;

    if (meanDiff === 0) {
      return null;
    }

    // The two means are different. But is the difference statistically significant?
    const alpha = (options && options.alpha) || 0.05;
    const pValue = ttest(popInterested, popCommon).pValue();
    if (pValue >= alpha) {
      return null;
    }

    const retval = new StatisticallySignificantDifference(meanDiff, pValue, this);
    return retval;
  }
};


export function findStatisticallySignificantDifference(
    popInterested: number[],
    popCommon: number[],
    options?: {
      alpha?: number
    }): StatisticallySignificantDifference | null{

  let retval = null as StatisticallySignificantDifference | null;

  let t = new MeanDifferenceTest();
  retval = t.test(popInterested, popCommon, options);
  if (retval) {
    return retval;
  }

  return null;
}

