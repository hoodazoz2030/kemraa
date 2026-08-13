export type Transition<S extends string>={from:S;to:S};
export type Guard<S extends string,Ctx>=(ctx:Ctx,t:Transition<S>)=>boolean|string;
export interface StateMachineConfig<S extends string,Ctx>{initial:S;transitions:ReadonlyArray<Transition<S>>;guards?:Record<string,Guard<S,Ctx>>;edgeGuards?:Record<string,string[]>;}
export class IllegalTransitionError<S extends string> extends Error{constructor(f:S,t:S){super(`Illegal state transition: ${f} -> ${t}`);this.name="IllegalTransitionError";}}
export class GuardFailedError extends Error{constructor(r:string){super(`Guard failed: ${r}`);this.name="GuardFailedError";}}
export class StateMachine<S extends string,Ctx=unknown>{private readonly allowed:Map<S,Set<S>>;
  constructor(private readonly config:StateMachineConfig<S,Ctx>){this.allowed=new Map();for(const t of config.transitions){if(!this.allowed.has(t.from))this.allowed.set(t.from,new Set());this.allowed.get(t.from)!.add(t.to);}}
  canTransition(f:S,t:S){return this.allowed.get(f)?.has(t)??false;}
  transition(current:S,next:S,ctx:Ctx):S{if(!this.canTransition(current,next))throw new IllegalTransitionError(current,next);const key=`${current}->${next}`;for(const name of this.config.edgeGuards?.[key]??[]){const g=this.config.guards?.[name];if(!g)throw new GuardFailedError(`missing guard: ${name}`);const r=g(ctx,{from:current,to:next});if(r!==true)throw new GuardFailedError(typeof r==="string"?r:name);}return next;}
  get initial(){return this.config.initial;}}