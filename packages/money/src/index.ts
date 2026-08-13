export type CurrencyCode = string;
export interface MoneyJSON { amountMinor: number; currency: CurrencyCode; }
export class CurrencyMismatchError extends Error { constructor(a:string,b:string){super(`Currency mismatch: ${a} vs ${b}`);this.name="CurrencyMismatchError";} }
export class InvalidAmountError extends Error { constructor(r:string){super(`Invalid money amount: ${r}`);this.name="InvalidAmountError";} }
function assertInt(v:number){if(!Number.isInteger(v))throw new InvalidAmountError(`must be integer minor unit, got ${v}`);if(!Number.isSafeInteger(v))throw new InvalidAmountError(`exceeds safe integer: ${v}`);}
function assertCur(c:string){if(typeof c!=="string"||!/^[A-Z]{3}$/.test(c))throw new InvalidAmountError(`currency must be ISO-4217, got "${c}"`);}
export class Money {
  readonly amountMinor:number; readonly currency:CurrencyCode;
  private constructor(a:number,c:CurrencyCode){assertInt(a);assertCur(c);this.amountMinor=a;this.currency=c;Object.freeze(this);}
  static fromMinor(a:number,c:CurrencyCode){return new Money(a,c);}
  static fromMajor(major:number,c:CurrencyCode,minorUnit=2){if(!Number.isFinite(major))throw new InvalidAmountError(`major must be finite: ${major}`);return new Money(Math.round(major*10**minorUnit),c);}
  static zero(c:CurrencyCode){return new Money(0,c);}
  private same(o:Money){if(this.currency!==o.currency)throw new CurrencyMismatchError(this.currency,o.currency);}
  add(o:Money){this.same(o);return new Money(this.amountMinor+o.amountMinor,this.currency);}
  subtract(o:Money){this.same(o);return new Money(this.amountMinor-o.amountMinor,this.currency);}
  multiplyByInt(f:number){if(!Number.isInteger(f))throw new InvalidAmountError(`factor must be int: ${f}`);return new Money(this.amountMinor*f,this.currency);}
  multiplyByBps(bps:number){if(!Number.isInteger(bps)||bps<0)throw new InvalidAmountError(`bps must be non-negative int: ${bps}`);const raw=BigInt(this.amountMinor)*BigInt(bps);const q=raw/10000n,r=raw%10000n;const rounded=r*2n>=10000n?q+1n:q;return new Money(Number(rounded),this.currency);}
  negate(){return new Money(-this.amountMinor,this.currency);}
  isZero(){return this.amountMinor===0;} isPositive(){return this.amountMinor>0;} isNegative(){return this.amountMinor<0;}
  equals(o:Money){return this.amountMinor===o.amountMinor&&this.currency===o.currency;}
  compare(o:Money){this.same(o);return this.amountMinor<o.amountMinor?-1:this.amountMinor>o.amountMinor?1:0;}
  toJSON():MoneyJSON{return {amountMinor:this.amountMinor,currency:this.currency};}
  static fromJSON(j:MoneyJSON){return new Money(j.amountMinor,j.currency);}
  format(locale="ar-EG"){try{return new Intl.NumberFormat(locale,{style:"currency",currency:this.currency}).format(this.amountMinor/100);}catch{return `${(this.amountMinor/100).toFixed(2)} ${this.currency}`;}}
}
export function allocate(total:Money,ratios:number[]):Money[] {
  if(ratios.length===0)throw new InvalidAmountError("ratios must be non-empty");
  if(ratios.some(r=>r<0))throw new InvalidAmountError("ratios must be non-negative");
  const sum=ratios.reduce((a,b)=>a+b,0);if(sum<=0)throw new InvalidAmountError("sum of ratios must be positive");
  const t=total.amountMinor;const exact=ratios.map(r=>(t*r)/sum);const floored=exact.map(v=>Math.trunc(v));
  let remainder=t-floored.reduce((a,b)=>a+b,0);
  const order=exact.map((v,i)=>({i,frac:v-Math.trunc(v)})).sort((a,b)=>b.frac-a.frac);
  const result=[...floored];for(const {i} of order){if(remainder<=0)break;result[i]=result[i]!+1;remainder-=1;}
  return result.map(m=>Money.fromMinor(m,total.currency));
}