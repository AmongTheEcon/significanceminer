
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
import distributions from 'distributions';
import stats from 'stats-analysis';

export abstract class StatisticallySignificantDifferenceTest {
  public abstract test(
    popTested: number[],
    popControl: number[],
    options?: {
      alpha?: number
    }): StatisticallySignificantDifference | null;

  public abstract get explanation(): string;
};

export class MeanDifferenceTest extends StatisticallySignificantDifferenceTest{
  public constructor(public isFilteringOutliers = false) {
    super();
  }

  public get explanation(): string {
    let s = 'The tested population\'s average is different from the common population\'s average';
    if (this.isFilteringOutliers) {
      s += ` after filtering outliers`;
    }
    s += '.';
    return s;
  }

  public test(
    popTested: number[],
    popControl: number[],
    options?: {
      alpha?: number
    }): StatisticallySignificantDifference | null {

    if (!popTested.length || !popControl.length) {
      return null;
    }

    if (this.isFilteringOutliers) {
      popTested = stats.filterOutliers(popTested);
      popControl = stats.filterOutliers(popControl);
    }

    let meanTested = stats.mean(popTested);
    let meanControl = stats.mean(popControl);
    const meanDiff = meanTested - meanControl;

    if (meanDiff === 0) {
      return null;
    }

    // The two means are different. But is the difference statistically significant?
    const alpha = (options && options.alpha) || 0.05;
    const pValue = ttest(popTested, popControl).pValue();
    if (pValue >= alpha) {
      return null;
    }

    const retval = new StatisticallySignificantDifference(meanDiff, pValue, this);
    return retval;
  }
};


export class DisproportionateNtileRepresentationTest extends StatisticallySignificantDifferenceTest{
  public constructor(public ntile: number) {
    super();
    if (!this.ntile) {
      throw new TypeError('ntile cannot be 0.');
    }
    if (Math.abs(this.ntile) > 1) {
      throw new TypeError('ntile cannot be greater than 100%.');
    }
  }

  public get explanation(): string {
    let s = 'The tested population is disproportionately represented in the ';
    s += this.ntile > 0 ? 'upper' : 'lower';
    s += ' ' + Math.ceil(this.ntile * 100) + '%';
    s += ' of the combined population.';
    return s;
  }

  public test(
    popTested: number[],
    popControl: number[],
    options?: {
      alpha?: number
    }): StatisticallySignificantDifference | null {

    if (!popTested.length || !popControl.length) {
      return null;
    }

    const popMerged = [] as Array<[number, boolean]>;
    popTested.forEach((x: number) => {popMerged.push([x, true])});
    popControl.forEach((x: number) => {popMerged.push([x, false])});

    popMerged.sort((a, b) => a[0] == b[0] ? 0 : a[0] > b[0] ? 1 : -1);
    if (this.ntile > 0) {
      // popMerged is sorted from smallest to largest. If we're taking
      // the upper ntile, we want the opposite.
      popMerged.reverse();
    }

    const p0 = popTested.length / popMerged.length;
    const n = Math.ceil(popMerged.length * Math.abs(this.ntile));
    if (!n) {
      return null;
    }

    const popSlicedNtile = popMerged.slice(0, n + 1);
    const numObserved =
        popSlicedNtile.reduce((acc, v) => acc + (v[1] ? 1 : 0), 0);

    const numExpected = Math.floor(p0 * popSlicedNtile.length);
    if (!numExpected) {
      return null;
    }

    const proportionRepresented = numObserved / numExpected;

    if (proportionRepresented === 1) {
      return null;
    }

    // The representation is disproportionate.
    // But is the difference statistically significant?
    // TODO: Add binomial test here.
    const binomDist =  distributions.Binomial(p0, popSlicedNtile.length);
    let pValue = binomDist.cdf(numObserved);
    // Two-tailed.
    if (pValue > .5) {
      pValue = 1 - pValue;
    }
    pValue *= 2;
    const alpha = (options && options.alpha) || 0.05;
    if (pValue >= alpha) {
      return null;
    }

    const retval = new StatisticallySignificantDifference(proportionRepresented, pValue, this);
    return retval;
  }
};



export function findStatisticallySignificantDifference(
    popTested: number[],
    popControl: number[],
    options?: {
      alpha?: number
    }): Array<StatisticallySignificantDifference> {

  let retval = [] as Array<StatisticallySignificantDifference>;

  let t = null as StatisticallySignificantDifferenceTest | null;
  let tResult = null as StatisticallySignificantDifference | null;

  t = new MeanDifferenceTest();
  tResult = t.test(popTested, popControl, options);
  if (tResult) {
    retval.push(tResult);
  }

  const ntiles = [0.5, 0.25, 0.10, 0.05, -0.5, -0.25, -0.10, -0.05];
  for (let ntile of ntiles) {
    t = new DisproportionateNtileRepresentationTest(ntile);
    tResult = t.test(popTested, popControl, options);
    if (tResult) {
      retval.push(tResult);
      break;
    }
  }

  return retval;
}

