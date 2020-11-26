
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
    return 'The tested population\'s average is different from the common population\'s average.'
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
    popInterested: number[],
    popCommon: number[],
    options?: {
      alpha?: number
    }): StatisticallySignificantDifference | null {

    if (!popInterested.length || !popCommon.length) {
      return null;
    }

    const popMerged = [] as Array<[number, boolean]>;
    popInterested.forEach((x: number) => {popMerged.push([x, true])});
    popCommon.forEach((x: number) => {popMerged.push([x, false])});

    popMerged.sort((a, b) => a[0] == b[0] ? 0 : a[0] > b[0] ? 1 : -1);
    if (this.ntile > 0) {
      // popMerged is sorted from smallest to largest. If we're taking
      // the upper ntile, we want the opposite.
      popMerged.reverse();
    }

    const p0 = popInterested.length / popMerged.length;
    const n = Math.ceil(popMerged.length * Math.abs(this.ntile));
    if (!n) {
      return null;
    }

    const popSlicedNtile = popMerged.slice(0, n + 1);
    const numObserved =
        popSlicedNtile.reduce((acc, v) => acc + (v[1] ? 1 : 0), 0);

    console.log(popSlicedNtile)

    const numExpected = Math.floor(p0 * popSlicedNtile.length);
    if (!numExpected) {
      return null;
    }

    const proportionRepresented = numObserved / numExpected;
    console.log(`${numObserved} / ${numExpected} = ${proportionRepresented}`);

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
    popInterested: number[],
    popCommon: number[],
    options?: {
      alpha?: number
    }): Array<StatisticallySignificantDifference> {

  let retval = [] as Array<StatisticallySignificantDifference>;

  let t = new MeanDifferenceTest();
  let tResult = t.test(popInterested, popCommon, options);
  if (tResult) {
    retval.push(tResult);
  }

  const ntiles = [0.5, 0.25, 0.10, 0.05, -0.5, -0.25, -0.10, -0.05];
  for (let ntile of ntiles) {
    t = new DisproportionateNtileRepresentationTest(ntile);
    tResult = t.test(popInterested, popCommon, options);
    if (tResult) {
      retval.push(tResult);
      break;
    }
  }

  return retval;
}

